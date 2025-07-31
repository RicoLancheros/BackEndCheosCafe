import { Router } from 'express'
import {
  getOrders,
  getOrderById,
  createOrder,
  updatePaymentStatus,
  updateDeliveryStatus,
  cancelOrder,
  getOrdersStats
} from '@/controllers/orderController'
import { authenticateToken, requireAdmin } from '@/middleware/auth'
import { validators, handleValidationErrors } from '@/middleware/validation'
import { rateLimits } from '@/middleware/security'

const router = Router()

// Rutas que requieren autenticación
router.get('/', authenticateToken, validators.pagination, handleValidationErrors, getOrders)
router.get('/:id', authenticateToken, validators.validateId, handleValidationErrors, getOrderById)
router.post('/', authenticateToken, rateLimits.general, createOrder)
router.patch('/:id/cancel', authenticateToken, validators.validateId, handleValidationErrors, cancelOrder)

// Rutas de administración (requieren autenticación y rol admin)
router.patch('/:id/payment-status', authenticateToken, requireAdmin, rateLimits.admin, validators.validateId, handleValidationErrors, updatePaymentStatus)
router.patch('/:id/delivery-status', authenticateToken, requireAdmin, rateLimits.admin, validators.validateId, handleValidationErrors, updateDeliveryStatus)
router.get('/admin/stats', authenticateToken, requireAdmin, getOrdersStats)

export default router