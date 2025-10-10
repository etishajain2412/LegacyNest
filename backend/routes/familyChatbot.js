const express = require("express");
const router = express.Router();
const FamilyCircle = require("../models/FamilyCircle");
const User = require("../models/User"); 

const getName = (user) => user?.name || "Unknown";

router.post("/", async (req, res) => {
  try {
    const { userId, question } = req.body;
    //console.log("Received question:", question, "from userId:", userId);
    if (!userId || !question) {
      return res.status(400).json({ response: "Missing userId or question" });
    }

    const circles = await FamilyCircle.find({
      $or: [
        { createdBy: userId },
        { "members.user": userId },
        { "joinRequests.user": userId },
      ],
    })
      .populate("createdBy", "name")
      .populate("members.user", "name")
      .populate("joinRequests.user", "name");

    if (circles.length === 0) {
      return res.json({
        response:
          "You are not part of any family circle yet. Try joining or creating one!",
      });
    }

    const q = question.toLowerCase();
    let answer = "I'm not sure how to answer that yet.";

    //regarding circles
    if (q.includes("which") && q.includes("circle")) {
      const names = circles.map((c) => c.name).join(", ");
      answer = `You are part of ${circles.length} family circles: ${names}.`;
    }

    //group admins/creators
    else if (q.includes("admin") || q.includes("creator")) {
      const list = circles
        .map((c) => {
          const admins = c.members
            .filter((m) => m.role === "admin")
            .map((m) => getName(m.user));
          return `${c.name}: ${admins.length ? admins.join(", ") : getName(c.createdBy)} (creator)`;
        })
        .join("\n");
      answer = `Here are the admins/creators of your circles:\n${list}`;
    }

    // join requests status 
    else if (q.includes("pending") || q.includes("request")) {
      const pending = circles
        .map((c) => {
          const reqs = c.joinRequests.filter((r) => r.status === "pending");
          return reqs.length ? `${c.name}: ${reqs.length} pending` : null;
        })
        .filter(Boolean)
        .join("\n");
      answer =
        pending || "You have no pending join requests at the moment.";
    }

    // members list
    else if (q.includes("member") || q.includes("family")) {
      const list = circles
        .map(
          (c) =>
            `${c.name}: ${c.members
              .map((m) => getName(m.user))
              .slice(0, 5)
              .join(", ")}${c.members.length > 5 ? "..." : ""}`
        )
        .join("\n");
      answer = `Here are some members from your circles:\n${list}`;
    }

    // joining status
    else if (q.includes("when") && q.includes("join")) {
      const joinedInfo = [];
      for (const c of circles) {
        const member = c.members.find(
          (m) => m.user && m.user._id.toString() === userId
        );
        if (member) {
          joinedInfo.push(
            `${c.name}: joined on ${new Date(member.joinedAt).toLocaleDateString()}`
          );
        }
      }
      answer =
        joinedInfo.length > 0
          ? joinedInfo.join("\n")
          : "I couldn’t find your join dates.";
    }

    res.json({ response: answer });
  } catch (err) {
    console.error("Chatbot Error:", err);
    res.status(500).json({ response: "Internal Server Error" });
  }
});

module.exports = router;
