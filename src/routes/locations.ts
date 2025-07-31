import { Router } from 'express'
import {
  getLocations,
  getLocationById,
  getLocationBySlug,
  createLocation,
  updateLocation,
  deleteLocation,
  toggleLocationStatus,
  getLocationsByCity
} from '@/controllers/locationController'
import { authenticateToken, requireAdmin } from '@/middleware/auth'
import { validators, handleValidationErrors } from '@/middleware/validation'
import { rateLimits } from '@/middleware/security'

const router = Router()

// Rutas públicas
router.get('/', validators.pagination, handleValidationErrors, getLocations)
router.get('/city/:city', getLocationsByCity)
router.get('/slug/:slug', getLocationBySlug)
router.get('/:id', validators.validateId, handleValidationErrors, getLocationById)

// Rutas de administración (requieren autenticación y rol admin)
router.post('/', authenticateToken, requireAdmin, rateLimits.admin, createLocation)
router.put('/:id', authenticateToken, requireAdmin, rateLimits.admin, validators.validateId, handleValidationErrors, updateLocation)
router.delete('/:id', authenticateToken, requireAdmin, rateLimits.admin, validators.validateId, handleValidationErrors, deleteLocation)
router.patch('/:id/toggle-status', authenticateToken, requireAdmin, rateLimits.admin, validators.validateId, handleValidationErrors, toggleLocationStatus)

export default router