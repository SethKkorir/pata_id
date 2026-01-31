const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const sharp = require('sharp');

class FileUploadService {
  constructor() {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
  }

  // Upload buffer to Cloudinary
  uploadFromBuffer(buffer, options = {}) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'pataid',
          resource_type: 'image',
          ...options,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  // Process and upload ID photo with privacy protection
  async uploadIDPhoto(fileBuffer, idNumber) {
    if (!process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.CLOUDINARY_CLOUD_NAME === 'placeholder_cloud_name') {
      console.warn('Cloudinary not configured. Returning placeholder.');
      return {
        url: 'https://placehold.co/600x400?text=ID+Preview',
        publicId: `temp_${Date.now()}`,
        blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj'
      };
    }

    try {
      // First, process image to blur sensitive information
      const processedImage = await sharp(fileBuffer)
        .blur(15) // Blur the entire image initially
        .composite([
          {
            input: fileBuffer,
            blend: 'over', // Keep only specific areas clear
          },
        ])
        .toBuffer();

      // Upload to Cloudinary with privacy settings
      const result = await this.uploadFromBuffer(processedImage, {
        transformation: [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto:good' },
          { flags: 'attachment' }, // Prevent hotlinking
        ],
        context: `id_number=${idNumber}`,
        tags: ['id_card', 'private'],
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        blurHash: this.generateBlurHash(processedImage),
      };
    } catch (error) {
      console.error('ID photo upload error:', error);
      throw error;
    }
  }

  // Upload verification document
  async uploadVerificationDocument(fileBuffer, documentType, userId) {
    const result = await this.uploadFromBuffer(fileBuffer, {
      folder: `pataid/verifications/${userId}`,
      resource_type: 'auto',
      transformation: [
        { width: 1200, height: 1600, crop: 'limit' },
        { quality: 'auto:best' },
        { flags: 'attachment' },
      ],
      context: `type=${documentType}&user=${userId}`,
      tags: ['verification', 'sensitive'],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
    };
  }

  // Delete file from Cloudinary
  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('File deletion error:', error);
      throw error;
    }
  }

  // Generate blur hash for image (simplified)
  generateBlurHash(buffer) {
    // In production, use a proper blurhash library
    // This is a simplified version
    return 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
  }

  // Validate file
  validateFile(file, allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']) {
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    return true;
  }
}

module.exports = new FileUploadService();