const mongoose = require("mongoose");

const collaborativeStorySchema = new mongoose.Schema(
  {
    familyCircle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyCircle",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    editors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastEditedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CollaborativeStory", collaborativeStorySchema);
