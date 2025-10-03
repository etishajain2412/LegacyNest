const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");
const cloudinary = require("../configs/cloudinary");
const Story = require("../models/Story");
const { authenticateToken } = require("../middlewares/authMiddleware");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper: upload buffer to Cloudinary
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(uploadStream);
  });
}

// POST /api/stories (create story)
router.post("/", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    const {
      title,
      content = "",
      tags = "",
      date,
      mediaType,
      visibility = "private"
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const userId = req.user._id;

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
      userId,
      title,
      content: mediaType === "text" ? content : "",
      tags: tags ? tags.split(",").map(t => t.trim()) : [],
      date,
      mediaType,
      mediaUrl,
      publicId,
      cloudinaryResponse,
      visibility,
      sharedWith: []
    });

    const saved = await story.save();
    res.status(201).json({ success: true, story: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stories/mine → fetch all stories created by logged-in user
router.get("/mine", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id; // support both cases

    const stories = await Story.find({ userId })
      .populate("userId", "name username")
      .sort({ createdAt: -1 });

    res.json({ success: true, stories });
  } catch (err) {
    console.error("Error fetching my stories:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/stories/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const story = await Story.findOne({ _id: id, userId });
    if (!story) {
      return res.status(404).json({ success: false, error: "Story not found or not yours" });
    }

    if (story.publicId) {
      try {
        await cloudinary.uploader.destroy(story.publicId);
      } catch (cloudErr) {
        console.error("Cloudinary deletion error:", cloudErr);
      }
    }

    await Story.findByIdAndDelete(id);
    res.json({ success: true, message: "Story deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/stories/:id (update story)
router.put("/:id", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const {
      title,
      content = "",
      tags = "",
      date,
      mediaType,
      visibility
    } = req.body;

    let story = await Story.findOne({ _id: id, userId });
    if (!story) {
      return res.status(404).json({ success: false, error: "Story not found or not yours" });
    }

    if (title) story.title = title;
    if (content) story.content = content;
    if (tags) story.tags = tags.split(",").map(t => t.trim());
    if (date) story.date = date;
    if (mediaType) story.mediaType = mediaType;
    if (visibility) story.visibility = visibility;

    if (req.file && mediaType !== "text") {
      if (story.publicId) {
        try {
          await cloudinary.uploader.destroy(story.publicId);
        } catch (err) {
          console.error("Cloudinary delete error:", err);
        }
      }
      const uploadRes = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "stories",
        resource_type: "auto"
      });
      story.mediaUrl = uploadRes.secure_url;
      story.publicId = uploadRes.public_id;
      story.cloudinaryResponse = uploadRes;
    }

    story.sharedWith = [];

    const updated = await story.save();
    res.json({ success: true, story: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
