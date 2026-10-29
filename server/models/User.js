const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    emailVerified: { type: Boolean, default: true },
    emailVerificationToken: { type: String, select: false, default: null },
    emailVerificationExpiresAt: { type: Date, select: false, default: null },
    resetPasswordOtp: { type: String, select: false, default: null },
    resetPasswordOtpExpiresAt: { type: Date, select: false, default: null },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Do not return password by default
    },
    avatar: {
      type: String,
      default: '',
    },
    githubId: {
      type: String,
      default: null,
    },
    githubAccessToken: {
      type: String,
      default: null,
      select: false,
    },
    githubUsername: {
      type: String,
      default: null,
    },
    careerPreferences: {
      location: { type: String, trim: true, maxlength: 100, default: '' },
      remotePreference: { type: String, enum: ['any', 'remote', 'hybrid', 'onsite'], default: 'any' },
      seniority: { type: String, enum: ['any', 'intern', 'junior', 'mid', 'senior', 'lead'], default: 'any' },
      salaryMin: { type: Number, min: 0, default: null },
      salaryMax: { type: Number, min: 0, default: null },
      currency: { type: String, enum: ['USD', 'INR', 'EUR', 'GBP'], default: 'USD' },
    },
    reviewRules: {
      securityFocus: { type: String, enum: ['balanced', 'strict'], default: 'strict' },
      styleGuide: { type: String, enum: ['balanced', 'airbnb', 'standard', 'google'], default: 'balanced' },
      framework: { type: String, trim: true, maxlength: 80, default: '' },
      productionReadiness: { type: Boolean, default: true },
      customInstructions: { type: String, maxlength: 2000, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
