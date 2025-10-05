// models/PromptInstance.js
const mongoose = require("mongoose");

const PromptInstanceSchema = new mongoose.Schema({
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: "PromptTemplate" },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  promptText: { type: String, required: true }, // copy of the template text (so edits don’t break history)
  sendMethod: { type: String, enum: ["in-app", "email", "push"], default: "in-app" },
  sendAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date },
  respondedAt: { type: Date },

  response: {
    type: {
      type: String,
      enum: ["text", "audio", "video", "photo", null],
      default: null
    },
    text: { type: String },
    mediaUrl: { type: String },
    lengthSeconds: { type: Number },
    words: { type: Number }
  },

  linkedStoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },

  status: {
    type: String,
    enum: ["scheduled", "delivered", "responded", "skipped"],
    default: "scheduled"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("PromptInstance", PromptInstanceSchema);
