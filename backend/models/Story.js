const mongoose = require("mongoose");

const StorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: { type: String, required: true },
  content: { type: String, default: "" },
  tags: { type: [String], default: [] },
  date: { type: Date, required: true },
  mediaType: { type: String, enum: ["text", "photo", "video", "audio"], default: "text" },
  mediaUrl: { type: String, default: "" },
  publicId: { type: String, default: "" },
  cloudinaryResponse: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  sharedPromptId: { type: mongoose.Schema.Types.ObjectId, ref: "SharedPrompt", default: null },

  // 🧠 Added fields for AI + Matching (non-destructive)
  summary: { type: String, default: "" },        // auto-generated summary
  transcript: { type: String, default: "" },     // for audio/video content
  embedding: { type: [Number], default: [] },    // vector representation
  vectorMetadata: { type: mongoose.Schema.Types.Mixed, default: {} } // metadata for local vector DB
});

module.exports = mongoose.model("Story", StorySchema);
