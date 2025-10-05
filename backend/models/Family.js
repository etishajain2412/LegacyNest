
const mongoose = require("mongoose");

const FamilySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  members: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: { type: String, enum: ["admin", "member"], default: "member" }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Family", FamilySchema);
