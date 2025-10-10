const PromptInstance = require("../models/PromptInstance");
const Story = require("../models/Story");
const { getIo, getSocketId } = require("../utils/socketManager");
const generatePromptText = require("../utils/promptGenerator");


exports.createDynamicPrompt = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const recentDocs = await PromptInstance.find({ userId })
      .sort({ sendAt: -1 })
      .limit(50)
      .select("promptText");

    const recentTexts = recentDocs.map((d) => d.promptText || "");

    const promptText = await generatePromptText(recentTexts);
    if (!promptText) throw new Error("Gemini prompt failed");

    const instance = await PromptInstance.create({
      userId,
      promptText,
      sendMethod: "in-app",
      sendAt: new Date(),
      status: "scheduled",
    });

    // Deliver immediately if user online
    const io = getIo();
    const socketId = getSocketId(userId);
    if (io && socketId) {
      io.to(socketId).emit("prompt:new", instance);
      instance.status = "delivered";
      instance.deliveredAt = new Date();
      await instance.save();
    }

    res.status(201).json({ ok: true, instance });
  } catch (err) {
    console.error("createDynamicPrompt err:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getUserPromptInstances = async (req, res) => {
  try {
    const items = await PromptInstance.find({ userId: req.user.id })
      .sort({ sendAt: -1 })
      .limit(200);
    res.json(items);
  } catch (err) {
    console.error("getUserPromptInstances err:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.skipPrompt = async (req, res) => {
  try {
    const { id } = req.params;
    const instance = await PromptInstance.findById(id);

    if (!instance) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    if (String(instance.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not your prompt" });
    }

    instance.status = "skipped";
    instance.skippedAt = new Date();
    await instance.save();

    const io = getIo();
    const socketId = getSocketId(req.user.id);
    if (io && socketId) {
      io.to(socketId).emit("prompt:skipped", { promptId: instance._id });
    }

    return res.json({ ok: true, skipped: instance });
  } catch (err) {
    console.error("skipPrompt err:", err);
    return res.status(500).json({ error: err.message });
  }
};


exports.respondToPrompt = async (req, res) => {
  try {
    const { text, mediaUrl, type } = req.body;
    const instance = await PromptInstance.findById(req.params.id);
    if (!instance) return res.status(404).json({ error: "Prompt not found" });
    if (String(instance.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not your prompt" });
    }

    instance.response = {
      type: type || (text ? "text" : (mediaUrl ? "photo" : null)),
      text: text || "",
      mediaUrl: mediaUrl || "",
      lengthSeconds: req.body.lengthSeconds || 0,
      words: text ? text.trim().split(/\s+/).length : 0,
    };
    instance.respondedAt = new Date();
    instance.status = "responded";

    const story = await Story.create({
      userId: req.user.id,
      title: instance.promptText.slice(0, 120),
      content: instance.response.text || "",
      tags: [],
      date: new Date(),
      mediaType: instance.response.type || "text",
      mediaUrl: instance.response.mediaUrl || "",
    });

    instance.linkedStoryId = story._id;
    await instance.save();

    const io = getIo();
    const socketId = getSocketId(req.user.id);
    if (io && socketId) {
      io.to(socketId).emit("prompt:responded", {
        promptId: instance._id,
        storyId: story._id,
      });
    }

    res.json({ ok: true, instance, story });
  } catch (err) {
    console.error("respondToPrompt err:", err);
    res.status(500).json({ error: err.message });
  }
};
