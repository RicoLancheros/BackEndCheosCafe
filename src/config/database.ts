import { PrismaClient } from '@prisma/client'
import { logger } from '@/utils/logger'

declare global {
  var __prisma: PrismaClient | undefined
}

// Prevenir múltiples instancias de Prisma en desarrollo
const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma
}

// Conectar a la base de datos
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect()
    logger.info('✅ Database connected successfully')
  } catch (error) {
    logger.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

// Desconectar de la base de datos
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect()
    logger.info('✅ Database disconnected successfully')
  } catch (error) {
    logger.error('❌ Database disconnection failed:', error)
  }
}

// Verificar salud de la base de datos
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    logger.error('❌ Database health check failed:', error)
    return false
  }
}

export { prisma }
export default prisma