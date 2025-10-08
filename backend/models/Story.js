const mongoose = require("mongoose");

const StorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  content: { type: String, default: "" },
  // tags: { type: [String], default: [] },
  summary: { type: String, default: "" },
  date: { type: Date, required: true },
  mediaType: { type: String, enum: ["text","photo","video","audio"], default: "text" },
  mediaUrl: { type: String, default: "" },
  publicId: { type: String, default: "" },
  cloudinaryResponse: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },

  aiAnalysis: {
    tags: { type: [String], default: [] },
    summary: { type: String, default: "" },
    category: { type: String, default: "" } 
  }
});

module.exports = mongoose.model("Story", StorySchema);
