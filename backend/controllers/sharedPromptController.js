const SharedPrompt = require("../models/SharedPrompt");
const PromptInstance = require("../models/PromptInstance");
const Story = require("../models/Story");
const Family = require("../models/Family");
const { getIo, getSocketId } = require("../utils/socketManager");

// 1) Share a prompt to family
exports.sharePromptToFamily = async (req, res) => {
  try {
    const { familyId, promptInstanceId } = req.body;
    const userId = req.user.id;

    // Basic checks
    const family = await Family.findById(familyId);
    if (!family) return res.status(404).json({ error: "Family not found" });

    const member = family.members.find(m => String(m.userId) === String(userId));
    if (!member) return res.status(403).json({ error: "Not a family member" });

    // Ensure promptInstance exists and that the user created a Story from it
    const promptInstance = await PromptInstance.findById(promptInstanceId);
    if (!promptInstance) return res.status(404).json({ error: "Prompt instance not found" });

    // Find the story generated from this prompt by the current user
    const story = await Story.findOne({ userId, title: { $regex: promptInstance.promptText.slice(0, 120) } });
    // Better: your app probably persisted linkedStoryId on the promptInstance when the user responded
    let originalStoryId = promptInstance.linkedStoryId || (story && story._id);
    if (!originalStoryId) {
      return res.status(400).json({ error: "You must respond to the prompt (create a story) before sharing" });
    }

    // Create SharedPrompt
    const sp = await SharedPrompt.create({
      familyId,
      promptInstanceId,
      originalStoryId,
      sharedBy: userId,
      promptText: promptInstance.promptText,
      title: promptInstance.promptText.slice(0, 100),
      tags: []
    });

    // Notify family members in real-time
    const io = getIo();
    // emit to all family members (if you map userId -> socketId)
    for (const m of family.members) {
      const sid = getSocketId(m.userId);
      if (io && sid) {
        io.to(sid).emit("sharedPrompt:new", { sharedPrompt: sp });
      }
    }

    return res.status(201).json({ ok: true, sharedPrompt: sp });
  } catch (err) {
    console.error("sharePromptToFamily err:", err);
    res.status(500).json({ error: err.message });
  }
};

// 2) Get family feed
exports.getFamilyFeed = async (req, res) => {
  try {
    const { familyId } = req.params;
    // Validate membership
    const family = await Family.findById(familyId);
    if (!family) return res.status(404).json({ error: "Family not found" });
    if (!family.members.some(m => String(m.userId) === String(req.user.id))) {
      return res.status(403).json({ error: "Not a member" });
    }

    // Return recent shared prompts with populated sharer and story snippet
    const feed = await SharedPrompt.find({ familyId })
      .sort({ sharedAt: -1 })
      .limit(50)
      .populate("sharedBy", "name username") // basic user info
      .populate("originalStoryId", "content mediaUrl mediaType createdAt title");

    res.json(feed);
  } catch (err) {
    console.error("getFamilyFeed err:", err);
    res.status(500).json({ error: err.message });
  }
};

// 3) Reply to a shared prompt
exports.replyToSharedPrompt = async (req, res) => {
  try {
    const { sharedPromptId } = req.params;
    const { text, mediaUrl, mediaType } = req.body;
    const userId = req.user.id;

    const shared = await SharedPrompt.findById(sharedPromptId);
    if (!shared) return res.status(404).json({ error: "Shared prompt not found" });

    // Validate user is family member
    const family = await Family.findById(shared.familyId);
    if (!family || !family.members.some(m => String(m.userId) === String(userId))) {
      return res.status(403).json({ error: "Not allowed" });
    }

    // Create a new story for the reply
    const story = await Story.create({
      userId,
      title: shared.promptText.slice(0, 120),
      content: text || "",
      tags: [],
      date: new Date(),
      mediaType: mediaType || (mediaUrl ? "photo" : "text"),
      mediaUrl: mediaUrl || "",
      sharedPromptId: shared._id
    });

    // Increase repliesCount
    shared.repliesCount = (shared.repliesCount || 0) + 1;
    await shared.save();

    // Notify family members & original sharer
    const io = getIo();
    for (const m of family.members) {
      const sid = getSocketId(m.userId);
      if (io && sid) {
        io.to(sid).emit("sharedPrompt:reply", { sharedPromptId: shared._id, story });
      }
    }

    res.status(201).json({ ok: true, story });
  } catch (err) {
    console.error("replyToSharedPrompt err:", err);
    res.status(500).json({ error: err.message });
  }
};

// 4) Get replies for a shared prompt
exports.getSharedPromptReplies = async (req, res) => {
  try {
    const { sharedPromptId } = req.params;
    const shared = await SharedPrompt.findById(sharedPromptId);
    if (!shared) return res.status(404).json({ error: "Not found" });

    // membership check
    const family = await Family.findById(shared.familyId);
    if (!family.members.some(m => String(m.userId) === String(req.user.id))) {
      return res.status(403).json({ error: "Not a member" });
    }

    const replies = await Story.find({ sharedPromptId }).populate("userId", "name username").sort({ createdAt: 1 });
    res.json({ shared, replies });
  } catch (err) {
    console.error("getSharedPromptReplies err:", err);
    res.status(500).json({ error: err.message });
  }
};
