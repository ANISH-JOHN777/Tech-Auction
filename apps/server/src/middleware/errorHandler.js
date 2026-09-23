export function errorHandler(err, req, res, next) {
  console.error('[SERVER ERROR]', err);
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred.';

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
