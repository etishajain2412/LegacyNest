const Story = require("../models/Story");
const User = require("../models/user");
const { Readable } = require("stream");
const cloudinary = require("../configs/cloudinary");
const mongoose = require("mongoose");
require("dotenv").config();

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

//create story
const createStory = async (req, res) => {
  try {
    const {
      title,
      content = "",
      tags = "",
      date,
      mediaType,
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
    const stories = await Story.find()
      .populate("userId", "name")
      .sort({ createdAt: -1 });
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
    const stories = await Story.find({ userId })
      .populate("userId", "name")
      .sort({ createdAt: -1 });
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
const getStoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid story ID" });
    }

    const story = await Story.findById(id).populate("userId", "name");

    if (!story)
      return res
        .status(404)
        .json({ success: false, message: "Story not found" });

    if (
      story.mediaType === "text" &&
      (!story.aiAnalysis ||
        !story.aiAnalysis.tags.length ||
        !story.aiAnalysis.summary)
    ) {
      const prompt = `
        You are an AI assistant that analyzes a short personal story. 
        Analyze this story and return JSON:
        {"tags":["..."],"summary":"...","category":""}
        Title: ${story.title}
        Content: ${story.content}
      `;
    //   const prompt = `
    //       You are an assistant that analyzes a story. 
    //       Read the story and provide the following in JSON format:

    //       1. "summary" - a short, simple, easy-to-understand summary in 2-3 lines.
    //       2. "tags" - 3-5 keywords that describe the story.
    //       3. "category" - one short category like "Adventure", "Romance", "Tech", etc.

    //       Return ONLY valid JSON, no extra text.

    //       Story Title: "${story.title}"
    //       Story Content: "${story.content}"
    // `;

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
        console.log("AI response:", aiData);

        let text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        text = text.replace(/```json|```/g, "").trim(); // clean code block markers

        let json;
        try {
          json = JSON.parse(text);
        } catch (parseErr) {
          console.error("Error parsing AI response:", parseErr);
          json = { tags: [], summary: "", category: "Uncategorized" };
        }

        story.aiAnalysis = {
          tags: json.tags || [],
          summary: json.summary || "",
          category: json.category || "Uncategorized",
        };

        await story.save();
      } catch (aiErr) {
        console.error("Error calling AI API:", aiErr);
      }
    }

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
    if (!story)
      return res
        .status(404)
        .json({ success: false, message: "Story not found" });

    story.title = title || story.title;
    story.content = mediaType === "text" ? content : story.content;
    story.tags = tags ? tags.split(",").map((t) => t.trim()) : story.tags;
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

module.exports = {
  createStory,
  getAllStories,
  getMyStories,
  getOthersStories,
  getStoryById,
  updateStory,
  deleteStory,
};
