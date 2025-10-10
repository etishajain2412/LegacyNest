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
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    joinRequests: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        requestedAt: { type: Date, default: Date.now },
        processedAt: Date,
        processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    settings: {
      joinMethod: {
        type: String,
        enum: ["admin_approval", "direct_add", "invite_only"],
        default: "admin_approval",
      },
      allowMemberInvites: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

familyCircleSchema.index({ createdBy: 1 });
familyCircleSchema.index({ "members.user": 1 });
familyCircleSchema.index({ "joinRequests.user": 1 });

module.exports = mongoose.models.FamilyCircle || mongoose.model("FamilyCircle", familyCircleSchema);