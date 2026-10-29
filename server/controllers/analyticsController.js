const CodeReview = require('../models/CodeReview');
const Resume = require('../models/Resume');
const { formatResponse, asyncHandler } = require('../utils/helpers');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/analytics/dashboard
 * @access  Private
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalReviews, completedReviews, recentReviews, recentActivityCount] = await Promise.all([
    CodeReview.countDocuments({ user: userId }),
    CodeReview.find({ user: userId, status: 'completed' }).select('review.score language createdAt'),
    CodeReview.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('language review.score status createdAt fileName'),
    CodeReview.countDocuments({ user: userId, createdAt: { $gte: weekAgo } }),
  ]);

  const productionReady = await CodeReview.countDocuments({ user: userId, status: 'completed', 'review.productionReadiness.isReady': true });

  // Average score
  const scores = completedReviews.map((r) => r.review?.score).filter((s) => typeof s === 'number');
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Top language
  const langCounts = {};
  completedReviews.forEach((r) => {
    const lang = r.language || 'unknown';
    langCounts[lang] = (langCounts[lang] || 0) + 1;
  });
  const topLanguage = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  res.json(
    formatResponse(true, {
      totalReviews,
      completedReviews: completedReviews.length,
      averageScore: avgScore,
      avgScore,
      productionReady,
      productionReadyPercentage: completedReviews.length ? Math.round((productionReady / completedReviews.length) * 100) : 0,
      topLanguage,
      recentActivityCount,
      recentReviews,
    })
  );
});

/**
 * @desc    Get review trends over time
 * @route   GET /api/analytics/trends
 * @access  Private
 */
const getReviewTrends = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const period = req.query.period || 'day'; // day | week | month

  let dateFormat;
  switch (period) {
    case 'week':
      dateFormat = '%Y-W%V';
      break;
    case 'month':
      dateFormat = '%Y-%m';
      break;
    default:
      dateFormat = '%Y-%m-%d';
  }

  const trends = await CodeReview.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        count: { $sum: 1 },
        avgScore: { $avg: '$review.score' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        count: 1,
        avgScore: { $round: ['$avgScore', 1] },
      },
    },
  ]);

  res.json(formatResponse(true, trends));
});

/**
 * @desc    Get language distribution
 * @route   GET /api/analytics/languages
 * @access  Private
 */
const getLanguageDistribution = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const distribution = await CodeReview.aggregate([
    { $match: { user: userId, status: 'completed' } },
    {
      $group: {
        _id: { $toLower: '$language' },
        count: { $sum: 1 },
        avgScore: { $avg: '$review.score' },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        language: '$_id',
        count: 1,
        avgScore: { $round: ['$avgScore', 1] },
      },
    },
  ]);

  res.json(formatResponse(true, distribution));
});

/**
 * @desc    Get score distribution (histogram)
 * @route   GET /api/analytics/scores
 * @access  Private
 */
const getScoreDistribution = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const distribution = await CodeReview.aggregate([
    { $match: { user: userId, status: 'completed', 'review.score': { $exists: true } } },
    {
      $bucket: {
        groupBy: '$review.score',
        boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 101],
        default: 'Other',
        output: {
          count: { $sum: 1 },
        },
      },
    },
    {
      $project: {
        _id: 0,
        range: {
          $cond: {
            if: { $eq: ['$_id', 'Other'] },
            then: 'Other',
            else: {
              $concat: [
                { $toString: '$_id' },
                '-',
                { $toString: { $subtract: [{ $add: ['$_id', 10] }, 1] } },
              ],
            },
          },
        },
        count: 1,
      },
    },
  ]);

  res.json(formatResponse(true, distribution));
});

/**
 * @desc    Get production readiness statistics
 * @route   GET /api/analytics/production-readiness
 * @access  Private
 */
const getProductionReadinessStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [total, productionReady] = await Promise.all([
    CodeReview.countDocuments({ user: userId, status: 'completed' }),
    CodeReview.countDocuments({
      user: userId,
      status: 'completed',
      'review.productionReadiness.isReady': true,
    }),
  ]);

  const avgReadinessScore = await CodeReview.aggregate([
    {
      $match: {
        user: userId,
        status: 'completed',
        'review.productionReadiness.score': { $exists: true },
      },
    },
    {
      $group: {
        _id: null,
        avgScore: { $avg: '$review.productionReadiness.score' },
      },
    },
  ]);

  res.json(
    formatResponse(true, {
      totalCompleted: total,
      productionReady,
      notProductionReady: total - productionReady,
      productionReadyPercentage: total > 0 ? Math.round((productionReady / total) * 100) : 0,
      avgReadinessScore: avgReadinessScore.length > 0 ? Math.round(avgReadinessScore[0].avgScore) : 0,
    })
  );
});

const getResumeInsights = asyncHandler(async (req, res) => {
  const user = req.user._id;
  const [resumeCount, analysis, recommendationStats, topSkills, trend] = await Promise.all([
    Resume.countDocuments({ user }),
    Resume.aggregate([
      { $match: { user } },
      { $group: { _id: null, analyzed: { $sum: { $cond: [{ $gt: ['$analysis.overallScore', 0] }, 1, 0] } }, avgScore: { $avg: { $cond: [{ $gt: ['$analysis.overallScore', 0] }, '$analysis.overallScore', null] } } } },
    ]),
    Resume.aggregate([
      { $match: { user } },
      { $project: { recommendations: { $cond: [{ $isArray: '$jobRecommendations' }, '$jobRecommendations', []] } } },
      { $unwind: { path: '$recommendations', preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, count: { $sum: { $cond: [{ $ne: ['$recommendations', null] }, 1, 0] } }, avgMatch: { $avg: '$recommendations.matchScore' } } },
    ]),
    Resume.aggregate([
      { $match: { user } }, { $unwind: '$skills' },
      { $group: { _id: { $toLower: '$skills' }, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } }, { $limit: 8 },
      { $project: { _id: 0, skill: '$_id', count: 1 } },
    ]),
    Resume.aggregate([
      { $match: { user } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 }, avgScore: { $avg: { $cond: [{ $gt: ['$analysis.overallScore', 0] }, '$analysis.overallScore', null] } } } },
      { $sort: { _id: 1 } }, { $project: { _id: 0, month: '$_id', count: 1, avgScore: { $round: ['$avgScore', 1] } } },
    ]),
  ]);
  const average = recommendationStats[0]?.avgMatch;
  res.json(formatResponse(true, {
    resumeCount,
    analyzedCount: analysis[0]?.analyzed || 0,
    averageScore: Math.round(analysis[0]?.avgScore || 0),
    recommendationCount: recommendationStats[0]?.count || 0,
    averageMatchScore: Math.round(average || 0),
    topSkills,
    trend,
  }));
});

module.exports = {
  getDashboardStats,
  getReviewTrends,
  getLanguageDistribution,
  getScoreDistribution,
  getProductionReadinessStats,
  getResumeInsights,
};
