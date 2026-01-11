import sharp from 'sharp'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export interface ProcessedImage {
  originalPath: string
  originalUrl: string
  thumbnailPath?: string
  thumbnailUrl?: string
  webpPath?: string
  webpUrl?: string
  width: number
  height: number
  fileSize: number
  thumbnailSize?: number
  webpSize?: number
}

/**
 * Elabora un'immagine: resize, thumbnail e conversione WebP
 */
export async function processImage(
  imageBuffer: Buffer,
  filename: string,
  options: {
    maxWidth?: number
    maxHeight?: number
    thumbnailSize?: number
    quality?: number
    generateWebP?: boolean
    generateThumbnail?: boolean
  } = {}
): Promise<ProcessedImage> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    thumbnailSize = 300,
    quality = 85,
    generateWebP = true,
    generateThumbnail = true,
  } = options

  // Crea directory upload se non esiste
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'products')
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
  }

  const timestamp = Date.now()
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const baseFileName = `${timestamp}_${sanitizedName.replace(/\.[^/.]+$/, '')}`

  // Ottieni metadati immagine originale
  const metadata = await sharp(imageBuffer).metadata()
  const originalWidth = metadata.width || 0
  const originalHeight = metadata.height || 0

  // Resize immagine originale se troppo grande
  let processedBuffer = imageBuffer
  let finalWidth = originalWidth
  let finalHeight = originalHeight

  if (originalWidth > maxWidth || originalHeight > maxHeight) {
    processedBuffer = await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer()

    const resizedMetadata = await sharp(processedBuffer).metadata()
    finalWidth = resizedMetadata.width || originalWidth
    finalHeight = resizedMetadata.height || originalHeight
  }

  // Salva immagine originale (o resized)
  const originalFileName = `${baseFileName}.jpg`
  const originalPath = join(uploadDir, originalFileName)
  await writeFile(originalPath, processedBuffer)
  const originalUrl = `/uploads/products/${originalFileName}`
  const originalSize = processedBuffer.length

  const result: ProcessedImage = {
    originalPath,
    originalUrl,
    width: finalWidth,
    height: finalHeight,
    fileSize: originalSize,
  }

  // Genera thumbnail se richiesto
  if (generateThumbnail) {
    const thumbnailBuffer = await sharp(processedBuffer)
      .resize(thumbnailSize, thumbnailSize, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer()

    const thumbnailFileName = `${baseFileName}_thumb.jpg`
    const thumbnailPath = join(uploadDir, thumbnailFileName)
    await writeFile(thumbnailPath, thumbnailBuffer)
    const thumbnailUrl = `/uploads/products/${thumbnailFileName}`

    result.thumbnailPath = thumbnailPath
    result.thumbnailUrl = thumbnailUrl
    result.thumbnailSize = thumbnailBuffer.length
  }

  // Genera versione WebP se richiesto
  if (generateWebP) {
    const webpBuffer = await sharp(processedBuffer)
      .webp({ quality })
      .toBuffer()

    const webpFileName = `${baseFileName}.webp`
    const webpPath = join(uploadDir, webpFileName)
    await writeFile(webpPath, webpBuffer)
    const webpUrl = `/uploads/products/${webpFileName}`

    result.webpPath = webpPath
    result.webpUrl = webpUrl
    result.webpSize = webpBuffer.length
  }

  return result
}

/**
 * Elimina file immagine e sue varianti
 */
export async function deleteImageFiles(image: {
  imageUrl: string
  thumbnailUrl?: string | null
  webpUrl?: string | null
}): Promise<void> {
  try {
    const publicDir = join(process.cwd(), 'public')

    // Elimina immagine originale
    if (image.imageUrl && image.imageUrl.startsWith('/uploads/')) {
      const filePath = join(publicDir, image.imageUrl.substring(1))
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    }

    // Elimina thumbnail
    if (image.thumbnailUrl && image.thumbnailUrl.startsWith('/uploads/')) {
      const thumbPath = join(publicDir, image.thumbnailUrl.substring(1))
      if (existsSync(thumbPath)) {
        await unlink(thumbPath)
      }
    }

    // Elimina WebP
    if (image.webpUrl && image.webpUrl.startsWith('/uploads/')) {
      const webpPath = join(publicDir, image.webpUrl.substring(1))
      if (existsSync(webpPath)) {
        await unlink(webpPath)
      }
    }
  } catch (error) {
    console.error('Errore nell\'eliminazione file immagine:', error)
    // Non lanciare errore per non bloccare l'operazione principale
  }
}

/**
 * Trova e elimina immagini non utilizzate
 */
export async function findUnusedImages(): Promise<string[]> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'products')
    
    if (!existsSync(uploadDir)) {
      return []
    }

    // Leggi tutti i file nella directory upload
    const fs = await import('fs/promises')
    const files = await fs.readdir(uploadDir)

    // Recupera tutti gli URL immagini utilizzate dal database
    const [productImages, productMainImages] = await Promise.all([
      prisma.productImage.findMany({
        select: {
          imageUrl: true,
          thumbnailUrl: true,
          webpUrl: true,
        },
      }),
      prisma.product.findMany({
        where: {
          image: { not: { equals: '/images/placeholder.svg' } },
        },
        select: {
          image: true,
        },
      }),
    ])

    const usedImages = new Set<string>()

    // Aggiungi URL utilizzati
    productImages.forEach((img) => {
      if (img.imageUrl) usedImages.add(img.imageUrl.substring(1)) // Rimuovi leading /
      if (img.thumbnailUrl) usedImages.add(img.thumbnailUrl.substring(1))
      if (img.webpUrl) usedImages.add(img.webpUrl.substring(1))
    })

    productMainImages.forEach((p) => {
      if (p.image && p.image.startsWith('/uploads/')) {
        usedImages.add(p.image.substring(1))
      }
    })

    // Trova file non utilizzati
    const unusedFiles: string[] = []
    for (const file of files) {
      const relativePath = `uploads/products/${file}`
      if (!usedImages.has(relativePath)) {
        unusedFiles.push(join(uploadDir, file))
      }
    }

    return unusedFiles
  } catch (error) {
    console.error('Errore nel trovare immagini non utilizzate:', error)
    return []
  }
}

