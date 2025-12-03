import { useState, useEffect, useCallback } from 'react';
import { useDocumentStore, Document } from '../store/documentStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { fileApi, StoredFile } from '../lib/fileApi';
import {
  FileText, Upload, Search, Edit, Trash2, Download,
  HardDrive, FileImage, FileSpreadsheet, File,
  Loader2, Scan, CheckCircle, AlertTriangle, Clock,
  ExternalLink
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

export default function Documents() {
  const { documents, addDocument, updateDocument, deleteDocument } = useDocumentStore();
  const toast = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([]);
  const [, setIsLoadingFiles] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  // Load stored files from backend
  useEffect(() => {
    loadStoredFiles();
  }, []);

  const loadStoredFiles = async () => {
    try {
      const files = await fileApi.getAllFiles();
      setStoredFiles(files);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'other' as Document['category'],
    description: '',
    tags: '',
    notes: '',
  });

  // Search files with OCR
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const results = await fileApi.searchFiles(query);
        setStoredFiles(results);
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else if (query.length === 0) {
      loadStoredFiles();
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery.length <= 2 || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Handle file upload
  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileArray = Array.from(files);
      let completed = 0;

      for (const file of fileArray) {
        const storedFile = await fileApi.uploadFile(file);
        
        // Create document entry
        const newDoc: Document = {
          id: storedFile.id,
          name: storedFile.originalName,
          category: 'other',
          fileType: storedFile.mimeType.split('/')[1] || 'unknown',
          fileSize: storedFile.size,
          uploadDate: new Date().toISOString().split('T')[0],
          url: storedFile.path,
        };
        
        addDocument(newDoc);
        setStoredFiles(prev => [...prev, storedFile]);
        
        completed++;
        setUploadProgress((completed / fileArray.length) * 100);
      }

      toast.success('Upload Complete', `${fileArray.length} file(s) uploaded successfully`);
      setIsAddDialogOpen(false);
    } catch (error: any) {
      toast.error('Upload Failed', error.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, []);

  // Get file icon
  const getFileIcon = (fileType: string | undefined) => {
    if (!fileType) return <File className="w-5 h-5 text-gray-500" />;
    const type = fileType.toLowerCase();
    if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) {
      return <FileImage className="w-5 h-5 text-purple-500" />;
    }
    if (type.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (type.includes('excel') || type.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(type)) {
      return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  // Get OCR status badge
  const getOcrStatusBadge = (file: StoredFile) => {
    switch (file.ocrStatus) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            OCR Done
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  // Handle delete
  const handleDelete = async (doc: Document) => {
    try {
      await fileApi.deleteFile(doc.id);
      deleteDocument(doc.id);
      setStoredFiles(prev => prev.filter(f => f.id !== doc.id));
      toast.success('Deleted', 'Document deleted successfully');
    } catch (error) {
      // Still remove from local state even if backend fails
      deleteDocument(doc.id);
      toast.info('Removed', 'Document removed from list');
    }
  };

  // View document details
  const handleView = (doc: Document) => {
    setSelectedDocument(doc);
    setIsViewDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">Store and search receipts, manuals, and important documents</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Files
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search documents, receipts, OCR text..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-48"
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'receipt', label: 'Receipts' },
                { value: 'manual', label: 'Manuals' },
                { value: 'invoice', label: 'Invoices' },
                { value: 'warranty', label: 'Warranties' },
                { value: 'photo', label: 'Photos' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Total Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Scan className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {storedFiles.filter(f => f.ocrStatus === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">OCR Processed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <FileImage className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {documents.filter(d => d.category === 'receipt').length}
                </p>
                <p className="text-sm text-muted-foreground">Receipts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {fileApi.formatFileSize(documents.reduce((sum, d) => sum + (d.fileSize || 0), 0))}
                </p>
                <p className="text-sm text-muted-foreground">Storage Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredDocuments.map((doc) => {
          const storedFile = storedFiles.find(f => f.id === doc.id);
          
          return (
            <Card 
              key={doc.id} 
              className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleView(doc)}
            >
              <CardContent className="p-4">
                {/* Preview area */}
                <div className="aspect-[4/3] mb-3 rounded-lg bg-muted/30 flex items-center justify-center relative overflow-hidden">
                  {storedFile && fileApi.isImage(storedFile.mimeType) ? (
                    <img 
                      src={fileApi.getViewUrl(storedFile.id)} 
                      alt={doc.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      {getFileIcon(doc.fileType)}
                      <p className="text-xs text-muted-foreground mt-1 uppercase">{doc.fileType}</p>
                    </div>
                  )}
                  
                  {/* OCR badge */}
                  {storedFile && storedFile.ocrStatus !== 'not_applicable' && (
                    <div className="absolute top-2 right-2">
                      {getOcrStatusBadge(storedFile)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <h3 className="font-medium text-foreground truncate">{doc.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{doc.description || 'No description'}</p>
                
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span className="capitalize px-2 py-0.5 rounded bg-muted/30">{doc.category}</span>
                  <span>{formatDate(doc.uploadDate)}</span>
                </div>

                {/* OCR preview */}
                {storedFile?.ocrText && (
                  <div className="mt-3 p-2 bg-muted/20 rounded text-xs text-muted-foreground line-clamp-2">
                    <span className="font-medium">OCR: </span>
                    {storedFile.ocrText.substring(0, 100)}...
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedDocument(doc);
                      setFormData({
                        name: doc.name,
                        category: doc.category,
                        description: doc.description || '',
                        tags: doc.tags?.join(', ') || '',
                        notes: doc.notes || '',
                      });
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  {storedFile && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(fileApi.getDownloadUrl(storedFile.id), '_blank')}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredDocuments.length === 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
            <p className="text-muted-foreground mb-4">Upload receipts, manuals, and important documents</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog 
        open={isAddDialogOpen} 
        onClose={() => !isUploading && setIsAddDialogOpen(false)}
        title="Upload Documents"
      >
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            dragActive 
              ? "border-primary bg-primary/10" 
              : "border-border hover:border-primary/50"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
              <p className="text-foreground">Uploading files...</p>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-foreground mb-2">Drag & drop files here</p>
              <p className="text-sm text-muted-foreground mb-4">or</p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                />
                <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                  Browse Files
                </span>
              </label>
              <p className="text-xs text-muted-foreground mt-4">
                Supports images, PDFs, and documents up to 50MB
              </p>
            </>
          )}
        </div>

        <div className="mt-4 p-4 bg-muted/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Scan className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Automatic OCR</p>
              <p className="text-sm text-muted-foreground">
                Images are automatically scanned for text, making receipts searchable by content.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isUploading}>
            Cancel
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        title="Edit Document"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          if (selectedDocument) {
            updateDocument(selectedDocument.id, {
              name: formData.name,
              category: formData.category,
              description: formData.description,
              tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
              notes: formData.notes,
            });
            setIsEditDialogOpen(false);
            toast.success('Updated', 'Document updated successfully');
          }
        }}>
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
              options={[
                { value: 'receipt', label: 'Receipt' },
                { value: 'manual', label: 'Manual' },
                { value: 'invoice', label: 'Invoice' },
                { value: 'warranty', label: 'Warranty' },
                { value: 'photo', label: 'Photo' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
            <Input
              label="Tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="kitchen, receipt, home depot"
            />
            <Textarea
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* View Dialog */}
      <Dialog 
        open={isViewDialogOpen} 
        onClose={() => setIsViewDialogOpen(false)}
        title={selectedDocument?.name || 'Document Details'}
      >
        {selectedDocument && (() => {
          const storedFile = storedFiles.find(f => f.id === selectedDocument.id);
          
          return (
            <div className="space-y-4">
              {/* Preview */}
              <div className="aspect-video bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
                {storedFile && fileApi.isImage(storedFile.mimeType) ? (
                  <img 
                    src={fileApi.getViewUrl(storedFile.id)} 
                    alt={selectedDocument.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    {getFileIcon(selectedDocument.fileType)}
                    <p className="text-muted-foreground mt-2 uppercase">{selectedDocument.fileType}</p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium text-foreground capitalize">{selectedDocument.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium text-foreground">
                    {fileApi.formatFileSize(selectedDocument.fileSize || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Uploaded</p>
                  <p className="font-medium text-foreground">{formatDate(selectedDocument.uploadDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium text-foreground uppercase">{selectedDocument.fileType}</p>
                </div>
              </div>

              {selectedDocument.description && (
                <div>
                  <p className="text-muted-foreground text-sm">Description</p>
                  <p className="text-foreground">{selectedDocument.description}</p>
                </div>
              )}

              {/* OCR Text */}
              {storedFile?.ocrText && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Scan className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Extracted Text (OCR)</p>
                    {getOcrStatusBadge(storedFile)}
                  </div>
                  <div className="p-3 bg-muted/20 rounded-lg text-sm text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {storedFile.ocrText}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedDocument.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <DialogFooter>
                {storedFile && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(fileApi.getViewUrl(storedFile.id), '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(fileApi.getDownloadUrl(storedFile.id), '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </>
                )}
                <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </div>
          );
        })()}
      </Dialog>
    </div>
  );
}
