const Resume = require('../models/Resume');
const User = require('../models/User');
const resumeService = require('../services/resumeService');
const openaiService = require('../services/openaiService');
const { formatResponse, asyncHandler } = require('../utils/helpers');

/**
 * @desc    Upload and analyze a resume (PDF)
 * @route   POST /api/resume/upload
 * @access  Private
 */
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json(formatResponse(false, null, 'Please upload a PDF file'));
  }

  if (req.file.mimetype !== 'application/pdf') {
    return res.status(400).json(formatResponse(false, null, 'Only PDF files are allowed'));
  }

  // Parse the PDF
  const parsed = await resumeService.parseResume(req.file.buffer);
  const cleanedText = resumeService.cleanResumeText(parsed.text);

  if (!cleanedText || cleanedText.length < 50) {
    return res.status(400).json(formatResponse(false, null, 'Could not extract enough text from the PDF. Please upload a text-based PDF.'));
  }

  // Extract skills locally (fast)
  const extractedSkills = resumeService.extractSkills(cleanedText);

  // Analyze with OpenAI
  let analysis;
  try {
    analysis = await openaiService.analyzeResume(cleanedText);
  } catch (aiError) {
    console.error('Resume analysis AI error:', aiError.message);
    // Still save the resume even if AI analysis fails
    analysis = {
      overallScore: 0,
      suggestions: ['AI analysis failed. Please try analyzing again later.'],
      strengths: [],
      weaknesses: [],
    };
  }

  const resume = await Resume.create({
    user: req.user._id,
    fileName: req.file.originalname,
    fileUrl: '', // In production, upload to cloud storage and store URL
    parsedContent: {
      text: cleanedText,
      numPages: parsed.numPages,
    },
    skills: analysis.skills || extractedSkills,
    experience: analysis.experience || [],
    education: analysis.education || [],
    analysis: {
      overallScore: analysis.overallScore || 0,
      suggestions: analysis.suggestions || [],
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
    },
  });

  res.status(201).json(formatResponse(true, resume, 'Resume uploaded and analyzed successfully'));
});

/**
 * @desc    Get all resumes for the current user
 * @route   GET /api/resume
 * @access  Private
 */
const getResumes = asyncHandler(async (req, res) => {
  const resumes = await Resume.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .select('-parsedContent'); // Exclude large parsed content from list

  res.json(formatResponse(true, resumes));
});

/**
 * @desc    Get a single resume with full analysis
 * @route   GET /api/resume/:id
 * @access  Private
 */
const getResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findById(req.params.id);

  if (!resume) {
    return res.status(404).json(formatResponse(false, null, 'Resume not found'));
  }

  if (resume.user.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, null, 'Not authorized to access this resume'));
  }

  res.json(formatResponse(true, resume));
});

/**
 * @desc    Get job recommendations based on a resume
 * @route   GET /api/resume/:id/recommendations
 * @access  Private
 */
const getJobRecommendations = asyncHandler(async (req, res) => {
  const resume = await Resume.findById(req.params.id);

  if (!resume) {
    return res.status(404).json(formatResponse(false, null, 'Resume not found'));
  }

  if (resume.user.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, null, 'Not authorized'));
  }

  try {
    const owner = await User.findById(req.user._id).select('careerPreferences');
    const preferences = owner?.careerPreferences?.toObject?.() || owner?.careerPreferences || {};
    const recommendations = await openaiService.getJobRecommendations(
      resume.skills,
      resume.experience,
      preferences
    );
    if (!Array.isArray(recommendations)) throw new Error('AI returned an invalid recommendations format');

    const safeRecommendations = recommendations.map((job) => ({
      ...job,
      title: String(job.title || 'Suggested role').slice(0, 160),
      company: String(job.company || 'Company type not specified').slice(0, 160),
      description: String(job.description || '').slice(0, 1000),
      requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills.slice(0, 12).map((skill) => String(skill).slice(0, 100)) : [],
      location: String(job.location || '').slice(0, 160),
      workMode: ['remote', 'hybrid', 'onsite', 'flexible'].includes(String(job.workMode).toLowerCase()) ? String(job.workMode).toLowerCase() : 'flexible',
      seniority: String(job.seniority || '').slice(0, 80),
      salaryRange: String(job.salaryRange || '').slice(0, 100),
      matchScore: Math.max(0, Math.min(100, Number(job.matchScore) || 0)),
      url: '', // AI role ideas are not verified live vacancies.
    }));

    // Save recommendations to the resume document
    resume.jobRecommendations = safeRecommendations;
    await resume.save();

    res.json(formatResponse(true, safeRecommendations, 'Job recommendations generated successfully'));
  } catch (aiError) {
    console.error('Job recommendations AI error:', aiError.message);
    res.status(500).json(formatResponse(false, null, 'Failed to generate job recommendations'));
  }
});

/** Compare an owned resume with a job description supplied by the user. */
const analyzeRoleFit = asyncHandler(async (req, res) => {
  const jobDescription = typeof req.body.jobDescription === 'string' ? req.body.jobDescription.trim() : '';
  if (jobDescription.length < 80 || jobDescription.length > 12000) {
    return res.status(400).json(formatResponse(false, null, 'Paste a job description between 80 and 12,000 characters.'));
  }

  const resume = await Resume.findById(req.params.id).select('+parsedContent');
  if (!resume) return res.status(404).json(formatResponse(false, null, 'Resume not found'));
  if (resume.user.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, null, 'Not authorized to access this resume'));
  }
  const resumeText = resume.parsedContent?.text;
  if (!resumeText) return res.status(400).json(formatResponse(false, null, 'This resume does not contain readable text. Upload it again to compare it with a role.'));

  try {
    const result = await openaiService.analyzeRoleFit(resumeText, jobDescription);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('AI returned an invalid role fit format');
    const listFields = ['matchedSkills', 'missingSkills', 'strengths', 'gaps', 'resumeImprovements', 'interviewFocus'];
    for (const field of listFields) result[field] = Array.isArray(result[field]) ? result[field].slice(0, 8).map((item) => String(item).slice(0, 500)) : [];
    result.matchScore = Math.max(0, Math.min(100, Number(result.matchScore) || 0));
    result.summary = String(result.summary || '').slice(0, 1500);
    res.json(formatResponse(true, result, 'Role fit analysis completed'));
  } catch (aiError) {
    console.error('Role fit analysis AI error:', aiError.message);
    res.status(502).json(formatResponse(false, null, 'Could not compare this role right now. Please try again.'));
  }
});

/**
 * @desc    Delete a resume
 * @route   DELETE /api/resume/:id
 * @access  Private
 */
const deleteResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findById(req.params.id);

  if (!resume) {
    return res.status(404).json(formatResponse(false, null, 'Resume not found'));
  }

  if (resume.user.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, null, 'Not authorized to delete this resume'));
  }

  await resume.deleteOne();

  res.json(formatResponse(true, null, 'Resume deleted successfully'));
});

module.exports = {
  uploadResume,
  getResumes,
  getResume,
  getJobRecommendations,
  analyzeRoleFit,
  deleteResume,
};
