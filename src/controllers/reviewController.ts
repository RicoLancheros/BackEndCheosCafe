import { Request, Response } from 'express'
import { prisma } from '@/config/database'
import { asyncHandler } from '@/middleware/error'
import { ApiResponse, PaginationQuery } from '@/types'
import { loggers } from '@/utils/logger'

// Obtener todas las reseñas con filtros y paginación
export const getReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    page = 1,
    limit = 10,
    productId,
    userId,
    rating,
    verified,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query as PaginationQuery & {
    productId?: string
    userId?: string
    rating?: string
    verified?: string
  }

  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  const where: any = {}

  if (productId) {
    where.productId = productId
  }

  if (userId) {
    where.userId = userId
  }

  if (rating) {
    where.rating = Number(rating)
  }

  if (verified !== undefined) {
    where.verified = verified === 'true'
  }

  const orderBy: any = {}
  orderBy[sortBy] = sortOrder

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    }),
    prisma.review.count({ where })
  ])

  const response: ApiResponse = {
    success: true,
    message: 'Reseñas obtenidas exitosamente',
    data: {
      reviews,
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

// Obtener reseñas por producto
export const getReviewsByProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params
  const {
    page = 1,
    limit = 10,
    rating,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query as PaginationQuery & {
    rating?: string
  }

  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  const where: any = { productId }

  if (rating) {
    where.rating = Number(rating)
  }

  const orderBy: any = {}
  orderBy[sortBy] = sortOrder

  const [reviews, total, averageRating, ratingDistribution] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.review.count({ where: { productId } }),
    prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true }
    }),
    prisma.review.groupBy({
      by: ['rating'],
      where: { productId },
      _count: { rating: true }
    })
  ])

  const response: ApiResponse = {
    success: true,
    message: 'Reseñas del producto obtenidas exitosamente',
    data: {
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      stats: {
        averageRating: averageRating._avg.rating || 0,
        totalReviews: total,
        ratingDistribution: ratingDistribution.reduce((acc, curr) => {
          acc[curr.rating] = curr._count.rating
          return acc
        }, {} as Record<number, number>)
      }
    }
  }

  res.status(200).json(response)
})

// Crear nueva reseña
export const createReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    productId,
    rating,
    title,
    comment,
    images
  } = req.body

  const userId = req.user!.userId

  // Verificar que el producto existe
  const product = await prisma.product.findUnique({
    where: { id: productId }
  })

  if (!product) {
    res.status(404).json({
      success: false,
      message: 'Producto no encontrado',
      errors: ['El producto no existe']
    })
    return
  }

  // Verificar que el usuario no haya reseñado ya este producto
  const existingReview = await prisma.review.findUnique({
    where: {
      userId_productId: {
        userId,
        productId
      }
    }
  })

  if (existingReview) {
    res.status(409).json({
      success: false,
      message: 'Reseña duplicada',
      errors: ['Ya has reseñado este producto']
    })
    return
  }

  // Verificar si el usuario ha comprado el producto
  const hasOrdered = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId,
        paymentStatus: 'APPROVED',
        deliveryStatus: 'DELIVERED'
      }
    }
  })

  const review = await prisma.review.create({
    data: {
      userId,
      productId,
      rating,
      title,
      comment,
      images,
      verified: !!hasOrdered
    },
    include: {
      user: {
        select: {
          id: true,
          name: true
        }
      },
      product: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  // Log de creación
  loggers.review?.created(userId, productId, rating)

  const response: ApiResponse = {
    success: true,
    message: 'Reseña creada exitosamente',
    data: review
  }

  res.status(201).json(response)
})

// Actualizar reseña
export const updateReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { rating, title, comment, images } = req.body

  const userId = req.user!.userId

  // Verificar que la reseña existe y pertenece al usuario
  const existingReview = await prisma.review.findUnique({
    where: { id }
  })

  if (!existingReview) {
    res.status(404).json({
      success: false,
      message: 'Reseña no encontrada',
      errors: ['La reseña no existe']
    })
    return
  }

  if (existingReview.userId !== userId && req.user?.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'No autorizado',
      errors: ['No puedes editar esta reseña']
    })
    return
  }

  const review = await prisma.review.update({
    where: { id },
    data: {
      rating,
      title,
      comment,
      images
    },
    include: {
      user: {
        select: {
          id: true,
          name: true
        }
      },
      product: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  // Log de actualización
  loggers.review?.updated(userId, review.productId, rating)

  const response: ApiResponse = {
    success: true,
    message: 'Reseña actualizada exitosamente',
    data: review
  }

  res.status(200).json(response)
})

// Eliminar reseña
export const deleteReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const userId = req.user!.userId

  // Verificar que la reseña existe y pertenece al usuario
  const review = await prisma.review.findUnique({
    where: { id }
  })

  if (!review) {
    res.status(404).json({
      success: false,
      message: 'Reseña no encontrada',
      errors: ['La reseña no existe']
    })
    return
  }

  if (review.userId !== userId && req.user?.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'No autorizado',
      errors: ['No puedes eliminar esta reseña']
    })
    return
  }

  await prisma.review.delete({
    where: { id }
  })

  // Log de eliminación
  loggers.review?.deleted(userId, review.productId)

  const response: ApiResponse = {
    success: true,
    message: 'Reseña eliminada exitosamente'
  }

  res.status(200).json(response)
})

// Marcar reseña como útil
export const markReviewHelpful = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const review = await prisma.review.findUnique({
    where: { id }
  })

  if (!review) {
    res.status(404).json({
      success: false,
      message: 'Reseña no encontrada',
      errors: ['La reseña no existe']
    })
    return
  }

  const updatedReview = await prisma.review.update({
    where: { id },
    data: {
      helpful: { increment: 1 }
    }
  })

  const response: ApiResponse = {
    success: true,
    message: 'Reseña marcada como útil',
    data: { helpful: updatedReview.helpful }
  }

  res.status(200).json(response)
})

// Verificar reseña (solo admin)
export const verifyReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { verified } = req.body

  const review = await prisma.review.findUnique({
    where: { id }
  })

  if (!review) {
    res.status(404).json({
      success: false,
      message: 'Reseña no encontrada',
      errors: ['La reseña no existe']
    })
    return
  }

  const updatedReview = await prisma.review.update({
    where: { id },
    data: { verified }
  })

  // Log de verificación
  loggers.admin.reviewVerified?.(req.user!.userId, id, verified)

  const response: ApiResponse = {
    success: true,
    message: `Reseña ${verified ? 'verificada' : 'no verificada'} exitosamente`,
    data: updatedReview
  }

  res.status(200).json(response)
})

// Obtener estadísticas de reseñas (solo admin)
export const getReviewsStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const [
    totalReviews,
    verifiedReviews,
    averageRating,
    ratingDistribution,
    recentReviews
  ] = await Promise.all([
    prisma.review.count(),
    prisma.review.count({ where: { verified: true } }),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.review.groupBy({
      by: ['rating'],
      _count: { rating: true }
    }),
    prisma.review.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true
          }
        },
        product: {
          select: {
            name: true
          }
        }
      }
    })
  ])

  const response: ApiResponse = {
    success: true,
    message: 'Estadísticas de reseñas obtenidas exitosamente',
    data: {
      totalReviews,
      verifiedReviews,
      averageRating: averageRating._avg.rating || 0,
      ratingDistribution: ratingDistribution.reduce((acc, curr) => {
        acc[curr.rating] = curr._count.rating
        return acc
      }, {} as Record<number, number>),
      recentReviews
    }
  }

  res.status(200).json(response)
})