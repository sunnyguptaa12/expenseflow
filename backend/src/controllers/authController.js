import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/respond.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const signToken = (user, remember = false) => jwt.sign({ id: user._id, tv: user.tokenVersion }, env.jwtSecret, { expiresIn: remember ? '30d' : '1d' });
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists.');
  const user = await User.create({ name, email, password });
  sendSuccess(res, { user, token: signToken(user, true) }, 'Account created successfully.', 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password, remember } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Invalid email or password.');
  sendSuccess(res, { user, token: signToken(user, remember) }, 'Logged in successfully.');
});

export const logout = (_req, res) => sendSuccess(res, null, 'Logged out successfully.');

export const me = (req, res) => sendSuccess(res, { user: req.user });

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  let devResetUrl;
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = sha256(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${env.clientUrl.split(',')[0]}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user, resetUrl);
    if (!env.isProd) devResetUrl = resetUrl;
  }
  // Same response either way so the endpoint cannot be used to discover registered emails.
  sendSuccess(res, devResetUrl ? { devResetUrl } : null, 'If an account exists for that email, a reset link has been sent.');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ resetPasswordToken: sha256(req.body.token), resetPasswordExpires: { $gt: new Date() } }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) throw new ApiError(400, 'This reset link is invalid or has expired.');
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.tokenVersion += 1; // signs out every existing session
  await user.save();
  sendSuccess(res, null, 'Password reset successfully. You can now login.');
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) throw new ApiError(400, 'Current password is incorrect.');
  user.password = req.body.newPassword;
  user.tokenVersion += 1;
  await user.save();
  sendSuccess(res, { token: signToken(user, true) }, 'Password changed successfully.');
});
