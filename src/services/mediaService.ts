import db from './chatDatabase';
import { BotMedia, MediaReference, MediaUploadResult } from '@/types/chat';

export class MediaService {
  // Upload and optimize media files
  static async uploadMedia(
    botId: string,
    files: FileList | File[]
  ): Promise<MediaUploadResult[]> {
    const results: MediaUploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          results.push({
            success: false,
            error: `Unsupported file type: ${file.type}`
          });
          continue;
        }

        // Optimize media
        const optimizedBlob = await this.optimizeMedia(file);
        
        // Convert blob to ArrayBuffer for storage
        const blobData = await optimizedBlob.blob.arrayBuffer();
        
        // Generate unique media ID
        const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Get existing media count for rotation index
        const existingMedia = await db.botMedia.where('botId').equals(botId).toArray();
        const rotationIndex = existingMedia.length;
        
        // Store in IndexedDB
        const mediaRecord = {
          id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          botId,
          mediaId,
          type: file.type.startsWith('image/') ? 'image' as const : 'video' as const,
          mimeType: file.type,
          blobData,
          blobRef: '', // Will be generated on retrieval
          optimizedDimensions: optimizedBlob.dimensions,
          createdAt: new Date().getTime(),
          lastUsedAt: new Date().getTime(),
          rotationIndex
        };
        
        await db.botMedia.add(mediaRecord);
        
        // Create blob URL from stored data
        const blob = new Blob([blobData], { type: file.type });
        const blobRef = URL.createObjectURL(blob);
        
        results.push({
          success: true,
          mediaId,
          blobRef,
          optimizedDimensions: optimizedBlob.dimensions
        });
        
        console.log('📸 Media uploaded successfully:', {
          botId,
          mediaId,
          type: mediaRecord.type,
          dimensions: optimizedBlob.dimensions
        });
        
      } catch (error) {
        console.error('❌ Error uploading media:', error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  // Optimize media files (client-side)
  private static async optimizeMedia(file: File): Promise<{
    blob: Blob;
    dimensions?: { width: number; height: number };
  }> {
    if (file.type.startsWith('image/')) {
      return this.optimizeImage(file);
    } else if (file.type.startsWith('video/')) {
      return this.optimizeVideo(file);
    }
    
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  // Optimize images
  private static async optimizeImage(file: File): Promise<{
    blob: Blob;
    dimensions: { width: number; height: number };
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      img.onload = () => {
        // Calculate optimal dimensions (max 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                dimensions: { width, height }
              });
            } else {
              reject(new Error('Failed to create optimized image blob'));
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Optimize videos (basic compression)
  private static async optimizeVideo(file: File): Promise<{
    blob: Blob;
    dimensions?: { width: number; height: number };
  }> {
    // For now, return the original file
    // In a real implementation, you'd use WebAssembly or WebCodecs API
    return {
      blob: file,
      dimensions: undefined
    };
  }

  // Get all media for a bot
  static async getBotMedia(botId: string): Promise<BotMedia[]> {
    const media = await db.botMedia.where('botId').equals(botId).toArray();
    return media.map(m => {
      // Generate blob URL from stored ArrayBuffer
      const blob = new Blob([m.blobData], { type: m.mimeType });
      const blobRef = URL.createObjectURL(blob);
      
      return {
        ...m,
        blobRef,
        createdAt: new Date(m.createdAt),
        lastUsedAt: new Date(m.lastUsedAt)
      };
    });
  }

  // Get next media in round-robin order
  static async getNextMedia(botId: string): Promise<BotMedia | null> {
    const media = await db.botMedia.where('botId').equals(botId).toArray();
    
    if (media.length === 0) {
      return null;
    }
    
    // Sort by lastUsedAt, then by rotationIndex
    media.sort((a, b) => {
      if (a.lastUsedAt !== b.lastUsedAt) {
        return a.lastUsedAt - b.lastUsedAt;
      }
      return a.rotationIndex - b.rotationIndex;
    });
    
    const nextMedia = media[0];
    
    // Update lastUsedAt
    await db.botMedia.update(nextMedia.id, {
      lastUsedAt: new Date().getTime()
    });
    
    // Generate blob URL from stored ArrayBuffer
    const blob = new Blob([nextMedia.blobData], { type: nextMedia.mimeType });
    const blobRef = URL.createObjectURL(blob);
    
    return {
      ...nextMedia,
      blobRef,
      createdAt: new Date(nextMedia.createdAt),
      lastUsedAt: new Date(nextMedia.lastUsedAt)
    };
  }

  // Delete media
  static async deleteMedia(mediaId: string): Promise<void> {
    const media = await db.botMedia.where('mediaId').equals(mediaId).first();
    
    if (media) {
      // Revoke blob URL to free memory
      URL.revokeObjectURL(media.blobRef);
      
      // Delete from database
      await db.botMedia.where('mediaId').equals(mediaId).delete();
      
      console.log('🗑️ Media deleted:', mediaId);
    }
  }

  // Create media reference for a message
  static async createMediaReference(
    messageId: string,
    mediaId: string,
    botId: string
  ): Promise<void> {
    const reference = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messageId,
      mediaId,
      botId,
      createdAt: new Date().getTime()
    };
    
    await db.mediaReferences.add(reference);
    
    console.log('🔗 Media reference created:', {
      messageId,
      mediaId,
      botId
    });
  }

  // Get media reference for a message
  static async getMediaReference(messageId: string): Promise<MediaReference | null> {
    const ref = await db.mediaReferences.where('messageId').equals(messageId).first();
    if (ref) {
      return {
        ...ref,
        createdAt: new Date(ref.createdAt)
      };
    }
    return null;
  }

  // Get media by reference
  static async getMediaByReference(reference: MediaReference): Promise<BotMedia | null> {
    const media = await db.botMedia.where('mediaId').equals(reference.mediaId).first();
    if (media) {
      // Generate blob URL from stored ArrayBuffer
      const blob = new Blob([media.blobData], { type: media.mimeType });
      const blobRef = URL.createObjectURL(blob);
      
      return {
        ...media,
        blobRef,
        createdAt: new Date(media.createdAt),
        lastUsedAt: new Date(media.lastUsedAt)
      };
    }
    return null;
  }

  // Set profile picture for a bot
  static async setProfilePicture(botId: string, mediaId: string): Promise<void> {
    // This would be handled in the thread config update
    console.log('🖼️ Profile picture set:', { botId, mediaId });
  }

  // Get profile picture for a bot
  static async getProfilePicture(botId: string): Promise<BotMedia | null> {
    // This would be handled by getting the first image media for the bot
    const media = await db.botMedia
      .where('botId')
      .equals(botId)
      .and(m => m.type === 'image')
      .first();
    
    if (media) {
      return {
        ...media,
        createdAt: new Date(media.createdAt),
        lastUsedAt: new Date(media.lastUsedAt)
      };
    }
    
    return null;
  }

  // Move media from temp bot to actual bot
  static async moveMediaToBot(mediaId: string, newBotId: string): Promise<void> {
    const media = await db.botMedia.where('mediaId').equals(mediaId).first();
    
    if (media) {
      await db.botMedia.update(media.id, {
        botId: newBotId
      });
      
      console.log('📸 Media moved to bot:', {
        mediaId,
        newBotId
      });
    }
  }

  // Clean up blob URLs when bot is deleted
  static async cleanupBotMedia(botId: string): Promise<void> {
    const media = await db.botMedia.where('botId').equals(botId).toArray();
    
    for (const m of media) {
      URL.revokeObjectURL(m.blobRef);
    }
    
    await db.botMedia.where('botId').equals(botId).delete();
    await db.mediaReferences.where('botId').equals(botId).delete();
    
    console.log('🧹 Bot media cleaned up:', botId);
  }
}

export default MediaService;
