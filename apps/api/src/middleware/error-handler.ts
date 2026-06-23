import type { ErrorRequestHandler, RequestHandler } from 'express';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({ error: 'Not found', path: request.path });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  if (response.headersSent) return;

  const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
  response.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal server error' : error.message,
  });
};
