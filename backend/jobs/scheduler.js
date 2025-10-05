const cron = require("node-cron");
const PromptInstance = require("../models/PromptInstance");
const User = require("../models/User");
const { getSocketId, getIo } = require("../utils/socketManager");
const { sendPromptEmail } = require("../utils/mailer");

module.exports = function startScheduler() {
  // every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      // find scheduled items due now or earlier
      const due = await PromptInstance.find({
        status: "scheduled",
        sendAt: { $lte: now }
      }).limit(200);

      if (!due.length) return;

      const io = getIo();

      for (const p of due) {
        try {
          // attempt in-app
          const socketId = getSocketId(p.userId);
          if (socketId && io && io.to(socketId)) {
            // emit new prompt
            io.to(socketId).emit("prompt:new", {
              id: p._id,
              promptText: p.promptText,
              sendAt: p.sendAt
            });
            p.deliveredAt = new Date();
            p.status = "delivered";
            await p.save();
            continue;
          }

          // fallback: email if available
          const user = await User.findById(p.userId);
          if (user && user.email) {
            const subject = "A new memory prompt for you";
            const html = `<p>Hi ${user.name},</p>
            <p>${p.promptText}</p>
            <p><a href="${process.env.BASE_URL}/prompts/${p._id}">Answer in the Family Trunk</a></p>`;
            await sendPromptEmail(user.email, subject, html);
            p.deliveredAt = new Date();
            p.status = "delivered";
            await p.save();
          } else {
            // neither socket nor email: leave scheduled and maybe mark attemptedAt (skip here)
            console.warn("No delivery method for prompt", p._id);
          }
        } catch (err) {
          console.error("Failed to deliver prompt", p._id, err);
        }
      }
    } catch (err) {
      console.error("Scheduler error", err);
    }
  });
};
