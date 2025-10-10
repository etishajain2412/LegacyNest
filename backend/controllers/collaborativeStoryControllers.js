const CollaborativeStory = require("../models/CollaborativeStory");
const FamilyCircle = require("../models/FamilyCircle");

exports.createCollaborativeStory = async (req, res) => {
  try {
    const { title, familyCircle } = req.body;
    const circle = await FamilyCircle.findById(familyCircle);
    if (!circle) return res.status(404).json({ message: "Family Circle not found" });

    const story = await CollaborativeStory.create({
      title,
      familyCircle,
      createdBy: req.user._id,
      editors: [req.user._id],
    });

    res.status(201).json({ message: "Story created successfully", story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStoriesByCircle = async (req, res) => {
  try {
    const { circleId } = req.params;
    const stories = await CollaborativeStory.find({ familyCircle: circleId })
      .populate("createdBy", "name email")
      .populate("editors", "name");
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ message: "Error fetching stories" });
  }
};

exports.getStoryById = async (req, res) => {
  try {
    const story = await CollaborativeStory.findById(req.params.storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });
    res.json(story);
  } catch (err) {
    res.status(500).json({ message: "Error fetching story" });
  }
};

exports.updateStoryContent = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { content } = req.body;
    const story = await CollaborativeStory.findByIdAndUpdate(
      storyId,
      { content, lastEditedAt: Date.now() },
      { new: true }
    );
    res.json({ story });
  } catch (err) {
    res.status(500).json({ message: "Error updating story" });
  }
};

exports.toggleLockStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { lock } = req.body; // true or false
    const story = await CollaborativeStory.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });

    if (story.locked && story.lockedBy.toString() !== req.user._id.toString() && !lock) {
      return res.status(403).json({ message: "Only the user who locked this story can unlock it" });
    }

    story.locked = lock;
    story.lockedBy = lock ? req.user._id : null;
    await story.save();

    const populatedStory = await CollaborativeStory.findById(story._id).populate("lockedBy", "name");
    res.json({ story: { ...populatedStory.toObject(), lockedByName: populatedStory.lockedBy?.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error toggling lock" });
  }
};

