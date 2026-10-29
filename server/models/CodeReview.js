const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    severity: {
      type: String,
      enum: ['critical', 'warning', 'info', 'suggestion'],
      default: 'info',
    },
    line: {
      type: Number,
      default: null,
    },
    message: {
      type: String,
      default: '',
    },
    suggestion: {
      type: String,
      default: '',
    },
    confidence: { type: Number, min: 0, max: 100, default: null },
    impact: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    priority: { type: String, enum: ['P0', 'P1', 'P2', 'P3'], default: 'P2' },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    patchStartLine: { type: Number, default: null },
    patchEndLine: { type: Number, default: null },
    patchReplacement: { type: String, maxlength: 12000, default: '' },
  },
  { _id: false }
);

const productionReadinessSchema = new mongoose.Schema(
  {
    isReady: {
      type: Boolean,
      default: false,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    checklist: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const reviewResultSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    summary: {
      type: String,
      default: '',
    },
    issues: {
      type: [issueSchema],
      default: [],
    },
    improvements: {
      type: [String],
      default: [],
    },
    securityIssues: {
      type: [String],
      default: [],
    },
    performanceIssues: {
      type: [String],
      default: [],
    },
    bestPractices: {
      type: [String],
      default: [],
    },
    productionReadiness: {
      type: productionReadinessSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const codeReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    code: {
      type: String,
      required: [true, 'Code is required for review'],
    },
    language: {
      type: String,
      default: 'javascript',
      trim: true,
      lowercase: true,
    },
    fileName: {
      type: String,
      default: '',
      trim: true,
    },
    review: {
      type: reviewResultSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    checks: {
      secretScan: { type: Object, default: () => ({ status: 'not_run', findings: [] }) },
      syntax: { type: Object, default: () => ({ status: 'not_applicable', findings: [] }) },
      ciNote: { type: String, default: 'Lint, tests, and dependency audits require a repository workflow.' },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient user-based queries
codeReviewSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CodeReview', codeReviewSchema);
