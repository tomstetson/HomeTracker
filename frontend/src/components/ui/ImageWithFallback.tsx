import { useState, useEffect } from 'react';
import { Package, Image as ImageIcon, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from './Skeleton';

type ImageStatus = 'loading' | 'loaded' | 'error';

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  fallbackIcon?: React.ComponentType<{ className?: string }>;
  className?: string;
  containerClassName?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
  objectFit?: 'cover' | 'contain' | 'fill';
  showLoadingState?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export function ImageWithFallback({
  src,
  alt,
  fallbackIcon: FallbackIcon = Package,
  className,
  containerClassName,
  aspectRatio = 'square',
  objectFit = 'cover',
  showLoadingState = true,
  onLoad,
  onError,
}: ImageWithFallbackProps) {
  const [status, setStatus] = useState<ImageStatus>(src ? 'loading' : 'error');

  useEffect(() => {
    if (src) {
      setStatus('loading');
    } else {
      setStatus('error');
    }
  }, [src]);

  const handleLoad = () => {
    setStatus('loaded');
    onLoad?.();
  };

  const handleError = () => {
    setStatus('error');
    onError?.();
  };

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  };

  const objectFitClasses = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/30 rounded-lg",
        aspectClasses[aspectRatio],
        containerClassName
      )}
    >
      {status === 'loading' && showLoadingState && (
        <Skeleton className="absolute inset-0 rounded-lg" />
      )}
      
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
          <FallbackIcon className="w-8 h-8 text-muted-foreground/50" />
          {!src && (
            <span className="text-xs text-muted-foreground mt-1">No image</span>
          )}
        </div>
      )}
      
      {src && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full transition-opacity duration-200",
            objectFitClasses[objectFit],
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
            className
          )}
        />
      )}
    </div>
  );
}

interface ImageGalleryPreviewProps {
  images: string[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  onImageClick?: (index: number) => void;
  className?: string;
}

export function ImageGalleryPreview({
  images,
  maxDisplay = 4,
  size = 'md',
  onImageClick,
  className,
}: ImageGalleryPreviewProps) {
  const displayImages = images.slice(0, maxDisplay);
  const remainingCount = images.length - maxDisplay;

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  if (images.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", sizeClasses[size], className)}>
        <div className="w-full h-full rounded-lg bg-muted/30 flex items-center justify-center">
          <ImageIcon className="w-1/2 h-1/2 text-muted-foreground/30" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-1", className)}>
      {displayImages.map((src, index) => (
        <button
          key={index}
          onClick={() => onImageClick?.(index)}
          className={cn(
            "relative overflow-hidden rounded-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary",
            sizeClasses[size]
          )}
        >
          <ImageWithFallback
            src={src}
            alt={`Image ${index + 1}`}
            aspectRatio="square"
            containerClassName="w-full h-full"
          />
          {index === maxDisplay - 1 && remainingCount > 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">+{remainingCount}</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

interface DocumentThumbnailProps {
  fileType?: string;
  src?: string;
  alt?: string;
  className?: string;
}

export function DocumentThumbnail({
  fileType,
  src,
  alt = 'Document',
  className,
}: DocumentThumbnailProps) {
  const isImage = fileType?.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(src || '');

  if (isImage && src) {
    return (
      <ImageWithFallback
        src={src}
        alt={alt}
        fallbackIcon={FileText}
        className={className}
      />
    );
  }

  const getFileIcon = () => {
    if (fileType?.includes('pdf')) return FileText;
    if (fileType?.includes('word') || fileType?.includes('document')) return FileText;
    return FileText;
  };

  const FileIcon = getFileIcon();

  return (
    <div className={cn(
      "aspect-square rounded-lg bg-muted/30 flex items-center justify-center",
      className
    )}>
      <FileIcon className="w-8 h-8 text-muted-foreground/50" />
    </div>
  );
}
