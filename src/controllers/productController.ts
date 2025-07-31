import { Request, Response } from 'express'
import { prisma } from '@/config/database'
import { asyncHandler } from '@/middleware/error'
import { ApiResponse, PaginationQuery } from '@/types'
import { loggers } from '@/utils/logger'

// Obtener todos los productos con filtros y paginación
export const getProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    page = 1,
    limit = 10,
    active,
    roastLevel,
    minPrice,
    maxPrice,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    featured
  } = req.query as PaginationQuery & {
    active?: string
    roastLevel?: string
    minPrice?: string
    maxPrice?: string
    search?: string
    featured?: string
  }

  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  // Construir filtros
  const where: any = {}

  if (active !== undefined) {
    where.active = active === 'true'
  }

  if (roastLevel) {
    where.roastLevel = { contains: roastLevel }
  }

  if (minPrice || maxPrice) {
    where.price = {}
    if (minPrice) where.price.gte = Number(minPrice)
    if (maxPrice) where.price.lte = Number(maxPrice)
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { origin: { contains: search } },
      { notes: { contains: search } }
    ]
  }

  if (featured !== undefined) {
    where.featured = featured === 'true'
  }

  // Construir ordenamiento
  const orderBy: any = {}
  orderBy[sortBy] = sortOrder

  // Obtener productos y contar total
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy
    }),
    prisma.product.count({ where })
  ])

  const response: ApiResponse = {
    success: true,
    message: 'Productos obtenidos exitosamente',
    data: {
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  }

  res.status(200).json(response)
})

// Obtener producto por ID
export const getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    }
  })

  if (!product) {
    res.status(404).json({
      success: false,
      message: 'Producto no encontrado',
      errors: ['El producto no existe']
    })
    return
  }

  const response: ApiResponse = {
    success: true,
    message: 'Producto obtenido exitosamente',
    data: product
  }

  res.status(200).json(response)
})

// Crear nuevo producto (solo admin)
export const createProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    name,
    description,
    price,
    originalPrice,
    weight,
    categoryId,
    inStock = true,
    stockQuantity,
    roastLevel,
    origin,
    flavorNotes,
    isRecommended = false,
    discount,
    sku
  } = req.body

  // Verificar que la categoría existe
  const category = await prisma.category.findUnique({
    where: { id: categoryId }
  })

  if (!category) {
    res.status(404).json({
      success: false,
      message: 'Categoría no encontrada',
      errors: ['La categoría especificada no existe']
    })
    return
  }

  // Verificar SKU único si se proporciona
  if (sku) {
    const existingProduct = await prisma.product.findFirst({
      where: { sku }
    })

    if (existingProduct) {
      res.status(409).json({
        success: false,
        message: 'SKU duplicado',
        errors: ['El SKU ya está en uso']
      })
      return
    }
  }

  const product = await prisma.product.create({
    data: {
      name,
      description,
      price,
      originalPrice,
      weight,
      categoryId,
      inStock,
      stockQuantity,
      roastLevel,
      origin,
      flavorNotes,
      isRecommended,
      discount,
      sku
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    }
  })

  // Log de creación
  loggers.admin.productCreated(req.user!.userId, product.id, product.name)

  const response: ApiResponse = {
    success: true,
    message: 'Producto creado exitosamente',
    data: product
  }

  res.status(201).json(response)
})

// Actualizar producto (solo admin)
export const updateProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const updateData = req.body

  // Verificar que el producto existe
  const existingProduct = await prisma.product.findUnique({
    where: { id }
  })

  if (!existingProduct) {
    res.status(404).json({
      success: false,
      message: 'Producto no encontrado',
      errors: ['El producto no existe']
    })
    return
  }

  // Verificar categoría si se actualiza
  if (updateData.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: updateData.categoryId }
    })

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Categoría no encontrada',
        errors: ['La categoría especificada no existe']
      })
      return
    }
  }

  // Verificar SKU único si se actualiza
  if (updateData.sku && updateData.sku !== existingProduct.sku) {
    const existingProductWithSku = await prisma.product.findFirst({
      where: { 
        sku: updateData.sku,
        id: { not: id }
      }
    })

    if (existingProductWithSku) {
      res.status(409).json({
        success: false,
        message: 'SKU duplicado',
        errors: ['El SKU ya está en uso']
      })
      return
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    }
  })

  // Log de actualización
  loggers.admin.productUpdated(req.user!.userId, product.id, product.name)

  const response: ApiResponse = {
    success: true,
    message: 'Producto actualizado exitosamente',
    data: product
  }

  res.status(200).json(response)
})

// Eliminar producto (solo admin)
export const deleteProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const product = await prisma.product.findUnique({
    where: { id }
  })

  if (!product) {
    res.status(404).json({
      success: false,
      message: 'Producto no encontrado',
      errors: ['El producto no existe']
    })
    return
  }

  await prisma.product.delete({
    where: { id }
  })

  // Log de eliminación
  loggers.admin.productDeleted(req.user!.userId, id, product.name)

  const response: ApiResponse = {
    success: true,
    message: 'Producto eliminado exitosamente'
  }

  res.status(200).json(response)
})

// Acciones en lote (solo admin)
export const bulkActions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type, ids, value } = req.body

  if (!ids || ids.length === 0) {
    res.status(400).json({
      success: false,
      message: 'IDs requeridos',
      errors: ['Debe proporcionar al menos un ID']
    })
    return
  }

  // Verificar que todos los productos existen
  const products = await prisma.product.findMany({
    where: { id: { in: ids } }
  })

  if (products.length !== ids.length) {
    res.status(404).json({
      success: false,
      message: 'Algunos productos no encontrados',
      errors: ['Uno o más productos no existen']
    })
    return
  }

  let updateData: any = {}
  let message = ''

  switch (type) {
    case 'delete':
      await prisma.product.deleteMany({
        where: { id: { in: ids } }
      })
      message = `${ids.length} productos eliminados exitosamente`
      
      // Log de eliminación en lote
      loggers.admin.bulkAction(req.user!.userId, 'delete', 'products', ids)
      break

    case 'activate':
      updateData = { inStock: true }
      message = `${ids.length} productos activados exitosamente`
      break

    case 'deactivate':
      updateData = { inStock: false }
      message = `${ids.length} productos desactivados exitosamente`
      break

    case 'discount':
      if (value === undefined || value < 0 || value > 90) {
        res.status(400).json({
          success: false,
          message: 'Valor de descuento inválido',
          errors: ['El descuento debe estar entre 0 y 90%']
        })
        return
      }
      updateData = { discount: value }
      message = `Descuento del ${value}% aplicado a ${ids.length} productos`
      break

    default:
      res.status(400).json({
        success: false,
        message: 'Tipo de acción inválido',
        errors: ['Tipo de acción no soportado']
      })
      return
  }

  if (type !== 'delete') {
    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: updateData
    })

    // Log de acción en lote
    loggers.admin.bulkAction(req.user!.userId, type, 'products', ids)
  }

  const response: ApiResponse = {
    success: true,
    message,
    data: { affectedCount: ids.length }
  }

  res.status(200).json(response)
})

// Obtener productos recomendados
export const getRecommendedProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { limit = 6 } = req.query

  const products = await prisma.product.findMany({
    where: {
      isRecommended: true,
      inStock: true
    },
    take: Number(limit),
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    }
  })

  const response: ApiResponse = {
    success: true,
    message: 'Productos recomendados obtenidos exitosamente',
    data: products
  }

  res.status(200).json(response)
})

// Obtener productos por categoría
export const getProductsByCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { categoryId } = req.params
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query as PaginationQuery

  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  // Verificar que la categoría existe
  const category = await prisma.category.findUnique({
    where: { id: categoryId }
  })

  if (!category) {
    res.status(404).json({
      success: false,
      message: 'Categoría no encontrada',
      errors: ['La categoría no existe']
    })
    return
  }

  const orderBy: any = {}
  orderBy[sortBy] = sortOrder

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        categoryId,
        inStock: true
      },
      skip,
      take,
      orderBy,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    }),
    prisma.product.count({
      where: {
        categoryId,
        inStock: true
      }
    })
  ])

  const response: ApiResponse = {
    success: true,
    message: 'Productos obtenidos exitosamente',
    data: {
      products,
      category: {
        id: category.id,
        name: category.name,
        description: category.description
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  }

  res.status(200).json(response)
})