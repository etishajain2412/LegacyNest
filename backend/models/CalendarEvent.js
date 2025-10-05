const mongoose = require("mongoose");

const CalendarEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: true,
  },
  date: {
    type: String, 
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  visibility: {
    type: String,
    enum: ["me", "all"],
    default: "me",
  },
}, { timestamps: true });

module.exports = mongoose.model("CalendarEvent", CalendarEventSchema);
