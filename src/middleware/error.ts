import { Request, Response, NextFunction } from 'express'
import { AppError } from '@/types'
import { logger } from '@/utils/logger'
import { config } from '@/config/env'

// Middleware para manejar errores 404
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Ruta ${req.originalUrl} no encontrada`, 404)
  next(error)
}

// Middleware global para manejo de errores
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500
  let message = 'Error interno del servidor'
  let errors: string[] = []

  // Log del error
  logger.error('Global error handler:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId
  })

  // Manejar diferentes tipos de errores
  if (error instanceof AppError) {
    // Errores personalizados de la aplicación
    statusCode = error.statusCode
    message = error.message
    errors = [error.message]
  } else if (error.name === 'ValidationError') {
    // Errores de validación de Mongoose/Prisma
    statusCode = 400
    message = 'Errores de validación'
    errors = extractValidationErrors(error)
  } else if (error.name === 'CastError') {
    // Errores de casting (IDs inválidos)
    statusCode = 400
    message = 'ID de recurso inválido'
    errors = ['Formato de ID inválido']
  } else if (error.name === 'JsonWebTokenError') {
    // Errores de JWT
    statusCode = 401
    message = 'Token inválido'
    errors = ['Token de acceso inválido']
  } else if (error.name === 'TokenExpiredError') {
    // Token expirado
    statusCode = 401
    message = 'Token expirado'
    errors = ['Token de acceso expirado']
  } else if (error.name === 'MulterError') {
    // Errores de subida de archivos
    statusCode = 400
    message = 'Error en la subida de archivos'
    errors = handleMulterError(error)
  } else if (error.message.includes('duplicate key')) {
    // Errores de duplicación en base de datos
    statusCode = 409
    message = 'Recurso duplicado'
    errors = extractDuplicateKeyError(error)
  } else if (error.message.includes('foreign key constraint')) {
    // Errores de restricción de llave foránea
    statusCode = 400
    message = 'Referencia inválida'
    errors = ['El recurso referenciado no existe']
  } else if (error.name === 'PrismaClientKnownRequestError') {
    // Errores conocidos de Prisma
    const result = handlePrismaError(error)
    statusCode = result.statusCode
    message = result.message
    errors = result.errors
  } else if (error.name === 'PrismaClientUnknownRequestError') {
    // Errores desconocidos de Prisma
    statusCode = 500
    message = 'Error de base de datos'
    errors = ['Error interno de base de datos']
  } else if (error.name === 'PrismaClientValidationError') {
    // Errores de validación de Prisma
    statusCode = 400
    message = 'Datos inválidos'
    errors = ['Formato de datos inválido']
  }

  // Respuesta de error
  const errorResponse: any = {
    success: false,
    message,
    errors
  }

  // En desarrollo, incluir stack trace
  if (config.server.isDevelopment) {
    errorResponse.stack = error.stack
    errorResponse.details = {
      name: error.name,
      originalMessage: error.message
    }
  }

  res.status(statusCode).json(errorResponse)
}

// Función para extraer errores de validación
const extractValidationErrors = (error: any): string[] => {
  const errors: string[] = []

  if (error.errors) {
    Object.values(error.errors).forEach((err: any) => {
      errors.push(err.message || err.toString())
    })
  } else {
    errors.push(error.message || 'Error de validación')
  }

  return errors
}

// Función para manejar errores de Multer
const handleMulterError = (error: any): string[] => {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return ['El archivo es demasiado grande']
    case 'LIMIT_FILE_COUNT':
      return ['Demasiados archivos']
    case 'LIMIT_UNEXPECTED_FILE':
      return ['Campo de archivo inesperado']
    case 'LIMIT_FIELD_KEY':
      return ['Nombre de campo demasiado largo']
    case 'LIMIT_FIELD_VALUE':
      return ['Valor de campo demasiado largo']
    case 'LIMIT_FIELD_COUNT':
      return ['Demasiados campos']
    case 'LIMIT_PART_COUNT':
      return ['Demasiadas partes']
    default:
      return ['Error en la subida de archivos']
  }
}

// Función para extraer errores de clave duplicada
const extractDuplicateKeyError = (error: any): string[] => {
  const message = error.message.toLowerCase()
  
  if (message.includes('email')) {
    return ['El email ya está registrado']
  } else if (message.includes('sku')) {
    return ['El SKU ya existe']
  } else if (message.includes('name')) {
    return ['El nombre ya está en uso']
  } else {
    return ['El recurso ya existe']
  }
}

// Función para manejar errores específicos de Prisma
const handlePrismaError = (error: any): { statusCode: number; message: string; errors: string[] } => {
  const code = error.code

  switch (code) {
    case 'P2000':
      return {
        statusCode: 400,
        message: 'Datos demasiado largos',
        errors: ['Uno o más campos exceden la longitud máxima']
      }
    case 'P2001':
      return {
        statusCode: 404,
        message: 'Registro no encontrado',
        errors: ['El registro solicitado no existe']
      }
    case 'P2002':
      return {
        statusCode: 409,
        message: 'Restricción única violada',
        errors: extractUniqueConstraintError(error)
      }
    case 'P2003':
      return {
        statusCode: 400,
        message: 'Restricción de llave foránea violada',
        errors: ['El recurso referenciado no existe']
      }
    case 'P2004':
      return {
        statusCode: 400,
        message: 'Restricción violada',
        errors: ['Los datos no cumplen con las restricciones requeridas']
      }
    case 'P2005':
      return {
        statusCode: 400,
        message: 'Valor de campo inválido',
        errors: ['Uno o más campos tienen valores inválidos']
      }
    case 'P2006':
      return {
        statusCode: 400,
        message: 'Valor proporcionado inválido',
        errors: ['Los datos proporcionados no son válidos']
      }
    case 'P2007':
      return {
        statusCode: 400,
        message: 'Error de validación de datos',
        errors: ['Los datos no pasan la validación']
      }
    case 'P2008':
      return {
        statusCode: 400,
        message: 'Error al parsear la consulta',
        errors: ['Error en el formato de los datos']
      }
    case 'P2009':
      return {
        statusCode: 400,
        message: 'Error de validación de consulta',
        errors: ['La consulta no es válida']
      }
    case 'P2010':
      return {
        statusCode: 500,
        message: 'Error de consulta SQL',
        errors: ['Error interno de base de datos']
      }
    case 'P2011':
      return {
        statusCode: 400,
        message: 'Restricción de nulo violada',
        errors: ['Un campo requerido está vacío']
      }
    case 'P2012':
      return {
        statusCode: 400,
        message: 'Valor requerido faltante',
        errors: ['Faltan valores requeridos']
      }
    case 'P2013':
      return {
        statusCode: 400,
        message: 'Argumento requerido faltante',
        errors: ['Faltan argumentos requeridos para la operación']
      }
    case 'P2014':
      return {
        statusCode: 400,
        message: 'Cambio viola relación requerida',
        errors: ['La operación viola una relación requerida']
      }
    case 'P2015':
      return {
        statusCode: 404,
        message: 'Registro relacionado no encontrado',
        errors: ['Un registro relacionado requerido no fue encontrado']
      }
    case 'P2016':
      return {
        statusCode: 400,
        message: 'Error de interpretación de consulta',
        errors: ['Error en la interpretación de la consulta']
      }
    case 'P2017':
      return {
        statusCode: 400,
        message: 'Registros no conectados',
        errors: ['Los registros para la relación no están conectados']
      }
    case 'P2018':
      return {
        statusCode: 404,
        message: 'Registros conectados requeridos no encontrados',
        errors: ['Los registros conectados requeridos no fueron encontrados']
      }
    case 'P2019':
      return {
        statusCode: 400,
        message: 'Error de entrada',
        errors: ['Error en los datos de entrada']
      }
    case 'P2020':
      return {
        statusCode: 400,
        message: 'Valor fuera de rango',
        errors: ['Un valor está fuera del rango permitido']
      }
    case 'P2021':
      return {
        statusCode: 500,
        message: 'Tabla no existe',
        errors: ['Error de configuración de base de datos']
      }
    case 'P2022':
      return {
        statusCode: 500,
        message: 'Columna no existe',
        errors: ['Error de configuración de base de datos']
      }
    case 'P2025':
      return {
        statusCode: 404,
        message: 'Operación falló',
        errors: ['No se encontraron registros para actualizar o eliminar']
      }
    default:
      return {
        statusCode: 500,
        message: 'Error de base de datos',
        errors: ['Error interno de base de datos']
      }
  }
}

// Función para extraer errores de restricción única
const extractUniqueConstraintError = (error: any): string[] => {
  const target = error.meta?.target

  if (!target) {
    return ['El recurso ya existe']
  }

  if (Array.isArray(target)) {
    const field = target[0]
    return getFieldErrorMessage(field)
  } else {
    return getFieldErrorMessage(target)
  }
}

// Función para obtener mensaje de error por campo
const getFieldErrorMessage = (field: string): string[] => {
  const fieldMessages: { [key: string]: string } = {
    email: 'El email ya está registrado',
    sku: 'El SKU ya existe',
    name: 'El nombre ya está en uso',
    orderNumber: 'El número de orden ya existe',
    token: 'El token ya existe'
  }

  return [fieldMessages[field] || `El campo ${field} ya existe`]
}

// Middleware para capturar errores asíncronos
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}