const Story = require("../models/Story");
const User = require("../models/user");
const FamilyCircle = require("../models/familyCircle");
const { Readable } = require("stream");
const cloudinary = require("../configs/cloudinary");
const Tesseract = require("tesseract.js");
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

// -------------------------
// Get Story by ID (includes AI + OCR + visibility check)
// -------------------------
const getStoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = req.user ? req.user._id : null;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid story ID" });
    }

    const story = await Story.findById(id).populate("userId", "name username");
    if (!story)
      return res
        .status(404)
        .json({ success: false, message: "Story not found" });

    // Check visibility
    let canView = false;
    if (story.visibility === "public") {
      canView = true;
    } else if (story.visibility === "private") {
      canView =
        viewerId && story.userId._id.toString() === viewerId.toString();
    } else if (story.visibility === "family" && viewerId) {
      const userCircles = await FamilyCircle.find({
        $or: [{ createdBy: viewerId }, { "members.user": viewerId }],
        isActive: true,
      });
      const creatorCircles = await FamilyCircle.find({
        $or: [
          { createdBy: story.userId._id },
          { "members.user": story.userId._id },
        ],
        isActive: true,
      });
      const sharedCircles = userCircles.filter((userCircle) =>
        creatorCircles.some(
          (creatorCircle) =>
            creatorCircle._id.toString() === userCircle._id.toString()
        )
      );
      canView = sharedCircles.length > 0;
    }

    if (!canView)
      return res
        .status(403)
        .json({ success: false, error: "You don't have permission to view this story" });

    let contentToAnalyze = story.content || "";

    // Extract text from image
    if (story.mediaType === "photo" && story.mediaUrl) {
      try {
        const {
          data: { text },
        } = await Tesseract.recognize(story.mediaUrl, "eng");
        contentToAnalyze = text;
      } catch (ocrErr) {
        console.error("OCR error:", ocrErr);
      }
    }

    // Generate AI analysis if not exists
    if (
      (!story.aiAnalysis ||
        !story.aiAnalysis.tags?.length ||
        !story.aiAnalysis.summary) &&
      contentToAnalyze
    ) {
      const prompt = `
        Analyze this story and return JSON:
        {"tags":["..."],"summary":"...","category":""}
        Title: ${story.title}
        Content: ${contentToAnalyze}
      `;

      try {
        const aiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );

        const aiData = await aiRes.json();
        let text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        text = text.replace(/```json|```/g, "").trim();

        let json;
        try {
          json = JSON.parse(text);
        } catch {
          json = { tags: [], summary: "", category: "Uncategorized" };
        }

        story.aiAnalysis = {
          tags: json.tags || [],
          summary: json.summary || "",
          category: json.category || "Uncategorized",
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
    const { title, content = "", tags = "", mediaType, date, visibility } =
      req.body;

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
const getFamilyStories = async (req, res) => {
  try {
    const userId = req.user._id;

    const userCircles = await FamilyCircle.find({
      $or: [{ createdBy: userId }, { "members.user": userId }],
      isActive: true,
    }).populate("members.user", "name email");

    const circleMemberIds = userCircles.flatMap((circle) => [
      circle.createdBy,
      ...circle.members.map((member) => member.user._id || member.user),
    ]);

    const stories = await Story.find({
      visibility: "family",
      $or: [{ userId }, { userId: { $in: circleMemberIds } }],
    })
      .populate("userId", "name username")
      .sort({ createdAt: -1 });

    res.json({ success: true, stories });
  } catch (err) {
    console.error("Error fetching family stories:", err);
    res.status(500).json({ success: false, error: err.message });
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
