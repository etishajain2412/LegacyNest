const mongoose = require('mongoose');

const SharedResponseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const SharedPromptSchema = new mongoose.Schema({
  promptInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'PromptInstance', required: true },
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyCircle', required: true },
  createdAt: { type: Date, default: Date.now },
  responses: { type: [SharedResponseSchema], default: [] }
});

module.exports = mongoose.model('SharedPrompt', SharedPromptSchema);
