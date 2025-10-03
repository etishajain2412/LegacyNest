const Story = require("../models/Story");
const User = require("../models/user");
const { Readable } = require("stream");
const cloudinary = require("../configs/cloudinary");


async function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(uploadStream);
  });
}

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
