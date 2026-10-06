import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export const isMailConfigured = () => Boolean(env.smtp.host && env.smtp.user);

export async function sendPasswordResetEmail(user, resetUrl) {
  if (!isMailConfigured()) {
    console.log(`[mail disabled] Password reset link for ${user.email}: ${resetUrl}`);
    return;
  }
  const transporter = nodemailer.createTransport({ host: env.smtp.host, port: env.smtp.port, secure: env.smtp.port === 465, auth: { user: env.smtp.user, pass: env.smtp.pass } });
  await transporter.sendMail({
    from: env.smtp.from,
    to: user.email,
    subject: 'Reset your ExpenseFlow password',
    text: `Hi ${user.name},\n\nUse the link below to reset your password. It expires in 30 minutes.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
  });
}
