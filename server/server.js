const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { protect } = require('./middleware/auth');
const { asyncHandler, formatResponse } = require('./utils/helpers');
const auth = require('./controllers/authController');
const reviews = require('./controllers/codeReviewController');
const github = require('./controllers/githubController');
const resume = require('./controllers/resumeController');
const analytics = require('./controllers/analyticsController');
const career = require('./controllers/careerController');
const multer = require('multer');
const { body } = require('express-validator');
const fs = require('fs');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
const configuredClientOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => new URL(value).origin);
if (process.env.NODE_ENV === 'production' && configuredClientOrigins.length === 0) {
  throw new Error('CLIENT_URL or CLIENT_URLS must include the deployed frontend origin in production');
}
const allowedClientOrigins = configuredClientOrigins.length ? configuredClientOrigins : ['http://localhost:5173'];
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedClientOrigins.includes(origin)) }));
app.use(express.json({ limit: '12mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok' }));

const validate = (rules) => [...rules, (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(formatResponse(false, null, errors.array()[0].msg));
  next();
}];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, cb) => {
  if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) return cb(new Error('Only PDF files are allowed'));
  cb(null, true);
} });

const signupEmailLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
app.post('/api/auth/signup', signupEmailLimiter, validate([body('name').trim().isLength({ min: 2, max: 50 }), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 })]), auth.register);
app.post('/api/auth/register', signupEmailLimiter, validate([body('name').trim().isLength({ min: 2, max: 50 }), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 })]), auth.register);
app.post('/api/auth/login', validate([body('email').isEmail().normalizeEmail(), body('password').notEmpty()]), auth.login);
const verificationEmailLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
app.post('/api/auth/verify-email', auth.verifyEmail);
app.post('/api/auth/resend-verification', verificationEmailLimiter, validate([body('email').isEmail().normalizeEmail()]), auth.resendVerification);
app.post('/api/auth/forgot-password', verificationEmailLimiter, validate([body('email').isEmail().normalizeEmail()]), auth.forgotPassword);
app.post('/api/auth/reset-password', validate([body('email').isEmail().normalizeEmail(), body('otp').isLength({ min: 6, max: 6 }), body('password').isLength({ min: 8 })]), auth.resetPassword);
app.get('/api/auth/me', protect, auth.getMe);
app.put('/api/auth/profile', protect, auth.updateProfile);
app.delete('/api/auth/account', protect, auth.deleteAccount);

app.post('/api/reviews', protect, validate([body('code').isString().isLength({ min: 1, max: 50000 }), body('language').optional().isString().isLength({ max: 40 }), body('fileName').optional().isString().isLength({ max: 255 })]), reviews.createReview);
app.get('/api/reviews/rules', protect, reviews.getReviewRules);
app.put('/api/reviews/rules', protect, reviews.updateReviewRules);
app.get('/api/reviews', protect, reviews.getReviews);
app.get('/api/reviews/:id', protect, reviews.getReview);
app.delete('/api/reviews/:id', protect, reviews.deleteReview);
app.post('/api/reviews/:id/production-ready', protect, reviews.makeProductionReady);

app.get('/api/github/auth-url', protect, github.getAuthUrl);
app.post('/api/github/callback', protect, github.handleCallback);
app.get('/api/github/repos', protect, github.getRepos);
app.get('/api/github/tree', protect, github.getRepositoryTree);
app.delete('/api/github/path', protect, github.deleteRepositoryPath);
app.get('/api/github/pulls', protect, github.listPullRequests);
app.get('/api/github/branches', protect, github.listRepositoryBranches);
app.post('/api/github/pulls', protect, github.createPullRequest);
app.post('/api/github/pulls/create-from-files', protect, github.createPullRequestFromFiles);
app.get('/api/github/pulls/context', protect, github.getPullRequestContext);
app.post('/api/github/pulls/review', protect, github.reviewPullRequest);
app.post('/api/github/pulls/workflows/dispatch', protect, github.runPullRequestWorkflow);
app.post('/api/github/pulls/apply-fix', protect, github.applyPullRequestFix);
app.post('/api/github/pulls/publish-review', protect, github.publishPullRequestReview);
app.post('/api/github/pulls/close', protect, github.closePullRequest);
app.delete('/api/github/pulls/branch', protect, github.deletePullRequestBranch);
app.post('/api/github/push', protect, github.pushToRepo);
app.post('/api/github/repos', protect, github.createRepo);
app.post('/api/github/create-repo', protect, github.createRepo);
app.post('/api/github/disconnect', protect, github.disconnectGithub);
app.delete('/api/github/disconnect', protect, github.disconnectGithub);

app.post('/api/resume/upload', protect, (req, res, next) => upload.single('resume')(req, res, (err) => err ? next(err) : next()), resume.uploadResume);
app.get('/api/resume', protect, resume.getResumes);
app.get('/api/resume/:id', protect, resume.getResume);
app.get('/api/resume/:id/jobs', protect, resume.getJobRecommendations);
app.get('/api/resume/:id/recommendations', protect, resume.getJobRecommendations);
app.post('/api/resume/:id/role-fit', protect, resume.analyzeRoleFit);
app.delete('/api/resume/:id', protect, resume.deleteResume);

app.get('/api/career/preferences', protect, career.getPreferences);
app.put('/api/career/preferences', protect, career.updatePreferences);
app.get('/api/career/applications', protect, career.getApplications);
app.post('/api/career/applications', protect, career.createApplication);
app.patch('/api/career/applications/:id', protect, career.updateApplication);
app.delete('/api/career/applications/:id', protect, career.deleteApplication);

app.get('/api/analytics/dashboard', protect, analytics.getDashboardStats);
app.get('/api/analytics/trends', protect, analytics.getReviewTrends);
app.get('/api/analytics/languages', protect, analytics.getLanguageDistribution);
app.get('/api/analytics/scores', protect, analytics.getScoreDistribution);
app.get('/api/analytics/production-readiness', protect, analytics.getProductionReadinessStats);
app.get('/api/analytics/resumes', protect, analytics.getResumeInsights);

const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1y', immutable: true, index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}
app.use((req, res) => res.status(404).json(formatResponse(false, null, `Route not found: ${req.method} ${req.path}`)));
app.use(errorHandler);

const port = Number(process.env.PORT) || 5000;
if (require.main === module) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be configured');
  connectDB().then(() => app.listen(port, '0.0.0.0', () => console.log(`API listening on port ${port}`)));
}
module.exports = app;
