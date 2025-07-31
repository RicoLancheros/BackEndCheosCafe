import { Request } from 'express'
import { TokenPayload } from '@/utils/auth'

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  errors?: string[]
  pagination?: PaginationInfo
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginationQuery {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Authentication types
export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterRequest {
  name: string
  email: string
  phone?: string
  password: string
  confirmPassword?: string
  acceptTerms?: boolean
}

export interface RefreshTokenRequest {
  refreshToken: string
}

// User types
export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  role: 'customer' | 'admin'
  avatar?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  preferences?: UserPreferences
  addresses?: Address[]
}

export interface UserPreferences {
  notifications: boolean
  newsletter: boolean
  language: string
  paymentMethod: string
}

export interface Address {
  id: string
  street: string
  city: string
  department: string
  zipCode: string
  country: string
  isDefault: boolean
}

// Product types
export interface ProductCreate {
  name: string
  description: string
  price: number
  originalPrice?: number
  weight: string
  categoryId: string
  images?: string[]
  inStock?: boolean
  stockQuantity: number
  roastLevel: 'claro' | 'medio' | 'oscuro' | 'muy_oscuro'
  origin: string
  flavorNotes: string[]
  isRecommended?: boolean
  discount?: number
  sku?: string
}

export interface ProductUpdate extends Partial<ProductCreate> {}

export interface ProductQuery extends PaginationQuery {
  categoryId?: string
  inStock?: boolean
  isRecommended?: boolean
  priceMin?: number
  priceMax?: number
  search?: string
  roastLevel?: string
  origin?: string
}

export interface ProductWithImages {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  weight: string
  categoryId: string
  images: ProductImage[]
  inStock: boolean
  stockQuantity: number
  roastLevel: string
  origin: string
  flavorNotes: string[]
  isRecommended: boolean
  discount?: number
  sku?: string
  createdAt: string
  updatedAt: string
  category: ProductCategory
}

export interface ProductImage {
  id: string
  url: string
  altText?: string
  sortOrder: number
}

// Category types
export interface CategoryCreate {
  name: string
  description: string
  isActive?: boolean
  sortOrder?: number
}

export interface CategoryUpdate extends Partial<CategoryCreate> {}

export interface ProductCategory {
  id: string
  name: string
  description: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  _count?: {
    products: number
  }
}

// Order types
export interface OrderCreate {
  items: OrderItemCreate[]
  shippingAddressId: string
  billingAddressId?: string
  paymentMethod: 'online' | 'cash_on_delivery'
  notes?: string
  couponCode?: string
}

export interface OrderItemCreate {
  productId: string
  quantity: number
}

export interface OrderQuery extends PaginationQuery {
  status?: string
  paymentMethod?: string
  paymentStatus?: string
  userId?: string
  startDate?: string
  endDate?: string
}

export interface OrderWithDetails {
  id: string
  orderNumber: string
  status: string
  paymentMethod: string
  paymentStatus: string
  subtotal: number
  tax: number
  shipping: number
  total: number
  discount?: number
  couponCode?: string
  notes?: string
  trackingNumber?: string
  estimatedDelivery?: string
  deliveredAt?: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
  }
  shippingAddress: Address
  billingAddress?: Address
  items: OrderItemWithProduct[]
  payments: Payment[]
}

export interface OrderItemWithProduct {
  id: string
  quantity: number
  price: number
  total: number
  product: {
    id: string
    name: string
    images: ProductImage[]
    weight: string
  }
}

export interface Payment {
  id: string
  amount: number
  method: string
  status: string
  transactionId?: string
  paymentGateway?: string
  createdAt: string
}

// Admin types
export interface AdminStats {
  totalProducts: number
  totalOrders: number
  totalCustomers: number
  totalRevenue: number
  monthlyRevenue: number[]
  topProducts: ProductWithImages[]
  recentOrders: OrderWithDetails[]
  lowStockProducts: ProductWithImages[]
}

export interface BulkProductAction {
  type: 'delete' | 'activate' | 'deactivate' | 'discount'
  ids: string[]
  value?: number // for discount percentage
}

// Contact types
export interface ContactMessage {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
}

export interface NewsletterSubscription {
  email: string
  name?: string
}

// Store types
export interface StoreLocation {
  id: string
  name: string
  address: string
  city: string
  department: string
  phone: string
  email: string
  hours: any // JSON object
  coordinates: any // JSON object
  image?: string
  isActive: boolean
}

// File upload types
export interface UploadedFile {
  url: string
  publicId: string
  originalName: string
  size: number
  format: string
}

// Validation error types
export interface ValidationError {
  field: string
  message: string
  value?: any
}

// Custom error types
export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  public errors: ValidationError[]

  constructor(message: string, errors: ValidationError[] = []) {
    super(message, 400)
    this.errors = errors
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso') {
    super(`${resource} no encontrado`, 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso denegado') {
    super(message, 403)
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflicto de recursos') {
    super(message, 409)
  }
}