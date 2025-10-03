const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");
const cloudinary = require("../configs/cloudinary"); 
const Story = require("../models/Story");
const User = require("../models/user");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(uploadStream);
  });
}



// POST STORIES WITH MEDIA UPLOAD
router.post("/", upload.single("file"), async (req, res) => {
  try {
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    const { title, content = "", tags = "", date, mediaType, userId } = req.body;

    if (!title || !date || !userId) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    let mediaUrl = "";
    let publicId = "";
    let cloudinaryResponse = null;

    if (req.file && mediaType !== "text") {
      try {
        const uploadRes = await uploadBufferToCloudinary(req.file.buffer, {
          folder: "stories",
          resource_type: "auto",
        });
        console.log("Cloudinary upload response:", uploadRes);
        mediaUrl = uploadRes.secure_url;
        publicId = uploadRes.public_id;
        cloudinaryResponse = uploadRes;
      } catch (err) {
        console.error("Cloudinary upload error:", err);
        return res.status(500).json({ success: false, error: "Cloudinary upload failed" });
      }
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
    });

    const saved = await story.save();
    console.log("Saved story:", saved);

    res.status(201).json({ success: true, story: saved });
  } catch (err) {
    console.error("Error uploading story:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET-> FOR ALL STORIES
router.get("/", async (req, res) => {
  try {
    const stories = await Story.find()
      .populate("userId", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, stories });
  } catch (err) {
    console.error("Error fetching stories:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET-> ONLY THE LOGGED-IN USER'S STORIES
router.get("/mine/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const stories = await Story.find({ userId })
      .populate("userId", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, stories });
  } catch (err) {
    console.error("Error fetching user's stories:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET-> OTHER USERS' STORIES EXCLUDING THE LOGGED-IN USER'S
router.get("/others/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const stories = await Story.find({ userId: { $ne: userId } })
      .populate("userId", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, stories });
  } catch (err) {
    console.error("Error fetching other users' stories:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


module.exports = router;
