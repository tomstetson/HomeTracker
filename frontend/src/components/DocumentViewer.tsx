import { useState, useEffect } from 'react';
import { Document, useDocumentStore } from '../store/documentStore';
import { useInventoryStore, InventoryItem } from '../store/inventoryStore';
import { fileApi, StoredFile } from '../lib/fileApi';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { useToast } from './ui/Toast';
import { ItemLinkSelector } from './ItemLinkSelector';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  FileImage,
  File,
  Package,
  Link2,
  Unlink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Loader2,
  Calendar,
  HardDrive,
  Tag,
  Scan,
  AlertTriangle,
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

interface DocumentViewerProps {
  document: Document | null;
  storedFile: StoredFile | null;
  open: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export function DocumentViewer({
  document,
  storedFile,
  open,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: DocumentViewerProps) {
  const toast = useToast();
  const { updateDocument } = useDocumentStore();
  const { getActiveItems } = useInventoryStore();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');

  // Reset loading state when document changes
  useEffect(() => {
    setPdfLoading(true);
    setPdfError(false);
  }, [document?.id]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      } else if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        onPrevious();
      } else if (e.key === 'f') {
        setIsFullscreen(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isFullscreen, hasNext, hasPrevious, onNext, onPrevious, onClose]);

  if (!document || !open) return null;

  const activeItems = getActiveItems();
  const linkedItem = document.relatedTo 
    ? activeItems.find(item => item.id === document.relatedTo)
    : null;

  // Get file viewing URL
  const viewUrl = storedFile ? fileApi.getViewUrl(storedFile.id) : null;
  const downloadUrl = storedFile ? fileApi.getDownloadUrl(storedFile.id) : null;
  
  // Determine file type for rendering
  const isPdf = storedFile?.mimeType?.includes('pdf') || document.fileType?.toLowerCase() === 'pdf';
  const isImage = storedFile ? fileApi.isImage(storedFile.mimeType) : false;

  // Get file icon
  const getFileIcon = () => {
    if (isPdf) return <FileText className="w-16 h-16 text-red-500" />;
    if (isImage) return <FileImage className="w-16 h-16 text-purple-500" />;
    return <File className="w-16 h-16 text-gray-500" />;
  };

  // Link document to inventory item
  const handleLinkItem = () => {
    if (!selectedItemId) return;
    
    updateDocument(document.id, {
      relatedTo: selectedItemId,
      relatedType: 'item',
    });
    
    const item = activeItems.find(i => i.id === selectedItemId);
    toast.success('Linked', `Document linked to ${item?.name}`);
    setLinkDialogOpen(false);
    setSelectedItemId('');
  };

  // Unlink document from item
  const handleUnlinkItem = () => {
    updateDocument(document.id, {
      relatedTo: undefined,
      relatedType: undefined,
    });
    toast.info('Unlinked', 'Document unlinked from item');
  };

  // Render the document preview
  const renderPreview = () => {
    if (!viewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mb-4" />
          <p>Document file not available</p>
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="relative w-full h-full bg-gray-900">
          {pdfLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          )}
          {pdfError ? (
            <div className="flex flex-col items-center justify-center h-full text-white">
              <FileText className="w-16 h-16 mb-4 text-red-400" />
              <p className="mb-4">Unable to display PDF inline</p>
              <Button 
                variant="outline" 
                onClick={() => window.open(viewUrl, '_blank')}
                className="border-white/30 text-white hover:bg-white/10"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          ) : (
            <object
              data={viewUrl}
              type="application/pdf"
              className="w-full h-full"
              onLoad={() => setPdfLoading(false)}
              onError={() => {
                setPdfLoading(false);
                setPdfError(true);
              }}
            >
              <iframe
                src={viewUrl}
                className="w-full h-full border-0"
                title={document.name}
                onLoad={() => setPdfLoading(false)}
                onError={() => {
                  setPdfLoading(false);
                  setPdfError(true);
                }}
              />
            </object>
          )}
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900 p-4">
          <img
            src={viewUrl}
            alt={document.name}
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        </div>
      );
    }

    // For other file types, show icon with download option
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30">
        {getFileIcon()}
        <p className="mt-4 text-lg font-medium text-foreground">{document.name}</p>
        <p className="text-muted-foreground uppercase">{document.fileType}</p>
        <div className="flex gap-2 mt-6">
          <Button onClick={() => window.open(viewUrl, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open
          </Button>
          {downloadUrl && (
            <Button variant="outline" onClick={() => window.open(downloadUrl, '_blank')}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Render sidebar content
  const renderSidebar = () => (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground truncate">{document.name}</h2>
        <p className="text-sm text-muted-foreground capitalize">{document.category}</p>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* File Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <File className="w-4 h-4" />
            File Details
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium text-foreground uppercase">{document.fileType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Size</p>
              <p className="font-medium text-foreground">
                {fileApi.formatFileSize(document.fileSize || 0)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Uploaded
              </p>
              <p className="font-medium text-foreground">{formatDate(document.uploadDate)}</p>
            </div>
          </div>
        </div>

        {/* Linked Inventory Item */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Package className="w-4 h-4" />
            Linked Item
          </h3>
          {linkedItem ? (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{linkedItem.name}</p>
                    <p className="text-xs text-muted-foreground">{linkedItem.category}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleUnlinkItem}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Unlink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setLinkDialogOpen(true)}
            >
              <Link2 className="w-4 h-4 mr-2" />
              Link to Inventory Item
            </Button>
          )}
        </div>

        {/* Description */}
        {document.description && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Description</h3>
            <p className="text-sm text-muted-foreground">{document.description}</p>
          </div>
        )}

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-1">
              {document.tags.map((tag, i) => (
                <span 
                  key={i} 
                  className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* OCR Text */}
        {storedFile?.ocrText && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Scan className="w-4 h-4" />
              Extracted Text (OCR)
            </h3>
            <div className="p-3 bg-muted/20 rounded-lg text-xs text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
              {storedFile.ocrText}
            </div>
          </div>
        )}

        {/* Notes */}
        {document.notes && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Notes</h3>
            <p className="text-sm text-muted-foreground">{document.notes}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        {downloadUrl && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.open(downloadUrl, '_blank')}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        )}
        {viewUrl && (
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => window.open(viewUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Main Viewer Modal */}
      <div 
        className={cn(
          "fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex",
          isFullscreen ? "" : "p-4 md:p-8"
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-background/80 hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={() => setIsFullscreen(prev => !prev)}
          className="absolute top-4 right-14 z-50 p-2 rounded-lg bg-background/80 hover:bg-muted transition-colors"
          title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        {/* Sidebar toggle (when in fullscreen) */}
        {isFullscreen && (
          <button
            onClick={() => setShowSidebar(prev => !prev)}
            className="absolute top-4 right-24 z-50 p-2 rounded-lg bg-background/80 hover:bg-muted transition-colors"
            title="Toggle sidebar"
          >
            <HardDrive className="w-5 h-5" />
          </button>
        )}

        {/* Navigation buttons */}
        {hasPrevious && onPrevious && (
          <button
            onClick={onPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-background/80 hover:bg-muted transition-colors"
            title="Previous (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasNext && onNext && (
          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-background/80 hover:bg-muted transition-colors"
            style={{ right: showSidebar && !isFullscreen ? '340px' : '16px' }}
            title="Next (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Content container */}
        <div 
          className={cn(
            "flex-1 flex overflow-hidden",
            !isFullscreen && "rounded-xl border border-border shadow-2xl"
          )}
        >
          {/* Document Preview */}
          <div className="flex-1 overflow-hidden">
            {renderPreview()}
          </div>

          {/* Sidebar */}
          {showSidebar && renderSidebar()}
        </div>
      </div>

      {/* Link Item Dialog */}
      <Dialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        title="Link to Inventory Item"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Associate this document with an inventory item to easily find manuals, 
            warranties, and receipts for your belongings.
          </p>
          <ItemLinkSelector
            selectedItemId={selectedItemId}
            onSelect={(item: InventoryItem | null) => setSelectedItemId(item?.id || '')}
            showConfirmButton={true}
            onConfirm={() => {
              handleLinkItem();
              setLinkDialogOpen(false);
            }}
            confirmText="Link Item"
          />
        </div>
      </Dialog>
    </>
  );
}
