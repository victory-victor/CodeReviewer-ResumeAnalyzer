const User = require('../models/User');
const Resume = require('../models/Resume');
const JobApplication = require('../models/JobApplication');
const { formatResponse, asyncHandler } = require('../utils/helpers');

const preferenceEnums = {
  remotePreference: ['any', 'remote', 'hybrid', 'onsite'],
  seniority: ['any', 'intern', 'junior', 'mid', 'senior', 'lead'],
  currency: ['USD', 'INR', 'EUR', 'GBP'],
};

const getPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('careerPreferences');
  res.json(formatResponse(true, user?.careerPreferences || {}));
});

const updatePreferences = asyncHandler(async (req, res) => {
  const current = req.user.careerPreferences?.toObject?.() || req.user.careerPreferences || {};
  const next = {
    location: typeof req.body.location === 'string' ? req.body.location.trim().slice(0, 100) : current.location || '',
    remotePreference: req.body.remotePreference ?? current.remotePreference ?? 'any',
    seniority: req.body.seniority ?? current.seniority ?? 'any',
    currency: req.body.currency ?? current.currency ?? 'USD',
    salaryMin: req.body.salaryMin === '' || req.body.salaryMin === null ? null : req.body.salaryMin ?? current.salaryMin ?? null,
    salaryMax: req.body.salaryMax === '' || req.body.salaryMax === null ? null : req.body.salaryMax ?? current.salaryMax ?? null,
  };

  for (const [field, values] of Object.entries(preferenceEnums)) {
    if (!values.includes(next[field])) return res.status(400).json(formatResponse(false, null, `Invalid ${field} preference`));
  }
  for (const field of ['salaryMin', 'salaryMax']) {
    if (next[field] !== null) {
      next[field] = Number(next[field]);
      if (!Number.isFinite(next[field]) || next[field] < 0 || next[field] > 1000000000) {
        return res.status(400).json(formatResponse(false, null, 'Salary values must be positive numbers.'));
      }
    }
  }
  if (next.salaryMin !== null && next.salaryMax !== null && next.salaryMin > next.salaryMax) {
    return res.status(400).json(formatResponse(false, null, 'Minimum salary cannot be greater than maximum salary.'));
  }

  const user = await User.findByIdAndUpdate(req.user._id, { $set: { careerPreferences: next } }, { new: true, runValidators: true }).select('careerPreferences');
  res.json(formatResponse(true, user.careerPreferences, 'Career preferences saved'));
});

const getApplications = asyncHandler(async (req, res) => {
  const applications = await JobApplication.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(200);
  res.json(formatResponse(true, applications));
});

const safeUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch (_error) {
    return null;
  }
};

const createApplication = asyncHandler(async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const company = typeof req.body.company === 'string' ? req.body.company.trim() : '';
  if (!title || title.length > 160 || !company || company.length > 160) {
    return res.status(400).json(formatResponse(false, null, 'Job title and company are required (160 characters maximum).'));
  }
  const url = safeUrl(req.body.url);
  if (url === null) return res.status(400).json(formatResponse(false, null, 'Enter a valid http or https job link.'));

  let resume = null;
  if (req.body.resume) {
    resume = await Resume.findOne({ _id: req.body.resume, user: req.user._id }).select('_id');
    if (!resume) return res.status(404).json(formatResponse(false, null, 'Resume not found'));
  }

  const application = await JobApplication.create({
    user: req.user._id,
    resume: resume?._id || null,
    title,
    company,
    url,
    location: String(req.body.location || '').trim().slice(0, 160),
    workMode: ['remote', 'hybrid', 'onsite', 'flexible'].includes(req.body.workMode) ? req.body.workMode : 'flexible',
    matchScore: Number.isFinite(Number(req.body.matchScore)) ? Math.max(0, Math.min(100, Number(req.body.matchScore))) : null,
    stage: 'saved',
    notes: String(req.body.notes || '').slice(0, 4000),
  });
  res.status(201).json(formatResponse(true, application, 'Role saved to your tracker'));
});

const updateApplication = asyncHandler(async (req, res) => {
  const application = await JobApplication.findOne({ _id: req.params.id, user: req.user._id });
  if (!application) return res.status(404).json(formatResponse(false, null, 'Saved role not found'));

  if (req.body.stage !== undefined) {
    if (!['saved', 'applied', 'interview', 'offer', 'rejected'].includes(req.body.stage)) {
      return res.status(400).json(formatResponse(false, null, 'Choose a valid application stage.'));
    }
    application.stage = req.body.stage;
  }
  if (req.body.notes !== undefined) {
    if (typeof req.body.notes !== 'string' || req.body.notes.length > 4000) {
      return res.status(400).json(formatResponse(false, null, 'Notes must be 4,000 characters or fewer.'));
    }
    application.notes = req.body.notes;
  }
  await application.save();
  res.json(formatResponse(true, application, 'Application updated'));
});

const deleteApplication = asyncHandler(async (req, res) => {
  const application = await JobApplication.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!application) return res.status(404).json(formatResponse(false, null, 'Saved role not found'));
  res.json(formatResponse(true, null, 'Saved role removed from your tracker'));
});

module.exports = { getPreferences, updatePreferences, getApplications, createApplication, updateApplication, deleteApplication };
