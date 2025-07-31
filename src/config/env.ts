import dotenv from 'dotenv'
import { z } from 'zod'

// Cargar variables de entorno
dotenv.config()

// Schema de validación para variables de entorno
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  // Server
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Cloudinary (opcional)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Email (opcional)
  SENDGRID_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // WhatsApp (opcional)
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_ID: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform((val) => parseInt(val, 10)).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val, 10)).default('100'),

  // Security
  BCRYPT_SALT_ROUNDS: z.string().transform((val) => parseInt(val, 10)).default('12'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs'),

  // PayU (opcional)
  PAYU_MERCHANT_ID: z.string().optional(),
  PAYU_ACCOUNT_ID: z.string().optional(),
  PAYU_API_KEY: z.string().optional(),
  PAYU_TEST_MODE: z.string().transform((val) => val === 'true').default('true'),
})

// Validar y exportar configuración
const envVars = envSchema.safeParse(process.env)

if (!envVars.success) {
  console.error('❌ Invalid environment variables:')
  console.error(envVars.error.format())
  process.exit(1)
}

export const env = envVars.data

// Configuraciones derivadas
export const config = {
  // Server
  server: {
    port: env.PORT,
    env: env.NODE_ENV,
    corsOrigin: env.CORS_ORIGIN,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },

  // Database
  database: {
    url: env.DATABASE_URL,
  },

  // JWT
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },

  // Security
  security: {
    bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
    sessionSecret: env.SESSION_SECRET,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },

  // Cloudinary
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    isConfigured: !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
  },

  // Email
  email: {
    apiKey: env.SENDGRID_API_KEY,
    fromEmail: env.FROM_EMAIL,
    isConfigured: !!(env.SENDGRID_API_KEY && env.FROM_EMAIL),
  },

  // WhatsApp
  whatsapp: {
    token: env.WHATSAPP_TOKEN,
    phoneId: env.WHATSAPP_PHONE_ID,
    isConfigured: !!(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID),
  },

  // Logging
  logging: {
    level: env.LOG_LEVEL,
    filePath: env.LOG_FILE_PATH,
  },

  // PayU
  payu: {
    merchantId: env.PAYU_MERCHANT_ID,
    accountId: env.PAYU_ACCOUNT_ID,
    apiKey: env.PAYU_API_KEY,
    testMode: env.PAYU_TEST_MODE,
    isConfigured: !!(env.PAYU_MERCHANT_ID && env.PAYU_ACCOUNT_ID && env.PAYU_API_KEY),
  },
} as const

export default config