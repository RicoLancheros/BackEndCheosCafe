import { v2 as cloudinary } from 'cloudinary'
import { config } from '@/config/env'
import { logger } from '@/utils/logger'

// Configurar Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
})

export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  width: number
  height: number
  format: string
  resource_type: string
  bytes: number
}

export interface UploadOptions {
  folder?: string
  transformation?: any[]
  eager?: any[]
  quality?: string | number
  fetch_format?: string
}

class CloudinaryService {
  // Subir imagen desde buffer
  async uploadFromBuffer(
    buffer: Buffer,
    originalName: string,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      const uploadOptions = {
        folder: options.folder || 'cheos-cafe',
        public_id: this.generatePublicId(originalName),
        quality: options.quality || 'auto:good',
        fetch_format: options.fetch_format || 'auto',
        transformation: options.transformation || [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ],
        eager: options.eager || [
          { width: 300, height: 300, crop: 'thumb', gravity: 'face' },
          { width: 150, height: 150, crop: 'thumb', gravity: 'face' }
        ]
      }

      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload error:', error)
              reject(error)
            } else {
              resolve(result as CloudinaryUploadResult)
            }
          }
        )
        uploadStream.end(buffer)
      })

      logger.info('Image uploaded to Cloudinary:', {
        public_id: result.public_id,
        secure_url: result.secure_url,
        bytes: result.bytes
      })

      return result
    } catch (error) {
      logger.error('Failed to upload image to Cloudinary:', error)
      throw new Error('Error al subir la imagen')
    }
  }

  // Subir imagen desde URL
  async uploadFromUrl(
    url: string,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      const uploadOptions = {
        folder: options.folder || 'cheos-cafe',
        quality: options.quality || 'auto:good',
        fetch_format: options.fetch_format || 'auto',
        transformation: options.transformation || [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ],
        eager: options.eager || [
          { width: 300, height: 300, crop: 'thumb', gravity: 'face' },
          { width: 150, height: 150, crop: 'thumb', gravity: 'face' }
        ]
      }

      const result = await cloudinary.uploader.upload(url, uploadOptions)

      logger.info('Image uploaded from URL to Cloudinary:', {
        public_id: result.public_id,
        secure_url: result.secure_url,
        bytes: result.bytes
      })

      return result as CloudinaryUploadResult
    } catch (error) {
      logger.error('Failed to upload image from URL to Cloudinary:', error)
      throw new Error('Error al subir la imagen desde URL')
    }
  }

  // Eliminar imagen
  async deleteImage(publicId: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId)
      
      if (result.result !== 'ok') {
        throw new Error(`Failed to delete image: ${result.result}`)
      }

      logger.info('Image deleted from Cloudinary:', { public_id: publicId })
    } catch (error) {
      logger.error('Failed to delete image from Cloudinary:', error)
      throw new Error('Error al eliminar la imagen')
    }
  }

  // Eliminar múltiples imágenes
  async deleteImages(publicIds: string[]): Promise<void> {
    try {
      const result = await cloudinary.api.delete_resources(publicIds)
      
      logger.info('Multiple images deleted from Cloudinary:', {
        deleted: Object.keys(result.deleted).length,
        public_ids: publicIds
      })
    } catch (error) {
      logger.error('Failed to delete multiple images from Cloudinary:', error)
      throw new Error('Error al eliminar las imágenes')
    }
  }

  // Obtener información de imagen
  async getImageInfo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId)
      return result
    } catch (error) {
      logger.error('Failed to get image info from Cloudinary:', error)
      throw new Error('Error al obtener información de la imagen')
    }
  }

  // Listar imágenes en una carpeta
  async listImages(folder: string = 'cheos-cafe', maxResults: number = 50): Promise<any> {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folder,
        max_results: maxResults,
        resource_type: 'image'
      })
      return result
    } catch (error) {
      logger.error('Failed to list images from Cloudinary:', error)
      throw new Error('Error al listar las imágenes')
    }
  }

  // Generar URL de imagen con transformaciones
  generateImageUrl(
    publicId: string,
    transformations: any[] = []
  ): string {
    return cloudinary.url(publicId, {
      transformation: transformations.length > 0 ? transformations : [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    })
  }

  // Generar URLs de diferentes tamaños
  generateImageUrls(publicId: string): {
    original: string
    large: string
    medium: string
    small: string
    thumb: string
  } {
    return {
      original: this.generateImageUrl(publicId),
      large: this.generateImageUrl(publicId, [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]),
      medium: this.generateImageUrl(publicId, [
        { width: 500, height: 375, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]),
      small: this.generateImageUrl(publicId, [
        { width: 300, height: 225, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]),
      thumb: this.generateImageUrl(publicId, [
        { width: 150, height: 150, crop: 'thumb', gravity: 'face' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ])
    }
  }

  // Validar formato de imagen
  isValidImageFormat(filename: string): boolean {
    const validFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    return validFormats.includes(extension)
  }

  // Validar tamaño de imagen (en bytes)
  isValidImageSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
    return size <= maxSize // Por defecto máximo 10MB
  }

  // Generar public_id único
  private generatePublicId(originalName: string): string {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const cleanName = originalName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 20)
    
    return `${cleanName}_${timestamp}_${randomString}`
  }

  // Optimizar imagen para web
  async optimizeForWeb(
    buffer: Buffer,
    originalName: string,
    options: {
      maxWidth?: number
      maxHeight?: number
      quality?: number
      format?: string
    } = {}
  ): Promise<CloudinaryUploadResult> {
    const optimizationOptions: UploadOptions = {
      folder: 'cheos-cafe/optimized',
      quality: options.quality || 'auto:good',
      fetch_format: options.format || 'auto',
      transformation: [
        {
          width: options.maxWidth || 1200,
          height: options.maxHeight || 900,
          crop: 'limit'
        },
        { quality: options.quality || 'auto:good' },
        { fetch_format: options.format || 'auto' }
      ],
      eager: [
        { width: 600, height: 450, crop: 'limit' },
        { width: 300, height: 225, crop: 'limit' },
        { width: 150, height: 150, crop: 'thumb', gravity: 'center' }
      ]
    }

    return this.uploadFromBuffer(buffer, originalName, optimizationOptions)
  }
}

export const cloudinaryService = new CloudinaryService()