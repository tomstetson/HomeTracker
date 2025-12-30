import { useState, useEffect, useRef } from 'react';
import { api, EntityImage } from '../lib/api';
import { Button } from './ui/Button';
import { Dialog, DialogFooter } from './ui/Dialog';
import { useToast } from './ui/Toast';
import { useConfirm } from './ui/ConfirmDialog';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Star,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Camera,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageGalleryProps {
  entityType: 'item' | 'project' | 'warranty' | 'document';
  entityId: string;
  editable?: boolean;
  maxImages?: number;
  showUpload?: boolean;
  compact?: boolean;
  onImageCountChange?: (count: number) => void;
}

export function ImageGallery({
  entityType,
  entityId,
  editable = true,
  maxImages = 10,
  showUpload = true,
  compact = false,
  onImageCountChange,
}: ImageGalleryProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<EntityImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<EntityImage | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Fetch images for entity
  const fetchImages = async () => {
    if (!entityId || entityId === 'new') {
      setImages([]);
      setIsLoading(false);
      return;
    }

    try {
      const result = await api.getEntityImages(entityType, entityId);
      if (result.success && result.images) {
        setImages(result.images);
        onImageCountChange?.(result.images.length);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [entityType, entityId]);

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast.warning('Too many images', `Maximum ${maxImages} images allowed`);
      return;
    }

    setIsUploading(true);

    try {
      const isPrimary = images.length === 0; // First image is primary
      
      for (const file of Array.from(files)) {
        const result = await api.uploadImage(file, entityType, entityId, isPrimary && images.length === 0);
        
        if (!result.success) {
          toast.error('Upload failed', result.error || 'Failed to upload image');
        }
      }

      await fetchImages();
      toast.success('Upload complete', `${files.length} image(s) uploaded`);
    } catch (error: any) {
      toast.error('Upload failed', error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle delete
  const handleDelete = async (image: EntityImage) => {
    const confirmed = await confirm({
      title: 'Delete Image?',
      message: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const result = await api.deleteImage(image.id);
      if (result.success) {
        await fetchImages();
        toast.success('Image deleted');
      } else {
        toast.error('Delete failed', result.error);
      }
    } catch (error: any) {
      toast.error('Delete failed', error.message);
    }
  };

  // Handle set primary
  const handleSetPrimary = async (image: EntityImage) => {
    try {
      const result = await api.setPrimaryImage(entityType, entityId, image.id);
      if (result.success) {
        await fetchImages();
        toast.success('Primary image updated');
      } else {
        toast.error('Failed to set primary', result.error);
      }
    } catch (error: any) {
      toast.error('Failed to set primary', error.message);
    }
  };

  // Navigate lightbox
  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    const newIndex = direction === 'prev' 
      ? (currentIndex - 1 + images.length) % images.length
      : (currentIndex + 1) % images.length;
    setSelectedImage(images[newIndex]);
  };

  // Get image URL
  const getImageUrl = (image: EntityImage, thumbnail = false) => {
    return thumbnail ? image.thumbnailUrl : image.url;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Compact view - just thumbnails in a row
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {images.slice(0, 3).map((image) => (
          <button
            key={image.id}
            onClick={() => {
              setSelectedImage(image);
              setLightboxOpen(true);
            }}
            className="relative w-10 h-10 rounded overflow-hidden hover:ring-2 ring-primary transition-all"
          >
            <img
              src={getImageUrl(image, true)}
              alt={image.filename}
              className="w-full h-full object-cover"
            />
            {image.is_primary && (
              <Star className="absolute top-0.5 right-0.5 w-3 h-3 text-amber-400 fill-amber-400" />
            )}
          </button>
        ))}
        {images.length > 3 && (
          <span className="text-xs text-muted-foreground">+{images.length - 3}</span>
        )}
        {images.length === 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Camera className="w-3 h-3" /> No images
          </span>
        )}

        {/* Lightbox */}
        <Dialog
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          title=""
          maxWidth="2xl"
        >
          {selectedImage && (
            <div className="relative">
              <img
                src={getImageUrl(selectedImage)}
                alt={selectedImage.filename}
                className="max-h-[70vh] mx-auto rounded-lg"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => navigateLightbox('prev')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => navigateLightbox('next')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          )}
        </Dialog>
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-3">
      {/* Image Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
            >
              <img
                src={getImageUrl(image, true)}
                alt={image.filename}
                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {
                  setSelectedImage(image);
                  setLightboxOpen(true);
                }}
              />
              
              {/* Primary badge */}
              {image.is_primary && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" /> Primary
                </div>
              )}

              {/* Action overlay */}
              {editable && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedImage(image);
                      setLightboxOpen(true);
                    }}
                    className="p-2 bg-white/20 rounded-full hover:bg-white/30"
                    title="View"
                  >
                    <ZoomIn className="w-4 h-4 text-white" />
                  </button>
                  {!image.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(image)}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/30"
                      title="Set as primary"
                    >
                      <Star className="w-4 h-4 text-white" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(image)}
                    className="p-2 bg-red-500/50 rounded-full hover:bg-red-500/70"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Upload slot */}
          {showUpload && editable && images.length < maxImages && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30",
                "flex flex-col items-center justify-center gap-1 text-muted-foreground",
                "hover:border-primary hover:text-primary transition-colors",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  <span className="text-xs">Add</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : showUpload && editable ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "w-full py-8 rounded-lg border-2 border-dashed border-muted-foreground/30",
            "flex flex-col items-center justify-center gap-2 text-muted-foreground",
            "hover:border-primary hover:text-primary transition-colors",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <>
              <ImageIcon className="w-8 h-8" />
              <span className="text-sm">Click to upload images</span>
              <span className="text-xs text-muted-foreground">JPG, PNG, HEIC up to 10MB</span>
            </>
          )}
        </button>
      ) : (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No images
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Lightbox Dialog */}
      <Dialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={selectedImage?.filename || 'Image'}
        maxWidth="2xl"
      >
        {selectedImage && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <img
                src={getImageUrl(selectedImage)}
                alt={selectedImage.filename}
                className="max-h-[60vh] mx-auto"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => navigateLightbox('prev')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => navigateLightbox('next')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{images.findIndex(img => img.id === selectedImage.id) + 1} of {images.length}</span>
            </div>

            {editable && (
              <DialogFooter>
                {!selectedImage.is_primary && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleSetPrimary(selectedImage);
                      setLightboxOpen(false);
                    }}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Set as Primary
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDelete(selectedImage);
                    setLightboxOpen(false);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}

// Compact thumbnail for item cards with improved loading/error states
export function ItemThumbnail({ 
  entityType, 
  entityId,
  className 
}: { 
  entityType: 'item' | 'project' | 'warranty' | 'document';
  entityId: string;
  className?: string;
}) {
  const [primaryImage, setPrimaryImage] = useState<EntityImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchPrimary = async () => {
      if (!entityId || entityId === 'new') {
        setLoading(false);
        return;
      }

      try {
        const result = await api.getEntityImages(entityType, entityId);
        if (result.success && result.images && result.images.length > 0) {
          const primary = result.images.find((img) => img.is_primary) || result.images[0];
          setPrimaryImage(primary);
        }
      } catch (error) {
        console.error('Failed to fetch primary image:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrimary();
  }, [entityType, entityId]);

  // Reset error state when image changes
  useEffect(() => {
    setImageError(false);
  }, [primaryImage?.thumbnailUrl]);

  if (loading) {
    return (
      <div className={cn("bg-muted animate-pulse", className)} />
    );
  }

  if (!primaryImage || imageError) {
    return (
      <div className={cn("bg-muted/50 flex items-center justify-center", className)}>
        <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <img
        src={primaryImage.thumbnailUrl}
        alt="Item thumbnail"
        className="w-full h-full object-cover transition-opacity duration-200"
        onError={() => setImageError(true)}
      />
    </div>
  );
}
