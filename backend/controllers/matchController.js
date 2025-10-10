
const Story = require("../models/Story");
const User = require("../models/User");
const { createEmbedding } = require("../services/ai");
const vectorClient = require("../services/vectorClientLocal"); 

//it finds the cosine similarity between two vectors 
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}


function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// pick top n matches from all the vectors by score 
function topN(arr, n) {
  return arr.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, n);
}


async function getCrossGenerationalMatches(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ ok: false, message: "Missing userId" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });
    const userBirth = user.birthYear || null;

    const userStories = await Story.find({ userId }).lean();
    if (!userStories || userStories.length === 0) {
      return res.json({ ok: true, matches: [] });
    }

    // Ensuring embeddings exist
    const storyEmbeddings = [];
    for (const s of userStories) {
      let emb = s.embedding;
      if (!emb || !Array.isArray(emb) || emb.length === 0) {
        const textForEmbedding =
          (s.summary && s.summary.trim()) ||
          (s.transcript && s.transcript.trim()) ||
          (s.content && s.content.trim()) ||
          "";
        if (!textForEmbedding) continue;
        emb = await createEmbedding(textForEmbedding);
        if (emb && Array.isArray(emb)) {
          await Story.findByIdAndUpdate(s._id, { $set: { embedding: emb } });
        }
      }
      if (emb && Array.isArray(emb)) storyEmbeddings.push({ story: s, emb });
    }

    if (storyEmbeddings.length === 0) {
      return res.json({ ok: true, matches: [] });
    }

    // Creating centroid of user's story embeddings
    const dim = storyEmbeddings[0].emb.length;
    const centroid = new Array(dim).fill(0);
    for (const it of storyEmbeddings) {
      for (let i = 0; i < dim; i++) centroid[i] += it.emb[i];
    }
    for (let i = 0; i < dim; i++) centroid[i] /= storyEmbeddings.length;

    //Query local vector DB
    const matchesFromLocal = await vectorClient.query("local-index", centroid, 150);

    //Filter candidates (remove same user, same generation, and low scores)
    const MIN_VECTOR_SCORE = parseFloat(process.env.MATCH_MIN_SCORE || "0.12");
    const MIN_FINAL_SCORE = parseFloat(process.env.MIN_FINAL_SCORE || "0.4"); 

    const candidatesRaw = [];
    const matchedUserIdSet = new Set();
    const matchedStoryIdSet = new Set();

    for (const m of matchesFromLocal) {
      const meta = m.metadata || {};
      const matchedStoryId = meta.storyId || m.id || null;
      const matchedUserId = meta.userId || meta.userid || meta.user || null;
      const score = Number(m.score || 0);
      if (!matchedStoryId || !matchedUserId) continue;
      if (String(matchedUserId) === String(userId)) continue;
      if (score < MIN_VECTOR_SCORE) continue;

      candidatesRaw.push({ matchedStoryId, matchedUserId, score });
      matchedUserIdSet.add(String(matchedUserId));
      matchedStoryIdSet.add(String(matchedStoryId));
    }

    if (candidatesRaw.length === 0) {
      return res.json({ ok: true, matches: [] });
    }

    //Batch fetch matched users & stories
    const matchedUsers = await User.find({ _id: { $in: [...matchedUserIdSet] } }).lean();
    const usersById = Object.fromEntries(matchedUsers.map(u => [String(u._id), u]));
    const matchedStories = await Story.find({ _id: { $in: [...matchedStoryIdSet] } }).lean();
    const storiesById = Object.fromEntries(matchedStories.map(s => [String(s._id), s]));

    //Building matches
    const results = [];
    for (const c of candidatesRaw) {
      const matchedUser = usersById[c.matchedUserId];
      const matchedStory = storiesById[c.matchedStoryId];
      if (!matchedUser || !matchedStory) continue;

      //skipping same generation
      const matchedBirth = matchedUser.birthYear || null;
      if (userBirth && matchedBirth && Math.abs(userBirth - matchedBirth) < 18) continue;

      //computing similarity
      const matchedEmb = matchedStory.embedding;
      if (!Array.isArray(matchedEmb)) continue;

      let best = { story: null, sim: -1 };
      for (const us of storyEmbeddings) {
        const sim = cosine(us.emb, matchedEmb);
        if (sim > best.sim) best = { story: us.story, sim };
      }

      // final score = weighted average of vector score & text similarity
      const finalScore = Math.max(c.score, best.sim);

      if (finalScore < MIN_FINAL_SCORE) continue; // filtering weak matches here!

      // Explanation builder
      const leftTags = (best.story && best.story.tags) || [];
      const rightTags = matchedStory.tags || [];
      const tagOverlap = leftTags.filter(t => rightTags.includes(t));
      let explanation = "";
      if (tagOverlap.length > 0) {
        explanation = `Both mention: ${tagOverlap.join(", ")}`;
      } else {
        const leftTokens = new Set(
          tokenize((best.story && (best.story.summary || best.story.transcript || "")) || "")
        );
        const rightTokens = tokenize(
          matchedStory.summary || matchedStory.transcript || matchedStory.content || ""
        );
        const intersect = [...new Set(rightTokens.filter(t => leftTokens.has(t)))].slice(0, 6);
        explanation = intersect.length > 0
          ? `Shared words: ${intersect.join(", ")}`
          : `Similar themes detected (score ${finalScore.toFixed(2)})`;
      }

      results.push({
        score: finalScore,
        left: {
          _id: best.story ? best.story._id : null,
          userId,
          userName: user.name || null,
          birthYear: userBirth,
          title: best.story ? best.story.title : "",
          summary: best.story ? best.story.summary : "",
          mediaUrl: best.story ? best.story.mediaUrl : null,
          tags: best.story ? best.story.tags : [],
        },
        right: {
          _id: matchedStory._id,
          userId: matchedUser._id,
          userName: matchedUser.name,
          birthYear: matchedUser.birthYear,
          title: matchedStory.title,
          summary: matchedStory.summary,
          mediaUrl: matchedStory.mediaUrl,
          tags: matchedStory.tags || [],
        },
        explanation,
        id: `match-${matchedStory._id}`,
      });
    }


    const deduped = [];
    const seen = new Set();
    for (const r of topN(results, 100)) {
      if (seen.has(String(r.right._id))) continue;
      seen.add(String(r.right._id));
      deduped.push(r);
      if (deduped.length >= 20) break;
    }

    console.log(`✅ Found ${deduped.length} strong cross-generational matches for user ${userId}`);
    return res.json({ ok: true, matches: deduped });
  } catch (err) {
    console.error("getCrossGenerationalMatches error:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
}

module.exports = { getCrossGenerationalMatches };
