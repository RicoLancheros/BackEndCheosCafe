import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { config } from '@/config/env'
import { corsOptions, helmetOptions, compressionOptions, rateLimits, sanitizeInput, detectSuspiciousActivity, customSecurityHeaders } from '@/middleware/security'
import { notFoundHandler, globalErrorHandler } from '@/middleware/error'
import { logger } from '@/utils/logger'

// Importar rutas
import authRoutes from '@/routes/auth'
import productRoutes from '@/routes/products'
import locationRoutes from '@/routes/locations'
import orderRoutes from '@/routes/orders'
import reviewRoutes from '@/routes/reviews'
import uploadRoutes from '@/routes/upload'

const app = express()

// Trust proxy (importante para obtener la IP real en producción)
app.set('trust proxy', 1)

// Middleware de seguridad básico
app.use(helmet(helmetOptions))
app.use(customSecurityHeaders)
app.use(compression(compressionOptions))
app.use(cors(corsOptions))

// Rate limiting general
app.use(rateLimits.general)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Security middleware
app.use(sanitizeInput)
app.use(detectSuspiciousActivity)

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId
  })
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    version: '1.0.0'
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/locations', locationRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/upload', uploadRoutes)

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Cheos Café API',
    version: '1.0.0',
    documentation: '/api/docs', // Para futura documentación Swagger
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      locations: '/api/locations',
      orders: '/api/orders',
      reviews: '/api/reviews',
      upload: '/api/upload'
    },
    environment: config.server.nodeEnv
  })
})

// Middleware de manejo de errores
app.use(notFoundHandler)
app.use(globalErrorHandler)

export default app