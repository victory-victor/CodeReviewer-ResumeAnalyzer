const { validationResult } = require('express-validator');
const User = require('../models/User');
const CodeReview = require('../models/CodeReview');
const Resume = require('../models/Resume');
const JobApplication = require('../models/JobApplication');
const crypto = require('crypto');
const { sendWelcomeVerificationEmail, sendPasswordResetOtpEmail } = require('../services/emailService');
const { generateToken, formatResponse, asyncHandler } = require('../utils/helpers');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(formatResponse(false, null, errors.array()[0].msg));
  }

  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json(formatResponse(false, null, 'User already exists with this email'));
  }

  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    emailVerified: false,
    emailVerificationToken: crypto.createHash('sha256').update(rawVerificationToken).digest('hex'),
    emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  let emailSent = true;
  try {
    await sendWelcomeVerificationEmail({ name: user.name, email: user.email, token: rawVerificationToken });
  } catch (error) {
    emailSent = false;
    console.error(`[EMAIL] Verification email could not be sent (${error.status || 'configuration'}): ${error.providerMessage || error.message}`);
  }

  res.status(201).json(
    formatResponse(true, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      verificationRequired: true,
      emailSent,
    }, emailSent ? 'Account created. Check your email to verify your address.' : 'Account created, but the verification email could not be sent. Check your email configuration or try resending it.')
  );
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(formatResponse(false, null, errors.array()[0].msg));
  }

  const { email, password } = req.body;

  // Find user and explicitly include the password field
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) {
    return res.status(401).json(formatResponse(false, null, 'Invalid credentials'));
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json(formatResponse(false, null, 'Invalid credentials'));
  }

  if (!user.emailVerified) {
    return res.status(403).json(formatResponse(false, null, 'Please verify your email before signing in. Check your inbox or resend the verification email.'));
  }

  const token = generateToken(user._id);

  res.json(
    formatResponse(true, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        githubUsername: user.githubUsername,
      },
      token,
    }, 'Login successful')
  );
});

const verifyEmail = asyncHandler(async (req, res) => {
  const token = typeof req.body.token === 'string' ? req.body.token : '';
  if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json(formatResponse(false, null, 'This verification link is invalid. Request a new email to continue.'));
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiresAt: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpiresAt');
  if (!user) return res.status(400).json(formatResponse(false, null, 'This verification link has expired or was already used. Request a new email to continue.'));
  user.emailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpiresAt = null;
  await user.save();
  res.json(formatResponse(true, { email: user.email }, 'Email verified. You can now sign in.'));
});

const resendVerification = asyncHandler(async (req, res) => {
  const normalizedEmail = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
  const genericMessage = 'If an unverified account exists for that email, a verification message will be sent.';
  const user = await User.findOne({ email: normalizedEmail });
  if (user && !user.emailVerified) {
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    try {
      await sendWelcomeVerificationEmail({ name: user.name, email: user.email, token: rawVerificationToken });
    } catch (error) {
      console.error(`[EMAIL] Verification resend failed (${error.status || 'configuration'}): ${error.providerMessage || error.message}`);
    }
  }
  res.json(formatResponse(true, null, genericMessage));
});

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.json(
    formatResponse(true, {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      githubUsername: user.githubUsername,
      createdAt: user.createdAt,
    }, 'Current user loaded')
  );
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, avatar } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name;
  if (email) {
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== req.user.email && await User.exists({ email: normalizedEmail, _id: { $ne: req.user._id } })) {
      return res.status(400).json(formatResponse(false, null, 'User already exists with this email'));
    }
    updateFields.email = normalizedEmail;
  }
  if (avatar !== undefined) updateFields.avatar = avatar;

  const user = await User.findByIdAndUpdate(req.user._id, updateFields, {
    new: true,
    runValidators: true,
  });

  res.json(
    formatResponse(true, {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    }, 'Profile updated successfully')
  );
});

/** Permanently remove the authenticated account and its application data. */
/**
 * @desc    Request Password Reset OTP
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const normalizedEmail = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
  if (!normalizedEmail) {
    return res.status(400).json(formatResponse(false, null, 'Please provide an email address'));
  }

  const user = await User.findOne({ email: normalizedEmail });
  // Always return success message to prevent user enumeration
  const genericMessage = 'If an account exists with that email, a 6-digit verification code has been sent.';

  if (!user) {
    return res.json(formatResponse(true, { email: normalizedEmail }, genericMessage));
  }

  // Generate 6-digit numeric OTP
  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');

  user.resetPasswordOtp = hashedOtp;
  user.resetPasswordOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save();

  try {
    await sendPasswordResetOtpEmail({ name: user.name, email: user.email, otp: rawOtp });
  } catch (error) {
    console.error(`[EMAIL] Failed to send password reset OTP: ${error.providerMessage || error.message}`);
    return res.status(500).json(formatResponse(false, null, 'Could not send verification email. Please try again later.'));
  }

  res.json(formatResponse(true, { email: user.email }, genericMessage));
});

/**
 * @desc    Verify OTP and Reset Password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const normalizedEmail = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
  const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
  const newPassword = typeof req.body.password === 'string' ? req.body.password : '';

  if (!normalizedEmail || !otp || !newPassword) {
    return res.status(400).json(formatResponse(false, null, 'Email, verification code, and new password are required'));
  }

  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    return res.status(400).json(formatResponse(false, null, 'Verification code must be 6 digits'));
  }

  if (newPassword.length < 8) {
    return res.status(400).json(formatResponse(false, null, 'Password must be at least 8 characters long'));
  }

  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
  const user = await User.findOne({
    email: normalizedEmail,
    resetPasswordOtp: hashedOtp,
    resetPasswordOtpExpiresAt: { $gt: new Date() },
  }).select('+resetPasswordOtp +resetPasswordOtpExpiresAt');

  if (!user) {
    return res.status(400).json(formatResponse(false, null, 'Invalid or expired verification code. Please request a new one.'));
  }

  // Update password and clear OTP
  user.password = newPassword;
  user.resetPasswordOtp = null;
  user.resetPasswordOtpExpiresAt = null;
  // Also verify user's email if it wasn't verified already
  user.emailVerified = true;
  await user.save();

  res.json(formatResponse(true, null, 'Password has been reset successfully. You can now sign in.'));
});

const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await Promise.all([
    CodeReview.deleteMany({ user: userId }),
    Resume.deleteMany({ user: userId }),
    JobApplication.deleteMany({ user: userId }),
  ]);
  await User.findByIdAndDelete(userId);
  res.json(formatResponse(true, null, 'Account and associated data deleted successfully'));
});

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  deleteAccount,
};
