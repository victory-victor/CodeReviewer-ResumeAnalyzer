const { validationResult } = require('express-validator');
const CodeReview = require('../models/CodeReview');
const User = require('../models/User');
const openaiService = require('../services/openaiService');
const codeCheckService = require('../services/codeCheckService');
const { formatResponse, asyncHandler } = require('../utils/helpers');

const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
const normalizeIssues = (issues, lineCount) => (Array.isArray(issues) ? issues : []).slice(0, 60).map((issue) => {
  const severity = ['critical', 'warning', 'info', 'suggestion'].includes(issue.severity) ? issue.severity : 'info';
  const fallbackRisk = { critical: 95, warning: 68, info: 38, suggestion: 20 }[severity];
  const start = Number(issue.patchStartLine);
  const end = Number(issue.patchEndLine);
  const hasPatch = Number.isInteger(start) && Number.isInteger(end) && start > 0 && end >= start && end <= lineCount && typeof issue.patchReplacement === 'string' && issue.patchReplacement.length <= 12000;
  const priority = ['P0', 'P1', 'P2', 'P3'].includes(issue.priority) ? issue.priority : (severity === 'critical' ? 'P0' : severity === 'warning' ? 'P1' : severity === 'info' ? 'P2' : 'P3');
  return {
    ...issue,
    line: Number.isInteger(Number(issue.line)) && Number(issue.line) > 0 && Number(issue.line) <= lineCount ? Number(issue.line) : null,
    severity,
    confidence: issue.confidence === null || issue.confidence === undefined ? null : clamp(issue.confidence),
    impact: ['critical', 'high', 'medium', 'low'].includes(issue.impact) ? issue.impact : severity === 'critical' ? 'critical' : severity === 'warning' ? 'high' : 'medium',
    priority,
    riskScore: issue.riskScore === null || issue.riskScore === undefined ? fallbackRisk : clamp(issue.riskScore),
    patchStartLine: hasPatch ? start : null,
    patchEndLine: hasPatch ? end : null,
    patchReplacement: hasPatch ? issue.patchReplacement : '',
  };
}).sort((a, b) => b.riskScore - a.riskScore);

const getReviewRules = asyncHandler(async (req, res) => {
  res.json(formatResponse(true, req.user.reviewRules || {}));
});

const updateReviewRules = asyncHandler(async (req, res) => {
  const allowed = {
    securityFocus: ['balanced', 'strict'],
    styleGuide: ['balanced', 'airbnb', 'standard', 'google'],
  };
  for (const [field, values] of Object.entries(allowed)) {
    if (req.body[field] !== undefined && !values.includes(req.body[field])) {
      return res.status(400).json(formatResponse(false, null, `Invalid ${field} setting`));
    }
  }
  const rules = {
    securityFocus: req.body.securityFocus ?? req.user.reviewRules?.securityFocus ?? 'strict',
    styleGuide: req.body.styleGuide ?? req.user.reviewRules?.styleGuide ?? 'balanced',
    framework: typeof req.body.framework === 'string' ? req.body.framework.trim().slice(0, 80) : req.user.reviewRules?.framework || '',
    productionReadiness: req.body.productionReadiness === undefined ? req.user.reviewRules?.productionReadiness !== false : Boolean(req.body.productionReadiness),
    customInstructions: typeof req.body.customInstructions === 'string' ? req.body.customInstructions.trim().slice(0, 2000) : req.user.reviewRules?.customInstructions || '',
  };
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { reviewRules: rules } }, { new: true, runValidators: true }).select('reviewRules');
  res.json(formatResponse(true, user.reviewRules, 'Review rules saved'));
});

/**
 * @desc    Create a new code review
 * @route   POST /api/reviews
 * @access  Private
 */
const createReview = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(formatResponse(false, null, errors.array()[0].msg));
  }

  const { code, language, fileName } = req.body;

  // Create a pending review first
  const codeReview = await CodeReview.create({
    user: req.user._id,
    code,
    language: language || 'javascript',
    fileName: fileName || '',
    status: 'pending',
  });

  try {
    // Call OpenAI for the review
    const reviewRules = req.user.reviewRules?.toObject?.() || req.user.reviewRules || {};
    const reviewResult = await openaiService.reviewCode(code, language || 'javascript', reviewRules);
    const checks = codeCheckService.runCodeChecks(code, language || 'javascript');
    const issues = normalizeIssues(reviewResult.issues, code.split(/\r?\n/).length);
    for (const finding of checks.secretScan.findings) {
      issues.push({
        severity: finding.severity === 'critical' ? 'critical' : 'warning',
        line: finding.line,
        message: finding.message,
        suggestion: 'Remove the credential from source, rotate it if real, and load it from a secret manager or environment variable.',
        confidence: 96,
        impact: finding.severity,
        priority: finding.severity === 'critical' ? 'P0' : 'P1',
        riskScore: finding.severity === 'critical' ? 98 : 75,
      });
    }
    reviewResult.issues = issues.sort((a, b) => b.riskScore - a.riskScore);

    codeReview.review = reviewResult;
    codeReview.checks = checks;
    codeReview.status = 'completed';
    await codeReview.save();

    res.status(201).json(formatResponse(true, codeReview, 'Code review completed successfully'));
  } catch (aiError) {
    codeReview.status = 'failed';
    await codeReview.save();

    console.error('OpenAI review error:', aiError.message);
    res.status(500).json(formatResponse(false, { reviewId: codeReview._id }, 'AI review failed. Please try again.'));
  }
});

/**
 * @desc    Get all reviews for the current user
 * @route   GET /api/reviews
 * @access  Private
 */
const getReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
  const sortBy = ['createdAt', 'updatedAt', 'language', 'status'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
  const order = req.query.order === 'asc' ? 1 : -1;

  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    CodeReview.find({ user: req.user._id })
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit)
      .select('-code'), // Exclude the full code from list responses
    CodeReview.countDocuments({ user: req.user._id }),
  ]);

  res.json(
    formatResponse(true, {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  );
});

/**
 * @desc    Get a single review by ID
 * @route   GET /api/reviews/:id
 * @access  Private
 */
const getReview = asyncHandler(async (req, res) => {
  const review = await CodeReview.findById(req.params.id);

  if (!review) {
    return res.status(404).json(formatResponse(false, null, 'Review not found'));
  }

  // Ensure the review belongs to the authenticated user
  if (review.user.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, null, 'Not authorized to access this review'));
  }

  res.json(formatResponse(true, review));
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
const deleteReview = asyncHandler(async (req, res) => {
  const review = await CodeReview.findById(req.params.id);

  if (!review) {
    return res.status(404).json(formatResponse(false, null, 'Review not found'));
  }

  if (review.user.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, null, 'Not authorized to delete this review'));
  }

  await review.deleteOne();

  res.json(formatResponse(true, null, 'Review deleted successfully'));
});

/**
 * @desc    Make code production-ready (refactor using AI)
 * @route   POST /api/reviews/:id/production-ready
 * @access  Private
 */
const makeProductionReady = asyncHandler(async (req, res) => {
  const review = await CodeReview.findById(req.params.id);

  if (!review) {
    return res.status(404).json(formatResponse(false, null, 'Review not found'));
  }

  if (review.user.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, null, 'Not authorized'));
  }

  if (review.status !== 'completed') {
    return res.status(400).json(formatResponse(false, null, 'Review must be completed before making production-ready'));
  }

  try {
    const result = await openaiService.makeProductionReady(
      review.code,
      review.language,
      review.review.issues || []
    );

    res.json(formatResponse(true, result, 'Production-ready code generated successfully'));
  } catch (aiError) {
    console.error('OpenAI production-ready error:', aiError.message);
    res.status(500).json(formatResponse(false, null, 'Failed to generate production-ready code'));
  }
});

module.exports = {
  getReviewRules,
  updateReviewRules,
  createReview,
  getReviews,
  getReview,
  deleteReview,
  makeProductionReady,
};
