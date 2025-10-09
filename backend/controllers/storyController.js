// const Story = require("../models/Story");
// const User = require("../models/user");
// const { Readable } = require("stream");
// const cloudinary = require("../configs/cloudinary");


// async function uploadBufferToCloudinary(buffer, options = {}) {
//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(options, (err, result) => {
//       if (err) return reject(err);
//       resolve(result);
//     });
//     Readable.from(buffer).pipe(uploadStream);
//   });
// }

// //create story
// const createStory = async (req, res) => {
//   try {
//     const { title, content = "", tags = "", date, mediaType, userId } = req.body;
//     if (!title || !date || !userId)
//       return res.status(400).json({ success: false, error: "Missing required fields" });

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ success: false, error: "User not found" });

//     let mediaUrl = "", publicId = "", cloudinaryResponse = null;
//     if (req.file && mediaType !== "text") {
//       const uploadRes = await uploadBufferToCloudinary(req.file.buffer, {
//         folder: "stories",
//         resource_type: "auto"
//       });
//       mediaUrl = uploadRes.secure_url;
//       publicId = uploadRes.public_id;
//       cloudinaryResponse = uploadRes;
//     }

//     const story = new Story({
//       userId: user._id,
//       title,
//       content: mediaType === "text" ? content : "",
//       tags: tags ? tags.split(",").map(t => t.trim()) : [],
//       date,
//       mediaType,
//       mediaUrl,
//       publicId,
//       cloudinaryResponse
//     });

//     const saved = await story.save();
//     res.status(201).json({ success: true, story: saved });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// //get all stories
// const getAllStories = async (req, res) => {
//   try {
//     const stories = await Story.find().populate("userId", "name").sort({ createdAt: -1 });
//     res.json({ success: true, stories });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// //get user's own stories
// const getMyStories = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const stories = await Story.find({ userId }).populate("userId", "name").sort({ createdAt: -1 });
//     res.json({ success: true, stories });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// //get all other users' stories excluding the given user
// const getOthersStories = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const stories = await Story.find({ userId: { $ne: userId } }).populate("userId", "name").sort({ createdAt: -1 });
//     res.json({ success: true, stories });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// //get story by id
// const getStoryById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const story = await Story.findById(id).populate("userId", "name");
//     if (!story) return res.status(404).json({ success: false, message: "Story not found" });
//     res.json({ success: true, story });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// //update story
// const updateStory = async (req, res) => {
//   try {
//     const { id } = req.params;
//     //console.log(req.body);
//     const { title, content = "", tags = "", mediaType, date } = req.body;

//     const story = await Story.findById(id);
//     if (!story) return res.status(404).json({ success: false, message: "Story not found" });

//     story.title = title || story.title;
//     story.content = mediaType === "text" ? content : story.content;
//     story.tags = tags ? tags.split(",").map(t => t.trim()) : story.tags;
//     story.date = date || story.date;
//     story.mediaType = mediaType || story.mediaType;

//     if (req.file && mediaType !== "text") {
//       const uploadRes = await uploadBufferToCloudinary(req.file.buffer, {
//         folder: "stories",
//         resource_type: "auto",
//       });
//       story.mediaUrl = uploadRes.secure_url;
//       story.publicId = uploadRes.public_id;
//       story.cloudinaryResponse = uploadRes;
//     }

//     await story.save();
//     res.json({ success: true, story });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


// //delete story
// const deleteStory = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const story = await Story.findByIdAndDelete(id);
//     if (!story) return res.status(404).json({ success: false, message: "Story not found" });
//     res.json({ success: true, message: "Story deleted successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// module.exports = {
//   createStory,
//   getAllStories,
//   getMyStories,
//   getOthersStories,
//   getStoryById,
//   updateStory,
//   deleteStory
// };

// src/controllers/storyController.js
const fs = require("fs");
const path = require("path");
const os = require("os");
const { Readable } = require("stream");
const { v4: uuidv4 } = require("uuid");

const Story = require("../models/Story");
const User = require("../models/user");
const cloudinary = require("../configs/cloudinary");

const { transcribeIfNeeded } = require("../services/transcribe");
const { generateSummaryAndTags, createEmbedding } = require("../services/ai");
const vectorClient = require("../services/vectorClientLocal");

/**
 * Helper to upload buffer to cloudinary using stream
 * (keeps your existing behavior)
 */
async function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(uploadStream);
  });
}

/**
 * Write multer memory buffer to temp file and return { path, cleanupFn }
 */
async function writeBufferToTempFile(fileBuffer, originalName = null) {
  if (!fileBuffer) return { path: null, cleanupFn: async () => {} };
  const ext = originalName ? path.extname(originalName) : "";
  const tempName = `ft-${uuidv4()}${ext || ".bin"}`;
  const tempPath = path.join(os.tmpdir(), tempName);
  await fs.promises.writeFile(tempPath, fileBuffer);
  const cleanupFn = async () => {
    try {
      await fs.promises.unlink(tempPath);
    } catch (e) {
      // ignore
    }
  };
  return { path: tempPath, cleanupFn };
}

/**
 * Try to upsert vector if vector client exposes an upsert function.
 * Gracefully logs and continues on failure.
 */
async function safeUpsertVector(indexName, id, vector, metadata = {}) {
  try {
    if (!process.env.PINECONE_INDEX_NAME) return;
    if (vectorClient && typeof vectorClient.upsertVector === "function") {
      await vectorClient.upsertVector(indexName, id, vector, metadata);
      console.log(`Vector upserted: ${id}`);
    } else if (vectorClient && typeof vectorClient.upsert === "function") {
      // older naming fallback
      await vectorClient.upsert(indexName, id, vector, metadata);
      console.log(`Vector upserted (fallback): ${id}`);
    } else {
      console.log("No upsertVector/upsert function found on vector client; skipping upsert.");
    }
  } catch (err) {
    console.warn("Vector upsert failed:", err.message || err);
  }
}

/**
 * Try to delete vector if vector client exposes a delete function.
 */
async function safeDeleteVector(indexName, id) {
  try {
    if (!process.env.PINECONE_INDEX_NAME) return;
    if (vectorClient && typeof vectorClient.deleteVector === "function") {
      await vectorClient.deleteVector(indexName, id);
      console.log(`Vector deleted: ${id}`);
    } else if (vectorClient && typeof vectorClient.delete === "function") {
      await vectorClient.delete(indexName, id);
      console.log(`Vector deleted (fallback): ${id}`);
    } else {
      console.log("No deleteVector/delete function found on vector client; skipping deletion.");
    }
  } catch (err) {
    console.warn("Vector deletion failed:", err.message || err);
  }
}

/* ===========================
   Existing controller logic (kept intact)
   =========================== */

//create story
const createStory = async (req, res) => {
  try {
    const { title, content = "", tags = "", date, mediaType, userId } = req.body;
    if (!title || !date || !userId)
      return res.status(400).json({ success: false, error: "Missing required fields" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    let mediaUrl = "", publicId = "", cloudinaryResponse = null;
    if (req.file && mediaType !== "text") {
      const uploadRes = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "stories",
        resource_type: "auto"
      });
      mediaUrl = uploadRes.secure_url;
      publicId = uploadRes.public_id;
      cloudinaryResponse = uploadRes;
    }

    const story = new Story({
      userId: user._id,
      title,
      content: mediaType === "text" ? content : "",
      tags: tags ? tags.split(",").map(t => t.trim()) : [],
      date,
      mediaType,
      mediaUrl,
      publicId,
      cloudinaryResponse
    });

    const saved = await story.save();

    // ---------------------------
    // NEW: transcription, summary, embedding, upsert to Pinecone
    // ---------------------------
    (async () => {
      try {
        let temp = { path: null, cleanupFn: async () => {} };

        // If text story, use content; otherwise if file exists, write temp file for STT
        if (mediaType === "text") {
          // use provided content as transcript
          const transcript = content || "";
          const { summary, tags: autoTags } = await generateSummaryAndTags(transcript);
          const seedText = (summary || transcript || "").slice(0, 8000);
          const embedding = await createEmbedding(seedText);
          const vectorId = `story-${saved._id.toString()}`;

          // upsert vector if created
          if (embedding) {
            await safeUpsertVector(process.env.PINECONE_INDEX_NAME, vectorId, embedding, {
              storyId: saved._id.toString(),
              userId: user._id.toString(),
              familyId: saved.familyId || null,
              title: saved.title || "",
              tags: autoTags
            });
          }

          // update story doc
          saved.transcript = transcript;
          saved.summary = summary;
          saved.tags = Array.isArray(saved.tags) && saved.tags.length ? saved.tags : autoTags;
          saved.embeddingId = embedding ? vectorId : saved.embeddingId;
          await saved.save();
        } else {
          // non-text: use uploaded file buffer for STT if exists
          if (req.file && req.file.buffer) {
            temp = await writeBufferToTempFile(req.file.buffer, req.file.originalname);
          }

          const transcript = await transcribeIfNeeded({ file: temp.path ? { path: temp.path } : null, text: content });
          const { summary, tags: autoTags } = await generateSummaryAndTags(transcript);
          const seedText = (summary || transcript || "").slice(0, 8000);
          const embedding = await createEmbedding(seedText);
          const vectorId = `story-${saved._id.toString()}`;

          if (embedding) {
            await safeUpsertVector(process.env.PINECONE_INDEX_NAME, vectorId, embedding, {
              storyId: saved._id.toString(),
              userId: user._id.toString(),
              familyId: saved.familyId || null,
              title: saved.title || "",
              tags: autoTags
            });
          }

          saved.transcript = transcript;
          saved.summary = summary;
          saved.tags = Array.isArray(saved.tags) && saved.tags.length ? saved.tags : autoTags;
          saved.embeddingId = embedding ? vectorId : saved.embeddingId;
          await saved.save();

          await temp.cleanupFn();
        }
      } catch (innerErr) {
        console.warn("Post-save processing failed (createStory):", innerErr.message || innerErr);
      }
    })();

    // end new processing

    res.status(201).json({ success: true, story: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//get all stories
const getAllStories = async (req, res) => {
  try {
    const stories = await Story.find().populate("userId", "name").sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//get user's own stories
const getMyStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const stories = await Story.find({ userId }).populate("userId", "name").sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//get all other users' stories excluding the given user
const getOthersStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const stories = await Story.find({ userId: { $ne: userId } }).populate("userId", "name").sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//get story by id
const getStoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await Story.findById(id).populate("userId", "name");
    if (!story) return res.status(404).json({ success: false, message: "Story not found" });
    res.json({ success: true, story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//update story
const updateStory = async (req, res) => {
  try {
    const { id } = req.params;
    //console.log(req.body);
    const { title, content = "", tags = "", mediaType, date } = req.body;

    const story = await Story.findById(id);
    if (!story) return res.status(404).json({ success: false, message: "Story not found" });

    story.title = title || story.title;
    story.content = mediaType === "text" ? content : story.content;
    story.tags = tags ? tags.split(",").map(t => t.trim()) : story.tags;
    story.date = date || story.date;
    story.mediaType = mediaType || story.mediaType;

    if (req.file && mediaType !== "text") {
      const uploadRes = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "stories",
        resource_type: "auto",
      });
      story.mediaUrl = uploadRes.secure_url;
      story.publicId = uploadRes.public_id;
      story.cloudinaryResponse = uploadRes;
    }

    // If new content or file provided, re-run transcription+embedding pipeline
    let reprocessed = false;
    if ((mediaType === "text" && content && content.trim().length > 0) || req.file) {
      reprocessed = true;
      try {
        let temp = { path: null, cleanupFn: async () => {} };

        if (mediaType === "text") {
          const transcript = content || "";
          const { summary, tags: autoTags } = await generateSummaryAndTags(transcript);
          const seedText = (summary || transcript || "").slice(0, 8000);
          const embedding = await createEmbedding(seedText);
          const vectorId = `story-${story._id.toString()}`;

          if (embedding) {
            await safeUpsertVector(process.env.PINECONE_INDEX_NAME, vectorId, embedding, {
              storyId: story._id.toString(),
              userId: story.userId.toString(),
              familyId: story.familyId || null,
              title: title || story.title,
              tags: autoTags
            });
          }

          story.transcript = transcript;
          story.summary = summary;
          story.tags = Array.isArray(story.tags) && story.tags.length ? story.tags : autoTags;
          story.embeddingId = embedding ? vectorId : story.embeddingId;
        } else {
          // file case
          if (req.file && req.file.buffer) {
            temp = await writeBufferToTempFile(req.file.buffer, req.file.originalname);
          }

          const transcript = await transcribeIfNeeded({ file: temp.path ? { path: temp.path } : null, text: content });
          const { summary, tags: autoTags } = await generateSummaryAndTags(transcript);
          const seedText = (summary || transcript || "").slice(0, 8000);
          const embedding = await createEmbedding(seedText);
          const vectorId = `story-${story._id.toString()}`;

          if (embedding) {
            await safeUpsertVector(process.env.PINECONE_INDEX_NAME, vectorId, embedding, {
              storyId: story._id.toString(),
              userId: story.userId.toString(),
              familyId: story.familyId || null,
              title: title || story.title,
              tags: autoTags
            });
          }

          story.transcript = transcript;
          story.summary = summary;
          story.tags = Array.isArray(story.tags) && story.tags.length ? story.tags : autoTags;
          story.embeddingId = embedding ? vectorId : story.embeddingId;

          await temp.cleanupFn();
        }
      } catch (procErr) {
        console.warn("Post-update processing failed (updateStory):", procErr.message || procErr);
      }
    }

    await story.save();
    res.json({ success: true, story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


//delete story
const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await Story.findByIdAndDelete(id);
    if (!story) return res.status(404).json({ success: false, message: "Story not found" });

    // attempt to delete vector from vector DB if embeddingId present
    try {
      if (story.embeddingId && process.env.PINECONE_INDEX_NAME) {
        await safeDeleteVector(process.env.PINECONE_INDEX_NAME, story.embeddingId);
      }
    } catch (vecErr) {
      console.warn("Failed to delete vector during story deletion:", vecErr.message || vecErr);
    }

    res.json({ success: true, message: "Story deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createStory,
  getAllStories,
  getMyStories,
  getOthersStories,
  getStoryById,
  updateStory,
  deleteStory
};


