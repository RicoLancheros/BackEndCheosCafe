import { Router } from 'express'
import {
  getReviews,
  getReviewsByProduct,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  verifyReview,
  getReviewsStats
} from '@/controllers/reviewController'
import { authenticateToken, requireAdmin } from '@/middleware/auth'
import { validators, handleValidationErrors } from '@/middleware/validation'
import { rateLimits } from '@/middleware/security'

const router = Router()

// Rutas públicas
router.get('/', validators.pagination, handleValidationErrors, getReviews)
router.get('/product/:productId', validators.validateId, validators.pagination, handleValidationErrors, getReviewsByProduct)

// Rutas que requieren autenticación
router.post('/', authenticateToken, rateLimits.general, createReview)
router.put('/:id', authenticateToken, validators.validateId, handleValidationErrors, updateReview)
router.delete('/:id', authenticateToken, validators.validateId, handleValidationErrors, deleteReview)
router.post('/:id/helpful', validators.validateId, handleValidationErrors, markReviewHelpful)

// Rutas de administración (requieren autenticación y rol admin)
router.patch('/:id/verify', authenticateToken, requireAdmin, rateLimits.admin, validators.validateId, handleValidationErrors, verifyReview)
router.get('/admin/stats', authenticateToken, requireAdmin, getReviewsStats)

export default router