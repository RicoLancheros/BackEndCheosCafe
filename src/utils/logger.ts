import winston from 'winston'
import path from 'path'
import { config } from '@/config/env'

// Crear directorio de logs si no existe
const logDir = path.resolve(config.logging.filePath)

// Configurar formatos de log
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = ''
    if (Object.keys(meta).length > 0) {
      metaStr = ' ' + JSON.stringify(meta, null, 2)
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`
  })
)

// Crear logger
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'cheos-cafe-backend' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
})

// En desarrollo, también log a la consola
if (config.server.isDevelopment) {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }))
}

// En producción, solo errores en consola
if (config.server.isProduction) {
  logger.add(new winston.transports.Console({
    level: 'error',
    format: consoleFormat,
  }))
}

// Helper functions
export const loggers = {
  // Request logging
  request: (method: string, url: string, statusCode: number, responseTime: number) => {
    const level = statusCode >= 400 ? 'error' : 'info'
    logger.log(level, 'HTTP Request', {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
    })
  },

  // Database logging
  database: {
    query: (query: string, duration: number) => {
      logger.debug('Database Query', { query, duration: `${duration}ms` })
    },
    error: (error: Error, query?: string) => {
      logger.error('Database Error', { error: error.message, stack: error.stack, query })
    },
  },

  // Authentication logging
  auth: {
    login: (userId: string, email: string, ip: string) => {
      logger.info('User Login', { userId, email, ip })
    },
    loginFailed: (email: string, ip: string, reason: string) => {
      logger.warn('Login Failed', { email, ip, reason })
    },
    logout: (userId: string, email: string) => {
      logger.info('User Logout', { userId, email })
    },
    tokenRefresh: (userId: string, email: string) => {
      logger.info('Token Refresh', { userId, email })
    },
  },

  // Admin actions logging
  admin: {
    productCreate: (adminId: string, productName: string) => {
      logger.info('Product Created', { adminId, productName })
    },
    productUpdate: (adminId: string, productId: string, productName: string) => {
      logger.info('Product Updated', { adminId, productId, productName })
    },
    productDelete: (adminId: string, productId: string, productName: string) => {
      logger.warn('Product Deleted', { adminId, productId, productName })
    },
    categoryCreate: (adminId: string, categoryName: string) => {
      logger.info('Category Created', { adminId, categoryName })
    },
    categoryUpdate: (adminId: string, categoryId: string, categoryName: string) => {
      logger.info('Category Updated', { adminId, categoryId, categoryName })
    },
    categoryDelete: (adminId: string, categoryId: string, categoryName: string) => {
      logger.warn('Category Deleted', { adminId, categoryId, categoryName })
    },
  },

  // Security logging
  security: {
    rateLimitExceeded: (ip: string, endpoint: string) => {
      logger.warn('Rate Limit Exceeded', { ip, endpoint })
    },
    unauthorizedAccess: (ip: string, endpoint: string, userId?: string) => {
      logger.warn('Unauthorized Access Attempt', { ip, endpoint, userId })
    },
    suspiciousActivity: (ip: string, activity: string, details?: any) => {
      logger.error('Suspicious Activity', { ip, activity, details })
    },
  },

  // Error logging
  error: (error: Error, context?: any) => {
    logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      context,
    })
  },

  // Performance logging
  performance: {
    slow: (operation: string, duration: number, threshold: number) => {
      logger.warn('Slow Operation', { operation, duration: `${duration}ms`, threshold: `${threshold}ms` })
    },
  },
}

export default logger