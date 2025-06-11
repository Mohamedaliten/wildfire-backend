const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Default error response
  let error = {
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.message = 'Validation failed';
    error.details = err.details;
    return res.status(400).json(error);
  }

  if (err.code === 'ResourceNotFoundException') {
    error.message = 'DynamoDB table not found';
    return res.status(404).json(error);
  }

  if (err.code === 'AccessDeniedException') {
    error.message = 'Access denied to DynamoDB';
    return res.status(403).json(error);
  }

  if (err.code === 'ThrottlingException' || err.code === 'ProvisionedThroughputExceededException') {
    error.message = 'Service temporarily unavailable';
    return res.status(503).json(error);
  }

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    error.details = {
      message: err.message,
      stack: err.stack
    };
  }

  res.status(err.statusCode || 500).json(error);
};

module.exports = errorHandler;