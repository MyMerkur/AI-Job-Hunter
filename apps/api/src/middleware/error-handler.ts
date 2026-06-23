import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { HttpError } from '../lib/http-error.js';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({ error: 'Not found', path: request.path });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  if (response.headersSent) return;

  const statusCode = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
    ? 413
    : error instanceof HttpError ? error.statusCode
      : typeof error?.statusCode === 'number' ? error.statusCode : 500;
  response.status(statusCode).json({
    error: statusCode === 503 || statusCode < 500 ? error.message : 'Internal server error',
  });
};
