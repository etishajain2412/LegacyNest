const PromptInstance = require("../models/PromptInstance");
const FamilyCircle = require("../models/FamilyCircle");
const SharedPrompt = require("../models/SharedPrompt"); 
const { getIo } = require("../utils/socketManager");

exports.sharePrompt = async (req, res) => {
  try {
    const promptId = req.params.id;
    const { familyId } = req.body;
    const userId = req.user && req.user.id;

    if (!familyId) return res.status(400).json({ error: "familyId required" });

    const family = await FamilyCircle.findOne({
      _id: familyId,
      isActive: true,
      $or: [{ createdBy: userId }, { "members.user": userId }]
    });

    if (!family) {
      return res.status(403).json({ error: "You are not part of that family circle" });
    }

    const instance = await PromptInstance.findById(promptId);
    if (!instance) return res.status(404).json({ error: "PromptInstance not found" });

    // Ensuring prompt has a response before sharing (business rule)
    if (!instance.respondedAt && (!instance.response || !instance.response.text)) {
      return res.status(400).json({ error: "Only answered prompts can be shared" });
    }

    instance.sharedTo = instance.sharedTo || [];
    const alreadyShared = instance.sharedTo.some((f) => String(f) === String(familyId));
    if (!alreadyShared) {
      instance.sharedTo.push(familyId);
      await instance.save();
    }

    await SharedPrompt.create({
      familyId,
      promptInstanceId: instance._id,
      sharedBy: userId
    });

    const io = getIo();
    if (io) {
      const room = `family:${familyId}`; 
      io.to(room).emit("family:promptShared", {
        promptInstance: instance,
        sharedBy: userId,
        familyId
      });
    }

    return res.json({ ok: true, instance });
  } catch (err) {
    console.error("sharePrompt err:", err);
    return res.status(500).json({ error: err.message });
  }
};
exports.getSharedPromptsForFamily = async (req, res) => {
  try {
    const familyId = req.params.familyId || req.query.familyId;
    if (!familyId) {
      return res.status(400).json({ message: "familyId required" });
    }

    console.log("Fetching family feed for:", familyId);

    const list = await SharedPrompt.find({ familyId })
      .sort({ createdAt: -1 })
      .populate({
        path: "promptInstanceId",
        populate: {
          path: "userId",
          select: "name email"
        }
      })
      .populate("sharedBy", "name email")
      .populate("responses.userId", "name email");

    console.log("Found shared prompts:", list.length);
    return res.json(list);
  } catch (err) {
    console.error("getSharedPromptsForFamily error:", err.stack || err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};


exports.respondToSharedPrompt = async (req, res) => {
  try {
    const sharedId = req.params.sharedId; 

    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Response text is required' });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const shared = await SharedPrompt.findById(sharedId);
    if (!shared) {
      return res.status(404).json({ message: 'Shared prompt not found' });
    }
    const resp = {
      userId: req.user.id,
      text: text.trim(),
      createdAt: new Date()
    };
    shared.responses.push(resp);
    await shared.save();

    const populated = await SharedPrompt.findById(shared._id)
      .populate('sharedBy', 'name email username')
      .populate({
        path: 'promptInstanceId',
        populate: { path: 'userId', select: 'name username' } 
      })
      .populate('responses.userId', 'name username');

    try {
      const io = getIo();
      if (io && shared.familyId) {
        io.to(`family_${shared.familyId}`).emit('family:sharedPrompt:response', {
          sharedId: populated._id,
          response: populated.responses[populated.responses.length - 1]
        });
      }
    } catch (e) {
      console.warn('Socket emit failed:', e?.message || e);
    }

    return res.json({ shared: populated });
  } catch (err) {
    console.error('respondToSharedPrompt err:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};