import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image, Video, Trash2 } from 'lucide-react';
import { MediaUploadResult } from '@/types/chat';

interface MediaUploadProps {
  botId: string;
  onUploadComplete: (results: MediaUploadResult[]) => void;
  onRemoveMedia: (mediaId: string) => void;
  existingMedia?: Array<{ id: string; mediaId: string; type: 'image' | 'video'; blobRef: string }>;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  botId,
  onUploadComplete,
  onRemoveMedia,
  existingMedia = []
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Import MediaService dynamically to avoid circular dependencies
      const { MediaService } = await import('@/services/mediaService');
      
      const results = await MediaService.uploadMedia(botId, files);
      onUploadComplete(results);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      onUploadComplete([{
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        type: files[0].type.startsWith('image/') ? 'image' as const : 'video' as const
      }]);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveMedia = (mediaId: string) => {
    onRemoveMedia(mediaId);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {/* <Label>Media Gallery (Optional)</Label> */}
        <p className="text-sm text-muted-foreground">
          Upload images or videos for this bot. The first image will be used as the profile picture.
        </p>
        
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload Media'}
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Existing Media Preview */}
      {existingMedia.length > 0 && (
        <div className="space-y-2">
          <Label>Uploaded Media ({existingMedia.length})</Label>
          <div className="max-h-64 overflow-y-auto border rounded-lg p-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {existingMedia.map((media) => (
                <div key={media.mediaId} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    {media.type === 'image' ? (
                      <img
                        src={media.blobRef}
                        alt="Media preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={media.blobRef}
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}
                  </div>
                  
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveMedia(media.mediaId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  
                  <div className="absolute bottom-1 left-1">
                    {media.type === 'image' ? (
                      <Image className="h-3 w-3 text-white" />
                    ) : (
                      <Video className="h-3 w-3 text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
