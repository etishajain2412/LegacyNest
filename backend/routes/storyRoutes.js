const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");
const cloudinary = require("../configs/cloudinary");
const Story = require("../models/Story");
const FamilyCircle = require("../models/familyCircle");
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
      visibility
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
    const userId = req.user.id || req.user._id;

    const stories = await Story.find({ userId })
      .populate("userId", "name username")
      .sort({ createdAt: -1 });

    res.json({ success: true, stories });
  } catch (err) {
    console.error("Error fetching my stories:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stories/feed → get stories based on visibility
router.get("/feed", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const userCircles = await FamilyCircle.find({
      $or: [
        { createdBy: userId },
        { "members.user": userId }
      ],
      isActive: true
    }).select("_id members");

    const circleIds = userCircles.map(circle => circle._id);
    const circleMemberIds = userCircles.flatMap(circle => [
      circle.createdBy,
      ...circle.members.map(member => member.user)
    ]);

    const visibilityQuery = {
      $or: [
        { visibility: 'public' },

        { 
          visibility: 'private',
          userId: userId
        },

        {
          visibility: 'family',
          $or: [
            { userId: userId },
            { 
              userId: { $in: circleMemberIds }
            }
          ]
        }
      ]
    };

    const stories = await Story.find(visibilityQuery)
      .populate("userId", "name username")
      .sort({ createdAt: -1 });

    const storiesWithContext = stories.map(story => {
      const storyObj = story.toObject();
      
      if (story.visibility === 'public') {
        storyObj.visibilityContext = 'Public - Visible to everyone';
      } else if (story.visibility === 'private') {
        storyObj.visibilityContext = 'Private - Only you can see this';
      } else if (story.visibility === 'family') {
        if (story.userId._id.toString() === userId.toString()) {
          storyObj.visibilityContext = 'Family - Shared with your family circles';
        } else {
          storyObj.visibilityContext = 'Family - Shared by a family circle member';
        }
      }
      
      return storyObj;
    });

    res.json({ 
      success: true, 
      stories: storiesWithContext,
      stats: {
        total: stories.length,
        public: stories.filter(s => s.visibility === 'public').length,
        family: stories.filter(s => s.visibility === 'family').length,
        private: stories.filter(s => s.visibility === 'private' && s.userId._id.toString() === userId.toString()).length
      }
    });
  } catch (err) {
    console.error("Error fetching feed stories:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stories/family → get only family-visible stories from user's circles
router.get("/family", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const userCircles = await FamilyCircle.find({
      $or: [
        { createdBy: userId },
        { "members.user": userId }
      ],
      isActive: true
    }).populate("members.user", "name email");

    const circleMemberIds = userCircles.flatMap(circle => [
      circle.createdBy,
      ...circle.members.map(member => member.user._id || member.user)
    ]);

    const familyStories = await Story.find({
      visibility: 'family',
      $or: [
        { userId: userId },
        { userId: { $in: circleMemberIds } }
      ]
    })
    .populate("userId", "name username")
    .sort({ createdAt: -1 });

    const storiesWithCircleInfo = familyStories.map(story => {
      const storyObj = story.toObject();
      const userCirclesForStory = userCircles.filter(circle => 
        circle.createdBy.toString() === story.userId._id.toString() ||
        circle.members.some(member => 
          (member.user._id || member.user).toString() === story.userId._id.toString()
        )
      );
      
      storyObj.sharedCircles = userCirclesForStory.map(circle => ({
        _id: circle._id,
        name: circle.name
      }));
      
      return storyObj;
    });

    res.json({ 
      success: true, 
      stories: storiesWithCircleInfo,
      userCircles: userCircles.map(circle => ({ _id: circle._id, name: circle.name }))
    });
  } catch (err) {
    console.error("Error fetching family stories:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stories/public → get only public stories
router.get("/public", authenticateToken, async (req, res) => {
  try {
    const publicStories = await Story.find({ visibility: 'public' })
      .populate("userId", "name username")
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      stories: publicStories 
    });
  } catch (err) {
    console.error("Error fetching public stories:", err);
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

    const updated = await story.save();
    res.json({ success: true, story: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stories/:id (get single story with visibility check)
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    const story = await Story.findById(id).populate("userId", "name username");
    if (!story) {
      return res.status(404).json({ success: false, error: "Story not found" });
    }

    let canView = false;

    if (story.visibility === 'public') {
      canView = true;
    } else if (story.visibility === 'private') {
      canView = story.userId._id.toString() === userId.toString();
    } else if (story.visibility === 'family') {
      if (story.userId._id.toString() === userId.toString()) {
        canView = true;
      } else {
        const userCircles = await FamilyCircle.find({
          $or: [
            { createdBy: userId },
            { "members.user": userId }
          ],
          isActive: true
        });

        const creatorCircles = await FamilyCircle.find({
          $or: [
            { createdBy: story.userId._id },
            { "members.user": story.userId._id }
          ],
          isActive: true
        });

        const sharedCircles = userCircles.filter(userCircle => 
          creatorCircles.some(creatorCircle => 
            creatorCircle._id.toString() === userCircle._id.toString()
          )
        );

        canView = sharedCircles.length > 0;
      }
    }

    if (!canView) {
      return res.status(403).json({ 
        success: false, 
        error: "You don't have permission to view this story" 
      });
    }

    res.json({ success: true, story });
  } catch (err) {
    console.error("Error fetching story:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;