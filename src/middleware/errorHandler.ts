import { Request, Response, NextFunction } from 'express';

// Clase de error personalizado
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware para errores de Prisma
export const handlePrismaError = (error: any) => {
  if (error.code === 'P2002') {
    return new AppError('Ya existe un registro con esos datos únicos', 400);
  }
  
  if (error.code === 'P2025') {
    return new AppError('Registro no encontrado', 404);
  }
  
  if (error.code === 'P2003') {
    return new AppError('Referencia a registro que no existe', 400);
  }
  
  return new AppError('Error de base de datos', 500);
};

// Middleware global de manejo de errores
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('❌ Error:', err);

  // Error de Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    const appError = handlePrismaError(err);
    return res.status(appError.statusCode).json({
      error: appError.message,
      timestamp: new Date().toISOString()
    });
  }

  // Error de validación de Prisma
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      error: 'Datos inválidos',
      timestamp: new Date().toISOString()
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
      timestamp: new Date().toISOString()
    });
  }

  // Error personalizado
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Error genérico
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware para rutas no encontradas
export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
    timestamp: new Date().toISOString()
  });
};

// Wrapper para async functions (evita try-catch repetitivos)
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};