import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

for (const key of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  maxFileSizeBytes: (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024,
  largeTransactionThreshold: Number(process.env.LARGE_TRANSACTION_THRESHOLD) || 10000,
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'ExpenseFlow <no-reply@expenseflow.app>',
  },
};
