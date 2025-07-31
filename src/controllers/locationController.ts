import { Request, Response } from 'express'
import { prisma } from '@/config/database'
import { asyncHandler } from '@/middleware/error'
import { ApiResponse, PaginationQuery } from '@/types'
import { loggers } from '@/utils/logger'

// Obtener todas las ubicaciones
export const getLocations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    page,
    limit,
    city,
    active = 'true',
    sortBy = 'name',
    sortOrder = 'asc'
  } = req.query as PaginationQuery & {
    city?: string
    active?: string
  }

  const where: any = {}

  if (active !== undefined) {
    where.active = active === 'true'
  }

  if (city) {
    where.city = { contains: city }
  }

  const orderBy: any = {}
  orderBy[sortBy] = sortOrder

  let queryOptions: any = {
    where,
    orderBy
  }

  if (page && limit) {
    const skip = (Number(page) - 1) * Number(limit)
    const take = Number(limit)
    queryOptions.skip = skip
    queryOptions.take = take
  }

  const locations = await prisma.location.findMany(queryOptions)

  let response: ApiResponse

  if (page && limit) {
    const total = await prisma.location.count({ where })
    response = {
      success: true,
      message: 'Ubicaciones obtenidas exitosamente',
      data: {
        locations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    }
  } else {
    response = {
      success: true,
      message: 'Ubicaciones obtenidas exitosamente',
      data: locations
    }
  }

  res.status(200).json(response)
})

// Obtener ubicación por ID
export const getLocationById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const location = await prisma.location.findUnique({
    where: { id }
  })

  if (!location) {
    res.status(404).json({
      success: false,
      message: 'Ubicación no encontrada',
      errors: ['La ubicación no existe']
    })
    return
  }

  const response: ApiResponse = {
    success: true,
    message: 'Ubicación obtenida exitosamente',
    data: location
  }

  res.status(200).json(response)
})

// Obtener ubicación por slug
export const getLocationBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params

  const location = await prisma.location.findUnique({
    where: { slug }
  })

  if (!location) {
    res.status(404).json({
      success: false,
      message: 'Ubicación no encontrada',
      errors: ['La ubicación no existe']
    })
    return
  }

  const response: ApiResponse = {
    success: true,
    message: 'Ubicación obtenida exitosamente',
    data: location
  }

  res.status(200).json(response)
})

// Crear nueva ubicación (solo admin)
export const createLocation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    name,
    slug,
    city,
    department = 'Antioquia',
    address,
    lat,
    lng,
    phone,
    whatsapp,
    hours,
    imageUrl,
    active = true
  } = req.body

  // Verificar que el slug no esté en uso
  const existingLocation = await prisma.location.findUnique({
    where: { slug }
  })

  if (existingLocation) {
    res.status(409).json({
      success: false,
      message: 'Slug duplicado',
      errors: ['Ya existe una ubicación con este slug']
    })
    return
  }

  const location = await prisma.location.create({
    data: {
      name,
      slug,
      city,
      department,
      address,
      lat,
      lng,
      phone,
      whatsapp,
      hours,
      imageUrl,
      active
    }
  })

  // Log de creación
  loggers.admin.locationCreated?.(req.user!.userId, location.id, location.name)

  const response: ApiResponse = {
    success: true,
    message: 'Ubicación creada exitosamente',
    data: location
  }

  res.status(201).json(response)
})

// Actualizar ubicación (solo admin)
export const updateLocation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const updateData = req.body

  // Verificar que la ubicación existe
  const existingLocation = await prisma.location.findUnique({
    where: { id }
  })

  if (!existingLocation) {
    res.status(404).json({
      success: false,
      message: 'Ubicación no encontrada',
      errors: ['La ubicación no existe']
    })
    return
  }

  // Verificar slug único si se actualiza
  if (updateData.slug && updateData.slug !== existingLocation.slug) {
    const duplicateLocation = await prisma.location.findUnique({
      where: { slug: updateData.slug }
    })

    if (duplicateLocation) {
      res.status(409).json({
        success: false,
        message: 'Slug duplicado',
        errors: ['Ya existe una ubicación con este slug']
      })
      return
    }
  }

  const location = await prisma.location.update({
    where: { id },
    data: updateData
  })

  // Log de actualización
  loggers.admin.locationUpdated?.(req.user!.userId, location.id, location.name)

  const response: ApiResponse = {
    success: true,
    message: 'Ubicación actualizada exitosamente',
    data: location
  }

  res.status(200).json(response)
})

// Eliminar ubicación (solo admin)
export const deleteLocation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const location = await prisma.location.findUnique({
    where: { id }
  })

  if (!location) {
    res.status(404).json({
      success: false,
      message: 'Ubicación no encontrada',
      errors: ['La ubicación no existe']
    })
    return
  }

  await prisma.location.delete({
    where: { id }
  })

  // Log de eliminación
  loggers.admin.locationDeleted?.(req.user!.userId, id, location.name)

  const response: ApiResponse = {
    success: true,
    message: 'Ubicación eliminada exitosamente'
  }

  res.status(200).json(response)
})

// Alternar estado activo de ubicación (solo admin)
export const toggleLocationStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const location = await prisma.location.findUnique({
    where: { id }
  })

  if (!location) {
    res.status(404).json({
      success: false,
      message: 'Ubicación no encontrada',
      errors: ['La ubicación no existe']
    })
    return
  }

  const updatedLocation = await prisma.location.update({
    where: { id },
    data: { active: !location.active }
  })

  // Log de cambio de estado
  loggers.admin.locationStatusChanged?.(
    req.user!.userId,
    location.id,
    location.name,
    updatedLocation.active
  )

  const response: ApiResponse = {
    success: true,
    message: `Ubicación ${updatedLocation.active ? 'activada' : 'desactivada'} exitosamente`,
    data: updatedLocation
  }

  res.status(200).json(response)
})

// Obtener ubicaciones por ciudad
export const getLocationsByCity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { city } = req.params

  const locations = await prisma.location.findMany({
    where: {
      city: { contains: city },
      active: true
    },
    orderBy: { name: 'asc' }
  })

  const response: ApiResponse = {
    success: true,
    message: 'Ubicaciones obtenidas exitosamente',
    data: locations
  }

  res.status(200).json(response)
})