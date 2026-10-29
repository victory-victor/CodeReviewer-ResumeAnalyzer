const mongoose = require('mongoose');

const jobRecommendationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
    },
    company: {
      type: String,
      default: '',
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    description: {
      type: String,
      default: '',
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    url: {
      type: String,
      default: '',
    },
    location: { type: String, default: '' },
    workMode: { type: String, enum: ['remote', 'hybrid', 'onsite', 'flexible'], default: 'flexible' },
    seniority: { type: String, default: '' },
    salaryRange: { type: String, default: '' },
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    suggestions: {
      type: [String],
      default: [],
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileUrl: {
      type: String,
      default: '',
    },
    parsedContent: {
      type: Object,
      default: {},
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: [Object],
      default: [],
    },
    education: {
      type: [Object],
      default: [],
    },
    jobRecommendations: {
      type: [jobRecommendationSchema],
      default: [],
    },
    analysis: {
      type: analysisSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

resumeSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Resume', resumeSchema);
