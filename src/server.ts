import app from '@/app'
import { config } from '@/config/env'
import { prisma } from '@/config/database'
import { logger } from '@/utils/logger'

// Manejar errores no capturados
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason)
  process.exit(1)
})

// Función para iniciar el servidor
const startServer = async (): Promise<void> => {
  try {
    // Verificar conexión a la base de datos
    await prisma.$connect()
    logger.info('✅ Database connected successfully')

    // Iniciar servidor
    const server = app.listen(config.server.port, () => {
      logger.info(`🚀 Server running on port ${config.server.port}`)
      logger.info(`📚 Environment: ${config.server.nodeEnv}`)
      logger.info(`🌐 API available at: http://localhost:${config.server.port}`)
      logger.info(`💾 Database: ${config.database.url.split('@')[1]}`)
    })

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`📴 Received ${signal}. Starting graceful shutdown...`)
      
      server.close(async () => {
        logger.info('HTTP server closed')
        
        try {
          await prisma.$disconnect()
          logger.info('Database disconnected')
          
          logger.info('✨ Graceful shutdown completed')
          process.exit(0)
        } catch (error) {
          logger.error('Error during graceful shutdown:', error)
          process.exit(1)
        }
      })
    }

    // Escuchar señales de cierre
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Iniciar servidor
startServer()