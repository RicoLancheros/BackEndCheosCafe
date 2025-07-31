import { Request, Response, NextFunction } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { z } from 'zod'
import { ValidationError as CustomValidationError } from '@/types'

// Middleware para manejar errores de validación de express-validator
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }))

    res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: validationErrors.map(err => `${err.field}: ${err.message}`)
    })
    return
  }

  next()
}

// Middleware para validación con Zod
export const validateSchema = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body)
      
      if (!result.success) {
        const validationErrors = result.error.errors.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          value: error.code
        }))

        res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errors: validationErrors.map(err => `${err.field}: ${err.message}`)
        })
        return
      }

      // Reemplazar req.body con datos validados
      req.body = result.data
      next()
    } catch (error) {
      next(error)
    }
  }
}

// Esquemas de validación con Zod
export const schemas = {
  // Auth schemas
  login: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Contraseña requerida'),
    rememberMe: z.boolean().optional()
  }),

  register: z.object({
    name: z.string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(50, 'El nombre no puede exceder 50 caracteres'),
    email: z.string().email('Email inválido'),
    phone: z.string()
      .regex(/^(\+57|57)?[0-9]{10}$/, 'Teléfono inválido (formato: 3001234567)')
      .optional(),
    password: z.string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
        'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un símbolo'),
    confirmPassword: z.string().optional(),
    acceptTerms: z.boolean().refine(val => val === true, 'Debes aceptar los términos y condiciones')
  }).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  }),

  refreshToken: z.object({
    refreshToken: z.string().min(1, 'Token de actualización requerido')
  }),

  // Product schemas
  createProduct: z.object({
    name: z.string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres'),
    description: z.string()
      .min(10, 'La descripción debe tener al menos 10 caracteres')
      .max(1000, 'La descripción no puede exceder 1000 caracteres'),
    price: z.number()
      .positive('El precio debe ser positivo')
      .max(1000000, 'El precio no puede exceder $1,000,000'),
    originalPrice: z.number()
      .positive('El precio original debe ser positivo')
      .max(1000000, 'El precio original no puede exceder $1,000,000')
      .optional(),
    weight: z.string()
      .min(1, 'El peso es requerido')
      .max(20, 'El peso no puede exceder 20 caracteres'),
    categoryId: z.string().cuid('ID de categoría inválido'),
    inStock: z.boolean().optional().default(true),
    stockQuantity: z.number()
      .int('La cantidad debe ser un número entero')
      .min(0, 'La cantidad no puede ser negativa')
      .max(10000, 'La cantidad no puede exceder 10,000'),
    roastLevel: z.enum(['claro', 'medio', 'oscuro', 'muy_oscuro'], {
      errorMap: () => ({ message: 'Nivel de tostado inválido' })
    }),
    origin: z.string()
      .min(2, 'El origen debe tener al menos 2 caracteres')
      .max(50, 'El origen no puede exceder 50 caracteres'),
    flavorNotes: z.array(z.string().min(1)).min(1, 'Al menos una nota de sabor es requerida'),
    isRecommended: z.boolean().optional().default(false),
    discount: z.number()
      .int('El descuento debe ser un número entero')
      .min(0, 'El descuento no puede ser negativo')
      .max(90, 'El descuento no puede exceder 90%')
      .optional(),
    sku: z.string().max(50, 'El SKU no puede exceder 50 caracteres').optional()
  }).refine((data) => !data.originalPrice || data.originalPrice > data.price, {
    message: 'El precio original debe ser mayor al precio actual',
    path: ['originalPrice']
  }),

  updateProduct: z.object({
    name: z.string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres')
      .optional(),
    description: z.string()
      .min(10, 'La descripción debe tener al menos 10 caracteres')
      .max(1000, 'La descripción no puede exceder 1000 caracteres')
      .optional(),
    price: z.number()
      .positive('El precio debe ser positivo')
      .max(1000000, 'El precio no puede exceder $1,000,000')
      .optional(),
    originalPrice: z.number()
      .positive('El precio original debe ser positivo')
      .max(1000000, 'El precio original no puede exceder $1,000,000')
      .nullable()
      .optional(),
    weight: z.string()
      .min(1, 'El peso es requerido')
      .max(20, 'El peso no puede exceder 20 caracteres')
      .optional(),
    categoryId: z.string().cuid('ID de categoría inválido').optional(),
    inStock: z.boolean().optional(),
    stockQuantity: z.number()
      .int('La cantidad debe ser un número entero')
      .min(0, 'La cantidad no puede ser negativa')
      .max(10000, 'La cantidad no puede exceder 10,000')
      .optional(),
    roastLevel: z.enum(['claro', 'medio', 'oscuro', 'muy_oscuro'], {
      errorMap: () => ({ message: 'Nivel de tostado inválido' })
    }).optional(),
    origin: z.string()
      .min(2, 'El origen debe tener al menos 2 caracteres')
      .max(50, 'El origen no puede exceder 50 caracteres')
      .optional(),
    flavorNotes: z.array(z.string().min(1)).optional(),
    isRecommended: z.boolean().optional(),
    discount: z.number()
      .int('El descuento debe ser un número entero')
      .min(0, 'El descuento no puede ser negativo')
      .max(90, 'El descuento no puede exceder 90%')
      .nullable()
      .optional(),
    sku: z.string().max(50, 'El SKU no puede exceder 50 caracteres').nullable().optional()
  }),

  // Category schemas
  createCategory: z.object({
    name: z.string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(50, 'El nombre no puede exceder 50 caracteres'),
    description: z.string()
      .min(5, 'La descripción debe tener al menos 5 caracteres')
      .max(200, 'La descripción no puede exceder 200 caracteres'),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.number()
      .int('El orden debe ser un número entero')
      .min(0, 'El orden no puede ser negativo')
      .optional().default(0)
  }),

  updateCategory: z.object({
    name: z.string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(50, 'El nombre no puede exceder 50 caracteres')
      .optional(),
    description: z.string()
      .min(5, 'La descripción debe tener al menos 5 caracteres')
      .max(200, 'La descripción no puede exceder 200 caracteres')
      .optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number()
      .int('El orden debe ser un número entero')
      .min(0, 'El orden no puede ser negativo')
      .optional()
  }),

  // Bulk actions
  bulkAction: z.object({
    type: z.enum(['delete', 'activate', 'deactivate', 'discount'], {
      errorMap: () => ({ message: 'Tipo de acción inválido' })
    }),
    ids: z.array(z.string().cuid('ID inválido')).min(1, 'Al menos un ID es requerido'),
    value: z.number()
      .int('El valor debe ser un número entero')
      .min(0, 'El valor no puede ser negativo')
      .max(90, 'El valor no puede exceder 90')
      .optional()
  }).refine((data) => data.type !== 'discount' || data.value !== undefined, {
    message: 'El valor es requerido para acciones de descuento',
    path: ['value']
  }),

  // Contact schema
  contact: z.object({
    name: z.string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(50, 'El nombre no puede exceder 50 caracteres'),
    email: z.string().email('Email inválido'),
    phone: z.string()
      .regex(/^(\+57|57)?[0-9]{10}$/, 'Teléfono inválido (formato: 3001234567)')
      .optional(),
    subject: z.string()
      .min(5, 'El asunto debe tener al menos 5 caracteres')
      .max(100, 'El asunto no puede exceder 100 caracteres'),
    message: z.string()
      .min(10, 'El mensaje debe tener al menos 10 caracteres')
      .max(1000, 'El mensaje no puede exceder 1000 caracteres')
  }),

  // Newsletter schema
  newsletter: z.object({
    email: z.string().email('Email inválido'),
    name: z.string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(50, 'El nombre no puede exceder 50 caracteres')
      .optional()
  })
}

// Validadores con express-validator (como alternativa)
export const validators = {
  // Auth validators
  login: [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').notEmpty().withMessage('Contraseña requerida'),
    body('rememberMe').optional().isBoolean().withMessage('RememberMe debe ser booleano')
  ],

  register: [
    body('name')
      .isLength({ min: 2, max: 50 })
      .withMessage('El nombre debe tener entre 2 y 50 caracteres')
      .trim(),
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('phone')
      .optional()
      .matches(/^(\+57|57)?[0-9]{10}$/)
      .withMessage('Teléfono inválido (formato: 3001234567)'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un símbolo'),
    body('confirmPassword')
      .optional()
      .custom((value, { req }) => {
        if (value && value !== req.body.password) {
          throw new Error('Las contraseñas no coinciden')
        }
        return true
      }),
    body('acceptTerms')
      .equals('true')
      .withMessage('Debes aceptar los términos y condiciones')
  ],

  // ID validators
  validateId: [
    param('id').isLength({ min: 25, max: 25 }).withMessage('ID inválido')
  ],

  // Pagination validators
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe estar entre 1 y 100'),
    query('sortBy').optional().isString().withMessage('SortBy debe ser una cadena'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('SortOrder debe ser asc o desc')
  ]
}