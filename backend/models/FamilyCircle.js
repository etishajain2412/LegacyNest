const mongoose = require("mongoose");

const familyCircleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role: {
          type: String,
          enum: ["admin", "contributor", "viewer"],
          default: "contributor",
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

familyCircleSchema.index({ createdBy: 1 });
familyCircleSchema.index({ "members.user": 1 });

module.exports = mongoose.model("FamilyCircle", familyCircleSchema);
