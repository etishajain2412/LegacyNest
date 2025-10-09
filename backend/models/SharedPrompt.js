const mongoose = require("mongoose");

const SharedPromptSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true },
  promptInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: "PromptInstance", required: true },
  originalStoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Story", required: true }, // the sharer's story
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sharedAt: { type: Date, default: Date.now },
  title: { type: String },    // short form of prompt / or promptText
  promptText: { type: String, required: true },
  repliesCount: { type: Number, default: 0 },
  // optional summary / AI extracted tags
  tags: { type: [String], default: [] },
}, {
  timestamps: true
});

module.exports = mongoose.model("SharedPrompt", SharedPromptSchema);
