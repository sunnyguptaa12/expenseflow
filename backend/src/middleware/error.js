import { ZodError } from 'zod';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.isOperational ? err.message : 'Something went wrong. Please try again.';
  let details = err.details;

  if (err instanceof ZodError) {
    status = 400;
    message = err.issues[0]?.message || 'Validation failed.';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File size exceeds the allowed limit.' : 'File upload failed.';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)[0]?.message || 'Validation failed.';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier supplied.';
  } else if (err.code === 11000) {
    status = 409;
    message = 'A record with these details already exists.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON.';
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message, ...(details && { details }), ...(!env.isProd && status >= 500 && { stack: err.stack }) });
}
