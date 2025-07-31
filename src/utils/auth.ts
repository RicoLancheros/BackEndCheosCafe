import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { config } from '@/config/env'
import { logger, loggers } from '@/utils/logger'
import { prisma } from '@/config/database'

// Interfaces
export interface TokenPayload {
  userId: string
  email: string
  role: 'customer' | 'admin'
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

// Password utilities
export const passwordUtils = {
  // Hash password
  hash: async (password: string): Promise<string> => {
    try {
      return await bcrypt.hash(password, config.security.bcryptSaltRounds)
    } catch (error) {
      logger.error('Password hashing failed:', error)
      throw new Error('Error al procesar la contraseña')
    }
  },

  // Verify password
  verify: async (password: string, hashedPassword: string): Promise<boolean> => {
    try {
      return await bcrypt.compare(password, hashedPassword)
    } catch (error) {
      logger.error('Password verification failed:', error)
      throw new Error('Error al verificar la contraseña')
    }
  },

  // Validate password strength
  validate: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra minúscula')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra mayúscula')
    }

    if (!/\d/.test(password)) {
      errors.push('La contraseña debe contener al menos un número')
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push('La contraseña debe contener al menos un símbolo (@$!%*?&)')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// JWT utilities
export const jwtUtils = {
  // Generate access token
  generateAccessToken: (payload: Omit<TokenPayload, 'iat' | 'exp'>): string => {
    try {
      return jwt.sign(payload, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessTokenExpiry,
        issuer: 'cheos-cafe-api',
        audience: 'cheos-cafe-app'
      })
    } catch (error) {
      logger.error('Access token generation failed:', error)
      throw new Error('Error al generar token de acceso')
    }
  },

  // Generate refresh token
  generateRefreshToken: (payload: Omit<TokenPayload, 'iat' | 'exp'>): string => {
    try {
      return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshTokenExpiry,
        issuer: 'cheos-cafe-api',
        audience: 'cheos-cafe-app'
      })
    } catch (error) {
      logger.error('Refresh token generation failed:', error)
      throw new Error('Error al generar token de actualización')
    }
  },

  // Generate token pair
  generateTokenPair: (payload: Omit<TokenPayload, 'iat' | 'exp'>): TokenPair => {
    return {
      accessToken: jwtUtils.generateAccessToken(payload),
      refreshToken: jwtUtils.generateRefreshToken(payload)
    }
  },

  // Verify access token
  verifyAccessToken: (token: string): TokenPayload => {
    try {
      return jwt.verify(token, config.jwt.accessSecret, {
        issuer: 'cheos-cafe-api',
        audience: 'cheos-cafe-app'
      }) as TokenPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token de acceso expirado')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Token de acceso inválido')
      }
      logger.error('Access token verification failed:', error)
      throw new Error('Error al verificar token de acceso')
    }
  },

  // Verify refresh token
  verifyRefreshToken: (token: string): TokenPayload => {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'cheos-cafe-api',
        audience: 'cheos-cafe-app'
      }) as TokenPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token de actualización expirado')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Token de actualización inválido')
      }
      logger.error('Refresh token verification failed:', error)
      throw new Error('Error al verificar token de actualización')
    }
  },

  // Extract token from Authorization header
  extractTokenFromHeader: (authHeader: string | undefined): string | null => {
    if (!authHeader) return null
    
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null
    }
    
    return parts[1]
  }
}

// Refresh token database utilities
export const refreshTokenUtils = {
  // Store refresh token in database
  store: async (userId: string, refreshToken: string): Promise<void> => {
    try {
      const decoded = jwtUtils.verifyRefreshToken(refreshToken)
      const expiresAt = new Date(decoded.exp! * 1000)

      // Remove old refresh tokens for this user
      await prisma.refreshToken.deleteMany({
        where: { userId }
      })

      // Store new refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId,
          expiresAt
        }
      })
    } catch (error) {
      logger.error('Refresh token storage failed:', error)
      throw new Error('Error al almacenar token de actualización')
    }
  },

  // Validate refresh token from database
  validate: async (refreshToken: string): Promise<boolean> => {
    try {
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      })

      if (!storedToken) {
        return false
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.refreshToken.delete({
          where: { id: storedToken.id }
        })
        return false
      }

      return true
    } catch (error) {
      logger.error('Refresh token validation failed:', error)
      return false
    }
  },

  // Remove refresh token from database
  remove: async (refreshToken: string): Promise<void> => {
    try {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      })
    } catch (error) {
      logger.error('Refresh token removal failed:', error)
      throw new Error('Error al remover token de actualización')
    }
  },

  // Remove all refresh tokens for a user
  removeAllForUser: async (userId: string): Promise<void> => {
    try {
      await prisma.refreshToken.deleteMany({
        where: { userId }
      })
    } catch (error) {
      logger.error('Refresh token cleanup failed:', error)
      throw new Error('Error al limpiar tokens de actualización')
    }
  },

  // Clean up expired tokens (should be run periodically)
  cleanupExpired: async (): Promise<number> => {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })
      
      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} expired refresh tokens`)
      }
      
      return result.count
    } catch (error) {
      logger.error('Expired refresh token cleanup failed:', error)
      return 0
    }
  }
}

// Authentication service functions
export const authService = {
  // Login user
  login: async (email: string, password: string, ip: string): Promise<{ user: any; tokens: TokenPair }> => {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          preferences: true
        }
      })

      if (!user || !user.isActive) {
        loggers.auth.loginFailed(email, ip, 'User not found or inactive')
        throw new Error('Credenciales inválidas')
      }

      // Verify password
      const isValidPassword = await passwordUtils.verify(password, user.password)
      if (!isValidPassword) {
        loggers.auth.loginFailed(email, ip, 'Invalid password')
        throw new Error('Credenciales inválidas')
      }

      // Generate tokens
      const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        role: user.role
      }

      const tokens = jwtUtils.generateTokenPair(tokenPayload)

      // Store refresh token
      await refreshTokenUtils.store(user.id, tokens.refreshToken)

      // Log successful login
      loggers.auth.login(user.id, user.email, ip)

      // Return user without password
      const { password: _, ...userWithoutPassword } = user

      return {
        user: userWithoutPassword,
        tokens
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      logger.error('Login service error:', error)
      throw new Error('Error en el proceso de autenticación')
    }
  },

  // Refresh tokens
  refresh: async (refreshToken: string): Promise<TokenPair> => {
    try {
      // Verify refresh token
      const decoded = jwtUtils.verifyRefreshToken(refreshToken)

      // Validate token in database
      const isValid = await refreshTokenUtils.validate(refreshToken)
      if (!isValid) {
        throw new Error('Token de actualización inválido')
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (!user || !user.isActive) {
        throw new Error('Usuario no encontrado o inactivo')
      }

      // Generate new tokens
      const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        role: user.role
      }

      const newTokens = jwtUtils.generateTokenPair(tokenPayload)

      // Store new refresh token and remove old one
      await refreshTokenUtils.remove(refreshToken)
      await refreshTokenUtils.store(user.id, newTokens.refreshToken)

      // Log token refresh
      loggers.auth.tokenRefresh(user.id, user.email)

      return newTokens
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      logger.error('Token refresh service error:', error)
      throw new Error('Error al actualizar tokens')
    }
  },

  // Logout user
  logout: async (refreshToken: string): Promise<void> => {
    try {
      // Remove refresh token from database
      await refreshTokenUtils.remove(refreshToken)
    } catch (error) {
      logger.error('Logout service error:', error)
      throw new Error('Error al cerrar sesión')
    }
  }
}