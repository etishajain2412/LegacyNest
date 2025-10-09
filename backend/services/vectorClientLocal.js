
const Story = require('../models/Story');

/**
 * Local vector client that stores vectors on Story documents (embedding field)
 * and performs brute-force cosine search over stored embeddings.
 */

/** cosine similarity */
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

async function init() {
  // no-op for local client
  return;
}

/**
 * Upsert: store vector into Story document with id = storyId (or given id).
 * metadata is stored in story.vectorMetadata
 */
async function upsertVector(indexName, id, vector, metadata = {}) {
  if (!id || !vector) throw new Error('upsertVector requires id and vector');
  // Expect id like "story-<storyId>" or actual storyId
  let storyId = id;
  if (String(id).startsWith('story-')) storyId = String(id).replace(/^story-/, '');

  await Story.findByIdAndUpdate(storyId, {
    $set: {
      embedding: vector,
      vectorMetadata: metadata
    }
  }, { upsert: false }).catch(err => {
    // If story not found, ignore
    console.warn('local upsertVector: story not found', storyId);
  });
}

/**
 * Query: brute-force over all stories in same family (optionally provide metadata filter).
 * Returns array of { id: storyId, score, metadata }
 */
async function query(indexName, vector, topK = 10, opts = {}) {
  if (!vector) return [];
  // Optionally filter by familyId in opts
  const filter = {};
  if (opts.familyId) filter.familyId = opts.familyId;

  // Fetch all story docs that have embedding and not the same story id if provided
  const docs = await Story.find({ embedding: { $exists: true }, ...filter }).lean();
  const matches = [];
  for (const d of docs) {
    // skip if embedding dims mismatch
    if (!Array.isArray(d.embedding) || d.embedding.length !== vector.length) continue;
    const score = cosine(vector, d.embedding);
    matches.push({
      id: String(d._id),
      score,
      metadata: {
        storyId: String(d._id),
        userId: d.userId,
        familyId: d.familyId,
        title: d.title,
        tags: d.tags || []
      },
      values: d.embedding // include values so callers can reuse without fetching
    });
  }
  matches.sort((a,b)=>b.score - a.score);
  return matches.slice(0, topK);
}

/**
 * Fetch vector by storyId
 */
async function fetchVector(indexName, id) {
  let storyId = id;
  if (String(id).startsWith('story-')) storyId = String(id).replace(/^story-/, '');
  const doc = await Story.findById(storyId).lean();
  if (!doc || !doc.embedding) return null;
  return { id: String(doc._id), values: doc.embedding, metadata: doc.vectorMetadata || {} };
}

/**
 * Delete vector from story doc
 */
async function deleteVector(indexName, id) {
  let storyId = id;
  if (String(id).startsWith('story-')) storyId = String(id).replace(/^story-/, '');
  await Story.findByIdAndUpdate(storyId, { $unset: { embedding: "", vectorMetadata: "" } });
}

module.exports = { init, upsertVector, query, fetchVector, deleteVector };
