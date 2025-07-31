import { Request, Response } from 'express'
import { prisma } from '@/config/database'
import { authService, passwordUtils, refreshTokenUtils } from '@/utils/auth'
import { asyncHandler } from '@/middleware/error'
import { ApiResponse, LoginRequest, RegisterRequest, RefreshTokenRequest } from '@/types'
import { loggers } from '@/utils/logger'

// Registro de usuario
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone, password }: RegisterRequest = req.body
  const ip = req.ip

  // Verificar si el usuario ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    res.status(409).json({
      success: false,
      message: 'El usuario ya existe',
      errors: ['El email ya está registrado']
    })
    return
  }

  // Hash de la contraseña
  const hashedPassword = await passwordUtils.hash(password)

  // Crear usuario
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'customer',
      preferences: {
        create: {
          notifications: true,
          newsletter: true,
          language: 'es',
          paymentMethod: 'online'
        }
      }
    },
    include: {
      preferences: true
    }
  })

  // Generar tokens
  const tokens = await authService.login(email, password, ip)

  // Log del registro
  loggers.auth.login(user.id, user.email, ip)

  // Remover contraseña de la respuesta
  const { password: _, ...userWithoutPassword } = user

  const response: ApiResponse = {
    success: true,
    message: 'Usuario registrado exitosamente',
    data: {
      user: userWithoutPassword,
      tokens: tokens.tokens
    }
  }

  res.status(201).json(response)
})

// Login de usuario
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password }: LoginRequest = req.body
  const ip = req.ip

  try {
    const result = await authService.login(email, password, ip)

    const response: ApiResponse = {
      success: true,
      message: 'Login exitoso',
      data: result
    }

    res.status(200).json(response)
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Credenciales inválidas',
      errors: [error instanceof Error ? error.message : 'Error de autenticación']
    })
  }
})

// Refresh token
export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken }: RefreshTokenRequest = req.body

  try {
    const tokens = await authService.refresh(refreshToken)

    const response: ApiResponse = {
      success: true,
      message: 'Tokens actualizados exitosamente',
      data: tokens
    }

    res.status(200).json(response)
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token de actualización inválido',
      errors: [error instanceof Error ? error.message : 'Error al actualizar tokens']
    })
  }
})

// Logout
export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken }: RefreshTokenRequest = req.body

  try {
    await authService.logout(refreshToken)

    // Log del logout
    if (req.user) {
      loggers.auth.logout(req.user.userId, req.user.email)
    }

    const response: ApiResponse = {
      success: true,
      message: 'Logout exitoso'
    }

    res.status(200).json(response)
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al cerrar sesión',
      errors: [error instanceof Error ? error.message : 'Error de logout']
    })
  }
})

// Obtener perfil del usuario
export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preferences: true,
      addresses: true
    }
  })

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'Usuario no encontrado',
      errors: ['Usuario no existe']
    })
    return
  }

  // Remover contraseña de la respuesta
  const { password: _, ...userWithoutPassword } = user

  const response: ApiResponse = {
    success: true,
    message: 'Perfil obtenido exitosamente',
    data: userWithoutPassword
  }

  res.status(200).json(response)
})

// Actualizar perfil del usuario
export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { name, phone, preferences } = req.body

  const updateData: any = {}
  
  if (name) updateData.name = name
  if (phone) updateData.phone = phone

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    include: {
      preferences: true,
      addresses: true
    }
  })

  // Actualizar preferencias si se proporcionan
  if (preferences) {
    await prisma.userPreferences.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences
      }
    })
  }

  // Obtener usuario actualizado
  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preferences: true,
      addresses: true
    }
  })

  // Remover contraseña de la respuesta
  const { password: _, ...userWithoutPassword } = updatedUser!

  const response: ApiResponse = {
    success: true,
    message: 'Perfil actualizado exitosamente',
    data: userWithoutPassword
  }

  res.status(200).json(response)
})

// Cambiar contraseña
export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { currentPassword, newPassword } = req.body

  // Obtener usuario actual
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'Usuario no encontrado',
      errors: ['Usuario no existe']
    })
    return
  }

  // Verificar contraseña actual
  const isValidPassword = await passwordUtils.verify(currentPassword, user.password)
  if (!isValidPassword) {
    res.status(400).json({
      success: false,
      message: 'Contraseña actual incorrecta',
      errors: ['La contraseña actual no es válida']
    })
    return
  }

  // Validar nueva contraseña
  const passwordValidation = passwordUtils.validate(newPassword)
  if (!passwordValidation.isValid) {
    res.status(400).json({
      success: false,
      message: 'Nueva contraseña no válida',
      errors: passwordValidation.errors
    })
    return
  }

  // Hash de la nueva contraseña
  const hashedNewPassword = await passwordUtils.hash(newPassword)

  // Actualizar contraseña
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword }
  })

  // Eliminar todos los refresh tokens del usuario (forzar re-login)
  await refreshTokenUtils.removeAllForUser(userId)

  const response: ApiResponse = {
    success: true,
    message: 'Contraseña actualizada exitosamente'
  }

  res.status(200).json(response)
})

// Verificar estado de autenticación
export const verifyAuth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const response: ApiResponse = {
    success: true,
    message: 'Usuario autenticado',
    data: {
      user: req.user,
      isAuthenticated: true
    }
  }

  res.status(200).json(response)
})