import { Request, Response, NextFunction } from 'express'
import { jwtUtils } from '@/utils/auth'
import { prisma } from '@/config/database'
import { UnauthorizedError, ForbiddenError } from '@/types'
import { loggers } from '@/utils/logger'

// Middleware para autenticar token JWT
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = jwtUtils.extractTokenFromHeader(authHeader)

    if (!token) {
      throw new UnauthorizedError('Token de acceso requerido')
    }

    // Verificar token
    const decoded = jwtUtils.verifyAccessToken(token)

    // Verificar que el usuario existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Usuario no encontrado o inactivo')
    }

    // Agregar información del usuario al request
    req.user = decoded

    next()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      loggers.security.unauthorizedAccess(req.ip, req.path)
      res.status(401).json({
        success: false,
        message: error.message,
        errors: ['Token de acceso inválido o expirado']
      })
      return
    }

    next(error)
  }
}

// Middleware para verificar rol de administrador
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Autenticación requerida')
    }

    if (req.user.role !== 'admin') {
      loggers.security.unauthorizedAccess(req.ip, req.path, req.user.userId)
      throw new ForbiddenError('Permisos de administrador requeridos')
    }

    next()
  } catch (error) {
    if (error instanceof ForbiddenError) {
      res.status(403).json({
        success: false,
        message: error.message,
        errors: ['No tienes permisos para acceder a este recurso']
      })
      return
    }

    next(error)
  }
}

// Middleware para verificar que el usuario puede acceder a su propio recurso o es admin
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Autenticación requerida')
      }

      const resourceUserId = req.params[userIdParam] || req.body[userIdParam]
      
      if (req.user.role === 'admin' || req.user.userId === resourceUserId) {
        next()
        return
      }

      loggers.security.unauthorizedAccess(req.ip, req.path, req.user.userId)
      throw new ForbiddenError('No tienes permisos para acceder a este recurso')
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({
          success: false,
          message: error.message,
          errors: ['Acceso denegado']
        })
        return
      }

      next(error)
    }
  }
}

// Middleware opcional de autenticación (no falla si no hay token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = jwtUtils.extractTokenFromHeader(authHeader)

    if (token) {
      const decoded = jwtUtils.verifyAccessToken(token)
      
      // Verificar que el usuario existe y está activo
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (user && user.isActive) {
        req.user = decoded
      }
    }

    next()
  } catch (error) {
    // En autenticación opcional, continuamos aunque falle la verificación
    next()
  }
}