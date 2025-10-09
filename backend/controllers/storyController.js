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
const User = require("../models/User");
const FamilyCircle = require("../models/familyCircle");

const cloudinary = require("../configs/cloudinary");
const mongoose = require("mongoose");
require("dotenv").config();

// -------------------------
// Helper: Upload Buffer to Cloudinary
// -------------------------
async function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

// -------------------------
// Create Story
// -------------------------
const createStory = async (req, res) => {
  try {
    const {
      title,
      content = "",
      tags = "",
      date,
      mediaType,
      visibility = "private",
      userId,
    } = req.body;

    if (!title || !date || !userId)
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    let mediaUrl = "",
      publicId = "",
      cloudinaryResponse = null;

    if (req.file && mediaType !== "text") {
      const uploadRes = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "stories",
        resource_type: "auto",
      });
      mediaUrl = uploadRes.secure_url;
      publicId = uploadRes.public_id;
      cloudinaryResponse = uploadRes;
    }

    const story = new Story({
      userId: user._id,
      title,
      content: mediaType === "text" ? content : "",
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      date,
      mediaType,
      mediaUrl,
      publicId,
      cloudinaryResponse,
      visibility,
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
          const { summary, tags: autoTags } = await generateSummaryAndTags(
            transcript
          );
          const seedText = (summary || transcript || "").slice(0, 8000);
          const embedding = await createEmbedding(seedText);
          const vectorId = `story-${saved._id.toString()}`;

          // upsert vector if created
          if (embedding) {
            await safeUpsertVector(
              process.env.PINECONE_INDEX_NAME,
              vectorId,
              embedding,
              {
                storyId: saved._id.toString(),
                userId: user._id.toString(),
                familyId: saved.familyId || null,
                title: saved.title || "",
                tags: autoTags,
              }
            );
          }

          // update story doc
          saved.transcript = transcript;
          saved.summary = summary;
          saved.tags =
            Array.isArray(saved.tags) && saved.tags.length
              ? saved.tags
              : autoTags;
          saved.embeddingId = embedding ? vectorId : saved.embeddingId;
          await saved.save();
        } else {
          // non-text: use uploaded file buffer for STT if exists
          if (req.file && req.file.buffer) {
            temp = await writeBufferToTempFile(
              req.file.buffer,
              req.file.originalname
            );
          }

          const transcript = await transcribeIfNeeded({
            file: temp.path ? { path: temp.path } : null,
            text: content,
          });
          const { summary, tags: autoTags } = await generateSummaryAndTags(
            transcript
          );
          const seedText = (summary || transcript || "").slice(0, 8000);
          const embedding = await createEmbedding(seedText);
          const vectorId = `story-${saved._id.toString()}`;

          if (embedding) {
            await safeUpsertVector(
              process.env.PINECONE_INDEX_NAME,
              vectorId,
              embedding,
              {
                storyId: saved._id.toString(),
                userId: user._id.toString(),
                familyId: saved.familyId || null,
                title: saved.title || "",
                tags: autoTags,
              }
            );
          }

          saved.transcript = transcript;
          saved.summary = summary;
          saved.tags =
            Array.isArray(saved.tags) && saved.tags.length
              ? saved.tags
              : autoTags;
          saved.embeddingId = embedding ? vectorId : saved.embeddingId;
          await saved.save();

          await temp.cleanupFn();
        }
      } catch (innerErr) {
        console.warn(
          "Post-save processing failed (createStory):",
          innerErr.message || innerErr
        );
      }
    })();

    // end new processing

    res.status(201).json({ success: true, story: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// -------------------------
// Get All Stories
// -------------------------
const getAllStories = async (req, res) => {
  try {
    const stories = await Story.find()
      .populate("userId", "name")
      .sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// -------------------------
// Get My Stories
// -------------------------
const getMyStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const stories = await Story.find({ userId })
      .populate("userId", "name")
      .sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// -------------------------
// Get Other Users' Stories
// -------------------------
const getOthersStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const stories = await Story.find({ userId: { $ne: userId } })
      .populate("userId", "name")
      .sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//get story by id
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

async function urlToBase64(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}

const getStoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid story ID" });
    }

    const story = await Story.findById(id).populate("userId", "name");

    if (!story)
      return res
        .status(404)
        .json({ success: false, message: "Story not found" });

    let prompt;
    let contents = [];
    //console.log("content", story.content);
    //console.log("mediaType", story.mediaType);
    if (story.mediaType === "text") {
      prompt = `
        You are an AI assistant that analyzes personal stories provided as text.
        Analyze this story and return JSON strictly in this format:
        {"tags":["..."],
        "summary":"...","
        category":""}

        Title: ${story.title}
        Content: ${story.content || ""}
      `;

      contents = [{ parts: [{ text: prompt }] }];
    } else if (story.mediaType === "photo" && story.mediaUrl) {
      const base64Img = await urlToBase64(story.mediaUrl);

      prompt = `
        You are an AI assistant that analyzes an image to infer possible story context.
        Look at the image carefully and generate tags, summary, and category.
        Return JSON strictly in this format:
        {"tags":["..."],"summary":"...","category":""}

        Title: ${story.title}
      `;

      contents = [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Img,
              },
            },
          ],
        },
      ];
    }
    //nsole.log("contents", contents.parts

    if (
      (!story.aiAnalysis ||
        !story.aiAnalysis.tags?.length ||
        !story.aiAnalysis.summary) &&
      contents.length
    ) {
      try {
        const aiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents }),
          }
        );

        const aiData = await aiRes.json();
        let text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      //console.log("AI raw text:", text);

        const jsonMatch = text.match(/\{[\s\S]*\}/);

        let json;
        try {
          if (jsonMatch) {
            json = JSON.parse(jsonMatch[0]);
            console.log("Parsed JSON:", json);
          } else {
            throw new Error("No JSON found in AI response");
          }
        } catch (err) {
          console.error("Failed to parse JSON:", err);
          json = { tags: [], summary: "", category: "Unclassified" };
        }

        story.aiAnalysis = {
          tags: json.tags || [],
          summary: json.summary || "",
          category: json.category || "Unclassified",
        };

        await story.save();
      } catch (aiErr) {
        console.error("AI error:", aiErr);
      }
    }

    res.json({ success: true, story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------------
// Update Story
// -------------------------
const updateStory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content = "",
      tags = "",
      mediaType,
      date,
      visibility,
    } = req.body;

    const story = await Story.findById(id);
    if (!story)
      return res
        .status(404)
        .json({ success: false, message: "Story not found" });

    story.title = title || story.title;
    story.content = mediaType === "text" ? content : story.content;
    story.tags = tags ? tags.split(",").map((t) => t.trim()) : story.tags;
    story.date = date || story.date;
    story.mediaType = mediaType || story.mediaType;
    story.visibility = visibility || story.visibility;

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
    if (
      (mediaType === "text" && content && content.trim().length > 0) ||
      req.file
    ) {
      reprocessed = true;
      try {
        let temp = { path: null, cleanupFn: async () => {} };

        if (mediaType === "text") {
          const transcript = content || "";
          const { summary, tags: autoTags } = await generateSummaryAndTags(
            transcript
          );
          const seedText = (summary || transcript || "").slice(0, 8000);
          const embedding = await createEmbedding(seedText);
          const vectorId = `story-${story._id.toString()}`;

          if (embedding) {
            await safeUpsertVector(
              process.env.PINECONE_INDEX_NAME,
              vectorId,
              embedding,
              {
                storyId: story._id.toString(),
                userId: story.userId.toString(),
                familyId: story.familyId || null,
                title: title || story.title,
                tags: autoTags,
              }
            );
          }

          story.transcript = transcript;
          story.summary = summary;
          story.tags =
            Array.isArray(story.tags) && story.tags.length
              ? story.tags
              : autoTags;
          story.embeddingId = embedding ? vectorId : story.embeddingId;
        } else {
          // file case
          if (req.file && req.file.buffer) {
            temp = await writeBufferToTempFile(
              req.file.buffer,
              req.file.originalname
            );
          }

          const transcript = await transcribeIfNeeded({
            file: temp.path ? { path: temp.path } : null,
            text: content,
          });
          const { summary, tags: autoTags } = await generateSummaryAndTags(
            transcript
          );
          const seedText = (summary || transcript || "").slice(0, 8000);
          const embedding = await createEmbedding(seedText);
          const vectorId = `story-${story._id.toString()}`;

          if (embedding) {
            await safeUpsertVector(
              process.env.PINECONE_INDEX_NAME,
              vectorId,
              embedding,
              {
                storyId: story._id.toString(),
                userId: story.userId.toString(),
                familyId: story.familyId || null,
                title: title || story.title,
                tags: autoTags,
              }
            );
          }

          story.transcript = transcript;
          story.summary = summary;
          story.tags =
            Array.isArray(story.tags) && story.tags.length
              ? story.tags
              : autoTags;
          story.embeddingId = embedding ? vectorId : story.embeddingId;

          await temp.cleanupFn();
        }
      } catch (procErr) {
        console.warn(
          "Post-update processing failed (updateStory):",
          procErr.message || procErr
        );
      }
    }

    await story.save();
    res.json({ success: true, story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// -------------------------
// Delete Story
// -------------------------
const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await Story.findByIdAndDelete(id);
    if (!story)
      return res
        .status(404)
        .json({ success: false, message: "Story not found" });
    res.json({ success: true, message: "Story deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------------
// Feed Routes
// -------------------------

// Feed: get stories (public, private, family)
const getFeedStories = async (req, res) => {
  try {
    const userId = req.user._id;

    const userCircles = await FamilyCircle.find({
      $or: [{ createdBy: userId }, { "members.user": userId }],
      isActive: true,
    }).select("_id members createdBy");

    const circleMemberIds = userCircles.flatMap((circle) => [
      circle.createdBy,
      ...circle.members.map((member) => member.user),
    ]);

    const visibilityQuery = {
      $or: [
        { visibility: "public" },
        { visibility: "private", userId },
        {
          visibility: "family",
          $or: [{ userId }, { userId: { $in: circleMemberIds } }],
        },
      ],
    };

    const stories = await Story.find(visibilityQuery)
      .populate("userId", "name username")
      .sort({ createdAt: -1 });

    res.json({ success: true, stories });
  } catch (err) {
    console.error("Error fetching feed stories:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Public stories
const getPublicStories = async (req, res) => {
  try {
    const stories = await Story.find({ visibility: "public" })
      .populate("userId", "name username")
      .sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (err) {
    console.error("Error fetching public stories:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Family stories
// const getFamilyStories = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const userCircles = await FamilyCircle.find({
//       $or: [{ createdBy: userId }, { "members.user": userId }],
//       isActive: true,
//     }).populate("members.user", "name email");

//     const circleMemberIds = userCircles.flatMap((circle) => [
//       circle.createdBy,
//       ...circle.members.map((member) => member.user._id || member.user),
//     ]);

//     const stories = await Story.find({
//       visibility: "family",
//       $or: [{ userId }, { userId: { $in: circleMemberIds } }],
//     })
//       .populate("userId", "name username")
//       .sort({ createdAt: -1 });

//     res.json({ success: true, stories });
//   } catch (err) {
//     console.error("Error fetching family stories:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
const getFamilyStories = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Get all family circles where user is a member
    const circles = await FamilyCircle.find({
      "members.user": userId,
    }).select("_id");

    const circleIds = circles.map((c) => c._id);
    //console.log("Circle IDs:", circleIds);
    if (!circleIds.length) {
      return res.json([]);
    }

    // 2. Get stories only from those circles with visibility "family"
    const stories = await Story.find({
      //visibility: "family",
      familyCircle: { $in: circleIds },
    })
      .populate("userId", "name email")
      .populate("familyCircle", "name description")
      .sort({ createdAt: -1 });
    console.log("Family Stories:", stories);
    res.json(stories);
  } catch (err) {
    console.error("Error fetching family stories:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------------
module.exports = {
  createStory,
  getAllStories,
  getMyStories,
  getOthersStories,
  getStoryById,
  updateStory,
  deleteStory,
  getFeedStories,
  getPublicStories,
  getFamilyStories,
};
