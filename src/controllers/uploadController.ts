import { Request, Response } from 'express'
import multer from 'multer'
import { asyncHandler } from '@/middleware/error'
import { ApiResponse } from '@/types'
import { cloudinaryService } from '@/services/cloudinaryService'
import { loggers } from '@/utils/logger'

// Configurar multer para manejar archivos en memoria
const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 5 // Máximo 5 archivos
  },
  fileFilter: (req, file, cb) => {
    // Validar tipos de archivo
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp'
    ]

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes.'))
    }
  }
})

// Middleware para subir una sola imagen
export const uploadSingle = upload.single('image')

// Middleware para subir múltiples imágenes
export const uploadMultiple = upload.array('images', 5)

// Subir una sola imagen
export const uploadSingleImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: 'No se proporcionó ningún archivo',
      errors: ['Se requiere un archivo de imagen']
    })
    return
  }

  try {
    // Validar formato y tamaño
    if (!cloudinaryService.isValidImageFormat(req.file.originalname)) {
      res.status(400).json({
        success: false,
        message: 'Formato de imagen no válido',
        errors: ['Solo se permiten imágenes JPG, PNG, GIF, WebP, BMP']
      })
      return
    }

    if (!cloudinaryService.isValidImageSize(req.file.size)) {
      res.status(400).json({
        success: false,
        message: 'Imagen demasiado grande',
        errors: ['El archivo no puede exceder 10MB']
      })
      return
    }

    // Subir a Cloudinary
    const result = await cloudinaryService.uploadFromBuffer(
      req.file.buffer,
      req.file.originalname,
      {
        folder: 'cheos-cafe/products',
        quality: 'auto:good'
      }
    )

    // Generar URLs de diferentes tamaños
    const imageUrls = cloudinaryService.generateImageUrls(result.public_id)

    // Log de subida
    loggers.upload?.imageUploaded(
      req.user?.userId || 'anonymous',
      result.public_id,
      req.file.originalname,
      result.bytes
    )

    const response: ApiResponse = {
      success: true,
      message: 'Imagen subida exitosamente',
      data: {
        publicId: result.public_id,
        url: result.secure_url,
        urls: imageUrls,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes
      }
    }

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al subir la imagen',
      errors: [error instanceof Error ? error.message : 'Error desconocido']
    })
  }
})

// Subir múltiples imágenes
export const uploadMultipleImages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    res.status(400).json({
      success: false,
      message: 'No se proporcionaron archivos',
      errors: ['Se requiere al menos un archivo de imagen']
    })
    return
  }

  try {
    const uploadPromises = req.files.map(async (file) => {
      // Validar cada archivo
      if (!cloudinaryService.isValidImageFormat(file.originalname)) {
        throw new Error(`Formato no válido para ${file.originalname}`)
      }

      if (!cloudinaryService.isValidImageSize(file.size)) {
        throw new Error(`Archivo demasiado grande: ${file.originalname}`)
      }

      // Subir a Cloudinary
      const result = await cloudinaryService.uploadFromBuffer(
        file.buffer,
        file.originalname,
        {
          folder: 'cheos-cafe/products',
          quality: 'auto:good'
        }
      )

      // Generar URLs de diferentes tamaños
      const imageUrls = cloudinaryService.generateImageUrls(result.public_id)

      return {
        publicId: result.public_id,
        url: result.secure_url,
        urls: imageUrls,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        originalName: file.originalname
      }
    })

    const results = await Promise.all(uploadPromises)

    // Log de subida múltiple
    loggers.upload?.multipleImagesUploaded(
      req.user?.userId || 'anonymous',
      results.length,
      results.reduce((total, result) => total + result.bytes, 0)
    )

    const response: ApiResponse = {
      success: true,
      message: `${results.length} imágenes subidas exitosamente`,
      data: results
    }

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al subir las imágenes',
      errors: [error instanceof Error ? error.message : 'Error desconocido']
    })
  }
})

// Eliminar imagen
export const deleteImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { publicId } = req.params

  if (!publicId) {
    res.status(400).json({
      success: false,
      message: 'ID público requerido',
      errors: ['Se requiere el ID público de la imagen']
    })
    return
  }

  try {
    await cloudinaryService.deleteImage(publicId)

    // Log de eliminación
    loggers.upload?.imageDeleted(req.user?.userId || 'anonymous', publicId)

    const response: ApiResponse = {
      success: true,
      message: 'Imagen eliminada exitosamente'
    }

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la imagen',
      errors: [error instanceof Error ? error.message : 'Error desconocido']
    })
  }
})

// Eliminar múltiples imágenes
export const deleteMultipleImages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { publicIds } = req.body

  if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
    res.status(400).json({
      success: false,
      message: 'IDs públicos requeridos',
      errors: ['Se requiere un array de IDs públicos']
    })
    return
  }

  try {
    await cloudinaryService.deleteImages(publicIds)

    // Log de eliminación múltiple
    loggers.upload?.multipleImagesDeleted(req.user?.userId || 'anonymous', publicIds.length)

    const response: ApiResponse = {
      success: true,
      message: `${publicIds.length} imágenes eliminadas exitosamente`
    }

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar las imágenes',
      errors: [error instanceof Error ? error.message : 'Error desconocido']
    })
  }
})

// Obtener información de imagen
export const getImageInfo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { publicId } = req.params

  if (!publicId) {
    res.status(400).json({
      success: false,
      message: 'ID público requerido',
      errors: ['Se requiere el ID público de la imagen']
    })
    return
  }

  try {
    const imageInfo = await cloudinaryService.getImageInfo(publicId)

    const response: ApiResponse = {
      success: true,
      message: 'Información de imagen obtenida exitosamente',
      data: imageInfo
    }

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener información de la imagen',
      errors: [error instanceof Error ? error.message : 'Error desconocido']
    })
  }
})

// Listar imágenes
export const listImages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { folder = 'cheos-cafe', maxResults = 50 } = req.query

  try {
    const result = await cloudinaryService.listImages(
      folder as string,
      Number(maxResults)
    )

    const response: ApiResponse = {
      success: true,
      message: 'Imágenes listadas exitosamente',
      data: {
        images: result.resources,
        totalCount: result.total_count,
        nextCursor: result.next_cursor
      }
    }

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al listar las imágenes',
      errors: [error instanceof Error ? error.message : 'Error desconocido']
    })
  }
})

// Optimizar imagen para web
export const optimizeImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: 'No se proporcionó ningún archivo',
      errors: ['Se requiere un archivo de imagen']
    })
    return
  }

  const {
    maxWidth = 1200,
    maxHeight = 900,
    quality = 80,
    format = 'auto'
  } = req.body

  try {
    // Validar formato y tamaño
    if (!cloudinaryService.isValidImageFormat(req.file.originalname)) {
      res.status(400).json({
        success: false,
        message: 'Formato de imagen no válido',
        errors: ['Solo se permiten imágenes JPG, PNG, GIF, WebP, BMP']
      })
      return
    }

    if (!cloudinaryService.isValidImageSize(req.file.size)) {
      res.status(400).json({
        success: false,
        message: 'Imagen demasiado grande',
        errors: ['El archivo no puede exceder 10MB']
      })
      return
    }

    // Optimizar y subir
    const result = await cloudinaryService.optimizeForWeb(
      req.file.buffer,
      req.file.originalname,
      {
        maxWidth: Number(maxWidth),
        maxHeight: Number(maxHeight),
        quality: Number(quality),
        format: format as string
      }
    )

    // Generar URLs de diferentes tamaños
    const imageUrls = cloudinaryService.generateImageUrls(result.public_id)

    // Log de optimización
    loggers.upload?.imageOptimized(
      req.user?.userId || 'anonymous',
      result.public_id,
      req.file.originalname,
      req.file.size,
      result.bytes
    )

    const response: ApiResponse = {
      success: true,
      message: 'Imagen optimizada y subida exitosamente',
      data: {
        publicId: result.public_id,
        url: result.secure_url,
        urls: imageUrls,
        format: result.format,
        width: result.width,
        height: result.height,
        originalBytes: req.file.size,
        optimizedBytes: result.bytes,
        compressionRatio: ((req.file.size - result.bytes) / req.file.size * 100).toFixed(2) + '%'
      }
    }

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al optimizar la imagen',
      errors: [error instanceof Error ? error.message : 'Error desconocido']
    })
  }
})