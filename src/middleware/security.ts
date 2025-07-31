import { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import { config } from '@/config/env'
import { loggers } from '@/utils/logger'

// Rate limiting middleware
export const createRateLimit = (options?: {
  windowMs?: number
  max?: number
  message?: string
  skipSuccessfulRequests?: boolean
}) => {
  const defaultOptions = {
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      message: 'Demasiadas solicitudes, intenta de nuevo más tarde',
      errors: ['Rate limit exceeded']
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    ...options
  }

  return rateLimit({
    ...defaultOptions,
    handler: (req: Request, res: Response) => {
      loggers.security.rateLimitExceeded(req.ip, req.path)
      res.status(429).json(defaultOptions.message)
    }
  })
}

// Rate limits específicos
export const rateLimits = {
  // Rate limit general para todas las rutas
  general: createRateLimit(),
  
  // Rate limit estricto para autenticación
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos por IP
    message: {
      success: false,
      message: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos',
      errors: ['Authentication rate limit exceeded']
    }
  }),

  // Rate limit para registro
  register: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // 3 registros por IP por hora
    message: {
      success: false,
      message: 'Demasiados registros desde esta IP, intenta de nuevo en 1 hora',
      errors: ['Registration rate limit exceeded']
    }
  }),

  // Rate limit para contacto
  contact: createRateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 3, // 3 mensajes por IP
    message: {
      success: false,
      message: 'Demasiados mensajes de contacto, intenta de nuevo en 10 minutos',
      errors: ['Contact rate limit exceeded']
    }
  }),

  // Rate limit para admin
  admin: createRateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 60, // 60 requests por minuto
    message: {
      success: false,
      message: 'Demasiadas solicitudes administrativas, intenta de nuevo en 1 minuto',
      errors: ['Admin rate limit exceeded']
    }
  }),

  // Rate limit para subida de archivos
  upload: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // 10 uploads por IP
    message: {
      success: false,
      message: 'Demasiadas subidas de archivos, intenta de nuevo en 15 minutos',
      errors: ['Upload rate limit exceeded']
    }
  })
}

// CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (como mobile apps o Postman)
    if (!origin) return callback(null, true)

    const allowedOrigins = config.server.corsOrigin.split(',')
    
    if (allowedOrigins.includes(origin) || config.server.isDevelopment) {
      callback(null, true)
    } else {
      loggers.security.unauthorizedAccess(origin, 'CORS')
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ],
  maxAge: 86400 // 24 hours
}

// Helmet configuration for security headers
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}

// Compression middleware
export const compressionOptions = {
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  },
  threshold: 1024 // Only compress responses larger than 1KB
}

// Security middleware para sanitizar inputs
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    const sanitized: any = {}
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key]
        
        if (typeof value === 'string') {
          // Remover caracteres potencialmente peligrosos
          sanitized[key] = value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim()
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map(item => sanitizeObject(item))
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value)
        } else {
          sanitized[key] = value
        }
      }
    }
    
    return sanitized
  }

  if (req.body) {
    req.body = sanitizeObject(req.body)
  }

  if (req.query) {
    req.query = sanitizeObject(req.query)
  }

  if (req.params) {
    req.params = sanitizeObject(req.params)
  }

  next()
}

// Middleware para detectar actividad sospechosa
export const detectSuspiciousActivity = (req: Request, res: Response, next: NextFunction): void => {
  const suspiciousPatterns = [
    /\b(union|select|insert|delete|drop|create|alter|exec|execute)\b/i, // SQL injection
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
    /javascript:/gi, // XSS
    /(\.\.\/|\.\.\\)/g, // Path traversal
    /\b(eval|setTimeout|setInterval)\s*\(/gi, // Code injection
  ]

  const checkString = (str: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(str))
  }

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkString(obj)
    }
    
    if (Array.isArray(obj)) {
      return obj.some(item => checkObject(item))
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkObject(value))
    }
    
    return false
  }

  let suspicious = false
  const details: any = {}

  // Check URL
  if (checkString(req.url)) {
    suspicious = true
    details.url = req.url
  }

  // Check headers
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string' && checkString(value)) {
      suspicious = true
      details.headers = details.headers || {}
      details.headers[key] = value
    }
  }

  // Check body
  if (req.body && checkObject(req.body)) {
    suspicious = true
    details.body = req.body
  }

  // Check query
  if (req.query && checkObject(req.query)) {
    suspicious = true
    details.query = req.query
  }

  if (suspicious) {
    loggers.security.suspiciousActivity(req.ip, 'Malicious patterns detected', details)
    
    res.status(400).json({
      success: false,
      message: 'Solicitud rechazada por motivos de seguridad',
      errors: ['Request blocked by security filter']
    })
    return
  }

  next()
}

// Middleware para headers de seguridad personalizados
export const customSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Remove server header
  res.removeHeader('X-Powered-By')
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  next()
}