import { useState, useEffect } from 'react';
import { useDocumentStore, Document } from '../store/documentStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  Download,
  Upload,
  File,
  Image,
  Calendar,
  Tag,
  Link as LinkIcon,
  FolderOpen,
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

export default function Documents() {
  const {
    documents,
    isLoading,
    addDocument,
    updateDocument,
    deleteDocument,
    searchDocuments,
    getDocumentsByCategory,
    loadFromStorage,
  } = useDocumentStore();
  
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | Document['category']>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Load documents from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const getDisplayedDocuments = () => {
    let filtered = documents;
    
    if (searchQuery) {
      filtered = searchDocuments(searchQuery);
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter((d) => d.category === filterCategory);
    }
    
    return filtered.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  };

  const displayedDocuments = getDisplayedDocuments();

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / 1024 / 1024;
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  const getCategoryIcon = (category: Document['category']) => {
    switch (category) {
      case 'manual':
        return FileText;
      case 'receipt':
        return File;
      case 'invoice':
        return FileText;
      case 'warranty':
        return FileText;
      case 'photo':
        return Image;
      default:
        return File;
    }
  };

  const getCategoryStyles = (category: Document['category']) => {
    switch (category) {
      case 'manual':
        return 'bg-blue-500/20 text-blue-400 dark:text-blue-300 border-blue-500/30';
      case 'receipt':
        return 'bg-emerald-500/20 text-emerald-400 dark:text-emerald-300 border-emerald-500/30';
      case 'invoice':
        return 'bg-purple-500/20 text-purple-400 dark:text-purple-300 border-purple-500/30';
      case 'warranty':
        return 'bg-orange-500/20 text-orange-400 dark:text-orange-300 border-orange-500/30';
      case 'photo':
        return 'bg-pink-500/20 text-pink-400 dark:text-pink-300 border-pink-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 dark:text-slate-300 border-slate-500/30';
    }
  };

  const handleAddDocument = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const tags = (formData.get('tags') as string)
      ?.split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0) || [];
    
    const newDocument: Document = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      category: (formData.get('category') as Document['category']) || 'other',
      relatedType: (formData.get('relatedType') as Document['relatedType']) || undefined,
      relatedTo: formData.get('relatedTo') as string || undefined,
      fileType: formData.get('fileType') as string || 'pdf',
      fileSize: formData.get('fileSize') ? Number(formData.get('fileSize')) : undefined,
      uploadDate: new Date().toISOString().split('T')[0],
      description: formData.get('description') as string || undefined,
      tags: tags.length > 0 ? tags : undefined,
      url: formData.get('url') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };
    
    addDocument(newDocument);
    setIsAddDialogOpen(false);
    toast.success('Document Added', `Successfully added "${newDocument.name}"`);
  };

  const handleEditDocument = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDocument) return;

    const formData = new FormData(e.currentTarget);
    
    const tags = (formData.get('tags') as string)
      ?.split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0) || [];
    
    const updates: Partial<Document> = {
      name: formData.get('name') as string,
      category: (formData.get('category') as Document['category']) || 'other',
      relatedType: (formData.get('relatedType') as Document['relatedType']) || undefined,
      relatedTo: formData.get('relatedTo') as string || undefined,
      fileType: formData.get('fileType') as string || 'pdf',
      fileSize: formData.get('fileSize') ? Number(formData.get('fileSize')) : undefined,
      description: formData.get('description') as string || undefined,
      tags: tags.length > 0 ? tags : undefined,
      url: formData.get('url') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };
    
    updateDocument(selectedDocument.id, updates);
    setIsEditDialogOpen(false);
    setSelectedDocument(null);
    toast.success('Document Updated', `Successfully updated "${updates.name}"`);
  };

  const handleDeleteDocument = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteDocument(id);
      toast.success('Document Deleted', `Successfully deleted "${name}"`);
    }
  };

  const openEditDialog = (document: Document) => {
    setSelectedDocument(document);
    setIsEditDialogOpen(true);
  };

  const categoryStats = {
    manual: getDocumentsByCategory('manual').length,
    receipt: getDocumentsByCategory('receipt').length,
    invoice: getDocumentsByCategory('invoice').length,
    warranty: getDocumentsByCategory('warranty').length,
    photo: getDocumentsByCategory('photo').length,
    other: getDocumentsByCategory('other').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-muted/20 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Documents</h1>
          <p className="text-muted-foreground">Your digital file vault for all home documents</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Document</span>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <Button
            variant={filterCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterCategory('all')}
            size="sm"
          >
            All
          </Button>
          {(['manual', 'receipt', 'invoice', 'warranty', 'photo', 'other'] as const).map((category) => (
            <Button
              key={category}
              variant={filterCategory === category ? 'default' : 'outline'}
              onClick={() => setFilterCategory(category)}
              size="sm"
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}s ({categoryStats[category]})
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Documents</p>
            <p className="text-3xl font-bold text-blue-500">{documents.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Receipts</p>
            <p className="text-3xl font-bold text-emerald-500">{categoryStats.receipt}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Invoices</p>
            <p className="text-3xl font-bold text-purple-500">{categoryStats.invoice}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Manuals</p>
            <p className="text-3xl font-bold text-orange-500">{categoryStats.manual}</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Grid */}
      {displayedDocuments.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery || filterCategory !== 'all' ? 'No documents found' : 'No documents yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start building your digital document vault'}
              </p>
              {!searchQuery && filterCategory === 'all' && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Document
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedDocuments.map((document) => {
            const CategoryIcon = getCategoryIcon(document.category);
            const categoryStyles = getCategoryStyles(document.category);

            return (
              <Card key={document.id} className="hover:shadow-xl transition-all bg-card/80 backdrop-blur-sm border-border/50">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <CategoryIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground line-clamp-1">
                          {document.name}
                        </h3>
                      </div>
                      {document.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{document.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={() => openEditDialog(document)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(document.id, document.name)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Category Badge */}
                  <div className="flex items-center space-x-2 mb-4">
                    <span className={cn('px-3 py-1 rounded-full text-xs font-medium border', categoryStyles)}>
                      {document.category.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 bg-muted/30 text-muted-foreground rounded text-xs border border-border/50">
                      {(document.fileType || 'unknown').toUpperCase()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Uploaded {formatDate(document.uploadDate)}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <File className="w-4 h-4 mr-2" />
                      <span>Size: {formatFileSize(document.fileSize)}</span>
                    </div>
                    {document.relatedType && (
                      <div className="flex items-center text-muted-foreground">
                        <LinkIcon className="w-4 h-4 mr-2" />
                        <span className="capitalize">Related to {document.relatedType}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {document.tags && document.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {document.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t border-border/50 flex gap-2">
                    {document.url ? (
                      <a
                        href={document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    ) : (
                      <button
                        disabled
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-muted/20 text-muted-foreground rounded cursor-not-allowed text-sm border border-dashed border-border"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        No File
                      </button>
                    )}
                  </div>

                  {/* Notes */}
                  {document.notes && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground italic">"{document.notes}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Document Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Add New Document"
        description="Add a new document to your vault"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddDocument}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="name"
              label="Document Name"
              required
              placeholder="Samsung Fridge Manual"
              className="col-span-2"
            />
            <Select
              name="category"
              label="Category"
              options={[
                { value: 'manual', label: 'Manual' },
                { value: 'receipt', label: 'Receipt' },
                { value: 'invoice', label: 'Invoice' },
                { value: 'warranty', label: 'Warranty' },
                { value: 'photo', label: 'Photo' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input name="fileType" label="File Type" placeholder="pdf" />
            <Select
              name="relatedType"
              label="Related To (Optional)"
              options={[
                { value: '', label: 'None' },
                { value: 'item', label: 'Inventory Item' },
                { value: 'project', label: 'Project' },
                { value: 'vendor', label: 'Vendor' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
            />
            <Input name="relatedTo" label="Related ID" placeholder="Item/Project ID" />
            <Input
              name="fileSize"
              label="File Size (bytes)"
              type="number"
              placeholder="1048576"
            />
            <Input name="url" label="File URL (Optional)" placeholder="https://..." className="col-span-2" />
            <Textarea
              name="description"
              label="Description"
              placeholder="Brief description of the document..."
              className="col-span-2"
            />
            <Input
              name="tags"
              label="Tags (comma-separated)"
              placeholder="manual, refrigerator, samsung"
              className="col-span-2"
            />
            <Textarea
              name="notes"
              label="Notes"
              placeholder="Additional notes..."
              className="col-span-2"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Document</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedDocument(null);
        }}
        title="Edit Document"
        description="Update document information"
        maxWidth="2xl"
      >
        {selectedDocument && (
          <form onSubmit={handleEditDocument}>
            <div className="grid grid-cols-2 gap-4">
              <Input
                name="name"
                label="Document Name"
                required
                defaultValue={selectedDocument.name}
                className="col-span-2"
              />
              <Select
                name="category"
                label="Category"
                defaultValue={selectedDocument.category}
                options={[
                  { value: 'manual', label: 'Manual' },
                  { value: 'receipt', label: 'Receipt' },
                  { value: 'invoice', label: 'Invoice' },
                  { value: 'warranty', label: 'Warranty' },
                  { value: 'photo', label: 'Photo' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <Input name="fileType" label="File Type" defaultValue={selectedDocument.fileType} />
              <Select
                name="relatedType"
                label="Related To (Optional)"
                defaultValue={selectedDocument.relatedType || ''}
                options={[
                  { value: '', label: 'None' },
                  { value: 'item', label: 'Inventory Item' },
                  { value: 'project', label: 'Project' },
                  { value: 'vendor', label: 'Vendor' },
                  { value: 'maintenance', label: 'Maintenance' },
                ]}
              />
              <Input name="relatedTo" label="Related ID" defaultValue={selectedDocument.relatedTo} />
              <Input
                name="fileSize"
                label="File Size (bytes)"
                type="number"
                defaultValue={selectedDocument.fileSize}
              />
              <Input name="url" label="File URL (Optional)" defaultValue={selectedDocument.url} className="col-span-2" />
              <Textarea
                name="description"
                label="Description"
                defaultValue={selectedDocument.description}
                className="col-span-2"
              />
              <Input
                name="tags"
                label="Tags (comma-separated)"
                defaultValue={selectedDocument.tags?.join(', ')}
                className="col-span-2"
              />
              <Textarea
                name="notes"
                label="Notes"
                defaultValue={selectedDocument.notes}
                className="col-span-2"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedDocument(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </div>
  );
}
