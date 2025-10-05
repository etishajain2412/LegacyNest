// workers/promptWorker.js
const cron = require("node-cron");
const PromptInstance = require("../models/PromptInstance");
const { getIo, getSocketId } = require("../utils/socketManager");

/**
 * Worker: every minute, find scheduled prompts due now and emit them to connected sockets.
 * Delivery: only in-app via Socket.IO. If user not online, we leave the prompt as scheduled (or optionally mark attempted).
 */

async function deliverPromptInstance(p) {
  try {
    const io = getIo();
    if (!io) return false;

    const socketId = getSocketId(p.userId);
    if (!socketId) return false;

    // prepare payload
    const payload = {
      id: p._id,
      promptText: p.promptText,
      templateId: p.templateId,
      sendAt: p.sendAt,
      familyId: p.familyId,
    };

    io.to(socketId).emit("prompt:new", payload);

    // update instance
    p.deliveredAt = new Date();
    p.status = "delivered";
    await p.save();

    return true;
  } catch (err) {
    console.error("deliverPromptInstance err:", err);
    return false;
  }
}

async function processScheduledPrompts() {
  try {
    const now = new Date();
    // find scheduled prompts that are due
    const due = await PromptInstance.find({
      status: "scheduled",
      sendAt: { $lte: now },
    }).limit(200);

    if (!due || due.length === 0) return;

    for (const p of due) {
      const delivered = await deliverPromptInstance(p);
      if (!delivered) {
        // Optional: if not delivered, you may want to mark attempts or push to "pending" queue
        console.log(`User ${p.userId} not online — leaving scheduled.`);
      } else {
        console.log(`Delivered prompt ${p._id} to user ${p.userId}`);
      }
    }
  } catch (err) {
    console.error("processScheduledPrompts error:", err);
  }
}

function startPromptWorker() {
  // run every 30 seconds or every minute — choose frequency as needed
  cron.schedule("* * * * *", () => {
    console.log("⏰ promptWorker tick:", new Date().toISOString());
    processScheduledPrompts();
  });
}

module.exports = { startPromptWorker, processScheduledPrompts };
