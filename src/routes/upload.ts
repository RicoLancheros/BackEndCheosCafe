import { Router } from 'express'
import {
  uploadSingle,
  uploadMultiple,
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  getImageInfo,
  listImages,
  optimizeImage
} from '@/controllers/uploadController'
import { authenticateToken, requireAdmin } from '@/middleware/auth'
import { rateLimits } from '@/middleware/security'

const router = Router()

// Rutas que requieren autenticación
router.post('/single', authenticateToken, rateLimits.upload, uploadSingle, uploadSingleImage)
router.post('/multiple', authenticateToken, rateLimits.upload, uploadMultiple, uploadMultipleImages)
router.post('/optimize', authenticateToken, rateLimits.upload, uploadSingle, optimizeImage)
router.delete('/:publicId', authenticateToken, deleteImage)
router.delete('/', authenticateToken, deleteMultipleImages)

// Rutas de administración
router.get('/info/:publicId', authenticateToken, requireAdmin, getImageInfo)
router.get('/list', authenticateToken, requireAdmin, listImages)

export default router