import { Router } from 'express'
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  verifyAuth
} from '@/controllers/authController'
import { authenticateToken } from '@/middleware/auth'
import { validateSchema, schemas } from '@/middleware/validation'
import { rateLimits } from '@/middleware/security'

const router = Router()

// Rutas públicas
router.post('/register', rateLimits.register, validateSchema(schemas.register), register)
router.post('/login', rateLimits.auth, validateSchema(schemas.login), login)
router.post('/refresh', validateSchema(schemas.refreshToken), refreshToken)
router.post('/logout', validateSchema(schemas.refreshToken), logout)

// Rutas protegidas
router.get('/profile', authenticateToken, getProfile)
router.put('/profile', authenticateToken, updateProfile)
router.put('/change-password', authenticateToken, changePassword)
router.get('/verify', authenticateToken, verifyAuth)

export default router