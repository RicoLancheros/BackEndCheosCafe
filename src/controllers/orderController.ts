import { Request, Response } from 'express'
import { prisma } from '@/config/database'
import { asyncHandler } from '@/middleware/error'
import { ApiResponse, PaginationQuery } from '@/types'
import { loggers } from '@/utils/logger'

// Obtener todas las órdenes con filtros y paginación
export const getOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    page = 1,
    limit = 10,
    userId,
    paymentStatus,
    deliveryStatus,
    paymentMethod,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query as PaginationQuery & {
    userId?: string
    paymentStatus?: string
    deliveryStatus?: string
    paymentMethod?: string
    startDate?: string
    endDate?: string
  }

  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  const where: any = {}

  // Solo permitir ver órdenes propias si no es admin
  if (req.user?.role !== 'ADMIN') {
    where.userId = req.user?.userId
  } else if (userId) {
    where.userId = userId
  }

  if (paymentStatus) {
    where.paymentStatus = paymentStatus
  }

  if (deliveryStatus) {
    where.deliveryStatus = deliveryStatus
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt.gte = new Date(startDate)
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate)
    }
  }

  const orderBy: any = {}
  orderBy[sortBy] = sortOrder

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                weight: true
              }
            }
          }
        }
      }
    }),
    prisma.order.count({ where })
  ])

  const response: ApiResponse = {
    success: true,
    message: 'Órdenes obtenidas exitosamente',
    data: {
      orders,
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

// Obtener orden por ID
export const getOrderById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const where: any = { id }

  // Solo permitir ver órdenes propias si no es admin
  if (req.user?.role !== 'ADMIN') {
    where.userId = req.user?.userId
  }

  const order = await prisma.order.findUnique({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      },
      items: {
        include: {
          product: true
        }
      }
    }
  })

  if (!order) {
    res.status(404).json({
      success: false,
      message: 'Orden no encontrada',
      errors: ['La orden no existe o no tienes permisos para verla']
    })
    return
  }

  const response: ApiResponse = {
    success: true,
    message: 'Orden obtenida exitosamente',
    data: order
  }

  res.status(200).json(response)
})

// Crear nueva orden
export const createOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    items,
    shippingAddress,
    billingAddress,
    paymentMethod,
    notes,
    discountCode,
    utmSource,
    utmMedium,
    utmCampaign
  } = req.body

  const userId = req.user!.userId

  // Validar productos y calcular totales
  let subtotal = 0
  const orderItems = []

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId }
    })

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Producto no encontrado',
        errors: [`Producto con ID ${item.productId} no existe`]
      })
      return
    }

    if (!product.active) {
      res.status(400).json({
        success: false,
        message: 'Producto no disponible',
        errors: [`El producto ${product.name} no está disponible`]
      })
      return
    }

    if (product.stock < item.quantity) {
      res.status(400).json({
        success: false,
        message: 'Stock insuficiente',
        errors: [`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`]
      })
      return
    }

    const itemTotal = Number(product.price) * item.quantity
    subtotal += itemTotal

    orderItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: product.price,
      total: itemTotal
    })
  }

  // Calcular descuento si hay código
  let discount = 0
  if (discountCode) {
    const discountCodeObj = await prisma.discountCode.findUnique({
      where: { code: discountCode }
    })

    if (discountCodeObj && discountCodeObj.active) {
      const now = new Date()
      if (now >= discountCodeObj.validFrom && now <= discountCodeObj.validUntil) {
        if (!discountCodeObj.maxUses || discountCodeObj.usedCount < discountCodeObj.maxUses) {
          if (!discountCodeObj.minAmount || subtotal >= Number(discountCodeObj.minAmount)) {
            if (discountCodeObj.type === 'PERCENTAGE') {
              discount = subtotal * (Number(discountCodeObj.value) / 100)
            } else {
              discount = Number(discountCodeObj.value)
            }

            if (discountCodeObj.maxDiscount && discount > Number(discountCodeObj.maxDiscount)) {
              discount = Number(discountCodeObj.maxDiscount)
            }
          }
        }
      }
    }
  }

  // Calcular shipping (simplificado - $5000 para todo Colombia)
  const shipping = 5000

  // Calcular tax (19% IVA)
  const tax = (subtotal - discount) * 0.19

  const total = subtotal - discount + shipping + tax

  // Generar número de orden
  const orderNumber = await generateOrderNumber()

  // Crear orden
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      subtotal,
      discount,
      shipping,
      tax,
      total,
      paymentMethod,
      shippingAddress,
      billingAddress,
      notes,
      discountCode,
      utmSource,
      utmMedium,
      utmCampaign,
      items: {
        create: orderItems
      }
    },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  })

  // Actualizar stock de productos
  for (const item of items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        stock: {
          decrement: item.quantity
        }
      }
    })
  }

  // Actualizar contador de código de descuento si se usó
  if (discountCode && discount > 0) {
    await prisma.discountCode.update({
      where: { code: discountCode },
      data: {
        usedCount: { increment: 1 }
      }
    })
  }

  // Log de creación de orden
  loggers.order?.created(req.user!.userId, order.id, order.orderNumber, order.total)

  const response: ApiResponse = {
    success: true,
    message: 'Orden creada exitosamente',
    data: order
  }

  res.status(201).json(response)
})

// Actualizar estado de pago (solo admin)
export const updatePaymentStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { paymentStatus, mercadopagoId, paymentDetails } = req.body

  const order = await prisma.order.findUnique({
    where: { id }
  })

  if (!order) {
    res.status(404).json({
      success: false,
      message: 'Orden no encontrada',
      errors: ['La orden no existe']
    })
    return
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      paymentStatus,
      mercadopagoId,
      paymentDetails
    }
  })

  // Log de actualización
  loggers.admin.orderPaymentUpdated?.(
    req.user!.userId,
    order.id,
    order.orderNumber,
    paymentStatus
  )

  const response: ApiResponse = {
    success: true,
    message: 'Estado de pago actualizado exitosamente',
    data: updatedOrder
  }

  res.status(200).json(response)
})

// Actualizar estado de entrega (solo admin)
export const updateDeliveryStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { deliveryStatus, trackingNumber, estimatedDelivery } = req.body

  const order = await prisma.order.findUnique({
    where: { id }
  })

  if (!order) {
    res.status(404).json({
      success: false,
      message: 'Orden no encontrada',
      errors: ['La orden no existe']
    })
    return
  }

  const updateData: any = { deliveryStatus }

  if (trackingNumber) updateData.trackingNumber = trackingNumber
  if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery)
  if (deliveryStatus === 'DELIVERED') updateData.deliveredAt = new Date()

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: updateData
  })

  // Log de actualización
  loggers.admin.orderDeliveryUpdated?.(
    req.user!.userId,
    order.id,
    order.orderNumber,
    deliveryStatus
  )

  const response: ApiResponse = {
    success: true,
    message: 'Estado de entrega actualizado exitosamente',
    data: updatedOrder
  }

  res.status(200).json(response)
})

// Cancelar orden
export const cancelOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { reason } = req.body

  const where: any = { id }

  // Solo permitir cancelar órdenes propias si no es admin
  if (req.user?.role !== 'ADMIN') {
    where.userId = req.user?.userId
  }

  const order = await prisma.order.findUnique({
    where,
    include: {
      items: true
    }
  })

  if (!order) {
    res.status(404).json({
      success: false,
      message: 'Orden no encontrada',
      errors: ['La orden no existe o no tienes permisos para cancelarla']
    })
    return
  }

  // Verificar que la orden se puede cancelar
  if (order.deliveryStatus === 'DELIVERED' || order.deliveryStatus === 'CANCELLED') {
    res.status(400).json({
      success: false,
      message: 'No se puede cancelar la orden',
      errors: ['La orden ya está entregada o cancelada']
    })
    return
  }

  // Actualizar orden
  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      deliveryStatus: 'CANCELLED',
      notes: reason ? `${order.notes || ''}\nCancelada: ${reason}` : order.notes
    }
  })

  // Restaurar stock de productos
  for (const item of order.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        stock: { increment: item.quantity }
      }
    })
  }

  // Log de cancelación
  loggers.order?.cancelled(req.user!.userId, order.id, order.orderNumber, reason)

  const response: ApiResponse = {
    success: true,
    message: 'Orden cancelada exitosamente',
    data: updatedOrder
  }

  res.status(200).json(response)
})

// Obtener estadísticas de órdenes (solo admin)
export const getOrdersStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const [
    totalOrders,
    pendingOrders,
    approvedOrders,
    deliveredOrders,
    totalRevenue,
    monthlyRevenue
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { paymentStatus: 'PENDING' } }),
    prisma.order.count({ where: { paymentStatus: 'APPROVED' } }),
    prisma.order.count({ where: { deliveryStatus: 'DELIVERED' } }),
    prisma.order.aggregate({
      where: { paymentStatus: 'APPROVED' },
      _sum: { total: true }
    }),
    // Últimos 12 meses de ingresos
    prisma.$queryRaw`
      SELECT 
        YEAR(created_at) as year,
        MONTH(created_at) as month,
        SUM(total) as revenue
      FROM orders 
      WHERE payment_status = 'APPROVED' 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY year DESC, month DESC
      LIMIT 12
    `
  ])

  const response: ApiResponse = {
    success: true,
    message: 'Estadísticas de órdenes obtenidas exitosamente',
    data: {
      totalOrders,
      pendingOrders,
      approvedOrders,
      deliveredOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      monthlyRevenue
    }
  }

  res.status(200).json(response)
})

// Función auxiliar para generar número de orden
async function generateOrderNumber(): Promise<string> {
  let orderNumber: string
  let exists = true

  while (exists) {
    const now = new Date()
    const dateStr = now.getFullYear().toString().slice(-2) + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0')
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    orderNumber = `CHE${dateStr}${randomNum}`

    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber }
    })

    exists = !!existingOrder
  }

  return orderNumber!
}