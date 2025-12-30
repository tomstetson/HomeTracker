import { useState, useMemo } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import {
  Search,
  FileText,
  File,
  FileImage,
  Calendar,
  Link2,
  Unlink,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { fileApi } from '../lib/fileApi';

interface DocumentLinkSelectorProps {
  onLink: (docId: string) => void;
  onUnlink: (docId: string) => void;
  itemId: string;
}

export function DocumentLinkSelector({
  onLink,
  onUnlink,
  itemId,
}: DocumentLinkSelectorProps) {
  const { documents } = useDocumentStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showLinked, setShowLinked] = useState(true);

  // Get linked and available documents
  const linkedDocs = useMemo(() => {
    return documents.filter(doc => 
      doc.relatedTo === itemId && doc.relatedType === 'item'
    );
  }, [documents, itemId]);

  const availableDocs = useMemo(() => {
    return documents.filter(doc => {
      // Don't show already linked docs
      if (doc.relatedTo === itemId && doc.relatedType === 'item') return false;
      
      // Category filter
      if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          doc.name.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [documents, itemId, categoryFilter, searchQuery]);

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(type)) {
      return <FileImage className="w-4 h-4 text-purple-500" />;
    }
    return <File className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Linked Documents Section */}
      {linkedDocs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Linked Documents ({linkedDocs.length})
            </h4>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowLinked(!showLinked)}
            >
              {showLinked ? 'Hide' : 'Show'}
            </Button>
          </div>
          
          {showLinked && (
            <div className="space-y-1">
              {linkedDocs.map(doc => (
                <div 
                  key={doc.id}
                  className="flex items-center gap-3 p-2 bg-primary/5 border border-primary/20 rounded-lg"
                >
                  {getFileIcon(doc.fileType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{doc.category}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(fileApi.getViewUrl(doc.id), '_blank')}
                      title="View document"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUnlink(doc.id)}
                      className="text-destructive hover:text-destructive"
                      title="Unlink document"
                    >
                      <Unlink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Documents Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">
          {linkedDocs.length > 0 ? 'Add More Documents' : 'Link Documents'}
        </h4>
        
        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-36"
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'manual', label: 'Manuals' },
              { value: 'warranty', label: 'Warranties' },
              { value: 'receipt', label: 'Receipts' },
              { value: 'invoice', label: 'Invoices' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </div>

        {/* Available Documents List */}
        <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
          {availableDocs.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents available</p>
              {searchQuery && (
                <p className="text-xs mt-1">Try a different search term</p>
              )}
            </div>
          ) : (
            availableDocs.map(doc => (
              <button
                key={doc.id}
                onClick={() => onLink(doc.id)}
                className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
              >
                {getFileIcon(doc.fileType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{doc.category}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(doc.uploadDate)}
                    </span>
                  </div>
                </div>
                <Link2 className="w-4 h-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
