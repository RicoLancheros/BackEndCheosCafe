import { Router } from 'express'
import {
  getProducts,
  getProductById
} from '@/controllers/productController'
import { validators, handleValidationErrors } from '@/middleware/validation'

const router = Router()

// Rutas públicas
router.get('/', validators.pagination, handleValidationErrors, getProducts)
router.get('/:id', validators.validateId, handleValidationErrors, getProductById)

export default router