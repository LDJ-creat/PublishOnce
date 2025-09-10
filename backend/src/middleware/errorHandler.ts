import { Request, Response, NextFunction } from 'express';

/**
 * 自定义错误类
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  // 处理自定义错误
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }
  // 处理MongoDB错误
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  }
  // 处理MongoDB重复键错误
  else if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value';
  }
  // 处理JWT错误
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // 记录错误日志
  console.error(`❌ Error ${statusCode}: ${message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack trace:', error.stack);
  }

  // 返回错误响应
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * 异步错误捕获包装器
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};