const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  company: { type: String, required: true, trim: true, maxlength: 160 },
  url: { type: String, trim: true, maxlength: 2048, default: '' },
  location: { type: String, trim: true, maxlength: 160, default: '' },
  workMode: { type: String, enum: ['remote', 'hybrid', 'onsite', 'flexible'], default: 'flexible' },
  matchScore: { type: Number, min: 0, max: 100, default: null },
  stage: { type: String, enum: ['saved', 'applied', 'interview', 'offer', 'rejected'], default: 'saved' },
  notes: { type: String, maxlength: 4000, default: '' },
}, { timestamps: true });

jobApplicationSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
