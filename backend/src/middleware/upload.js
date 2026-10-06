import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { ALLOWED_RECEIPT_MIME } from '../utils/constants.js';

export const userDir = (userId) => path.join(env.uploadDir, String(userId));

const diskStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = userDir(req.user._id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED_RECEIPT_MIME[file.mimetype]}`),
});

const receiptFilter = (_req, file, cb) =>
  ALLOWED_RECEIPT_MIME[file.mimetype] ? cb(null, true) : cb(new ApiError(415, 'Unsupported file type. Upload a PDF, JPG, PNG or WebP file.'));

export const receiptUpload = multer({ storage: diskStorage, fileFilter: receiptFilter, limits: { fileSize: env.maxFileSizeBytes, files: 1 } }).single('file');

const avatarFilter = (_req, file, cb) =>
  ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ? cb(null, true) : cb(new ApiError(415, 'Profile image must be a JPG, PNG or WebP file.'));
export const avatarUpload = multer({ storage: diskStorage, fileFilter: avatarFilter, limits: { fileSize: 2 * 1024 * 1024, files: 1 } }).single('file');

const csvFilter = (_req, file, cb) => {
  const looksLikeCsv = /\.csv$/i.test(file.originalname) || ['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.mimetype);
  looksLikeCsv ? cb(null, true) : cb(new ApiError(415, 'CSV format is invalid. Upload a .csv file.'));
};
export const csvUpload = multer({ storage: multer.memoryStorage(), fileFilter: csvFilter, limits: { fileSize: 2 * 1024 * 1024, files: 1 } }).single('file');

// Verifies magic bytes so a renamed executable cannot pass as a receipt.
export function hasValidSignature(filePath, mimeType) {
  const head = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, head, 0, 12, 0);
  fs.closeSync(fd);
  if (mimeType === 'application/pdf') return head.subarray(0, 4).toString() === '%PDF';
  if (mimeType === 'image/png') return head.subarray(1, 4).toString() === 'PNG';
  if (mimeType === 'image/jpeg') return head[0] === 0xff && head[1] === 0xd8;
  if (mimeType === 'image/webp') return head.subarray(0, 4).toString() === 'RIFF' && head.subarray(8, 12).toString() === 'WEBP';
  return false;
}
