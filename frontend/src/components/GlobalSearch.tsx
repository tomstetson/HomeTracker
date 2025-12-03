import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  Search, X, FileText, FolderKanban, Package, Wrench, Users,
  Shield, Heart, Settings, Home, HardDrive, FileSpreadsheet,
  ArrowRight, Command, CornerDownLeft
} from 'lucide-react';
import { cn } from '../lib/utils';

// Import all stores
import { useProjectStore } from '../store/projectStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useVendorStore } from '../store/vendorStore';
import { useWarrantyStore } from '../store/warrantyStore';
import { useMaintenanceStore } from '../store/maintenanceStore';
import { useDocumentStore } from '../store/documentStore';

interface SearchResult {
  id: string;
  type: 'page' | 'project' | 'item' | 'vendor' | 'warranty' | 'maintenance' | 'document';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  href: string;
  highlight?: string;
}

// Navigation pages
const PAGES: SearchResult[] = [
  { id: 'page-dashboard', type: 'page', title: 'Dashboard', subtitle: 'Home overview', icon: <Home className="w-4 h-4" />, href: '/' },
  { id: 'page-projects', type: 'page', title: 'Projects', subtitle: 'Kanban board', icon: <FolderKanban className="w-4 h-4" />, href: '/projects' },
  { id: 'page-inventory', type: 'page', title: 'Inventory', subtitle: 'Track items', icon: <Package className="w-4 h-4" />, href: '/items' },
  { id: 'page-maintenance', type: 'page', title: 'Maintenance', subtitle: 'Tasks & schedules', icon: <Wrench className="w-4 h-4" />, href: '/maintenance' },
  { id: 'page-vendors', type: 'page', title: 'Vendors', subtitle: 'Contractors & services', icon: <Users className="w-4 h-4" />, href: '/vendors' },
  { id: 'page-warranties', type: 'page', title: 'Warranties', subtitle: 'Track expirations', icon: <Shield className="w-4 h-4" />, href: '/warranties' },
  { id: 'page-vitals', type: 'page', title: 'Home Vitals', subtitle: 'Emergency info', icon: <Heart className="w-4 h-4" />, href: '/home-vitals' },
  { id: 'page-documents', type: 'page', title: 'Documents', subtitle: 'Files & receipts', icon: <FileText className="w-4 h-4" />, href: '/documents' },
  { id: 'page-export', type: 'page', title: 'Data Export', subtitle: 'Excel view', icon: <FileSpreadsheet className="w-4 h-4" />, href: '/data' },
  { id: 'page-backup', type: 'page', title: 'Backup', subtitle: 'Storage & sync', icon: <HardDrive className="w-4 h-4" />, href: '/backup' },
  { id: 'page-settings', type: 'page', title: 'Settings', subtitle: 'Configuration', icon: <Settings className="w-4 h-4" />, href: '/settings' },
];

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Get data from stores
  const { projects } = useProjectStore();
  const { items } = useInventoryStore();
  const { vendors } = useVendorStore();
  const { warranties } = useWarrantyStore();
  const { tasks } = useMaintenanceStore();
  const { documents } = useDocumentStore();

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search function
  const search = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(PAGES.slice(0, 6)); // Show pages when empty
      return;
    }

    const q = searchQuery.toLowerCase();
    const allResults: SearchResult[] = [];

    // Search pages
    PAGES.forEach(page => {
      if (page.title.toLowerCase().includes(q) || page.subtitle?.toLowerCase().includes(q)) {
        allResults.push(page);
      }
    });

    // Search projects
    projects.forEach(project => {
      const matches = 
        project.name.toLowerCase().includes(q) ||
        project.description?.toLowerCase().includes(q) ||
        project.tags?.some(t => t.toLowerCase().includes(q));
      
      if (matches) {
        allResults.push({
          id: `project-${project.id}`,
          type: 'project',
          title: project.name,
          subtitle: `${project.status} • ${project.category}`,
          icon: <FolderKanban className="w-4 h-4 text-blue-500" />,
          href: '/projects',
          highlight: project.description?.substring(0, 60),
        });
      }
    });

    // Search inventory items
    items.forEach(item => {
      const matches =
        item.name.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.brand?.toLowerCase().includes(q) ||
        item.modelNumber?.toLowerCase().includes(q);

      if (matches) {
        allResults.push({
          id: `item-${item.id}`,
          type: 'item',
          title: item.name,
          subtitle: `${item.location || 'No location'} • ${item.category}`,
          icon: <Package className="w-4 h-4 text-purple-500" />,
          href: '/items',
          highlight: item.brand ? `${item.brand} ${item.modelNumber || ''}` : undefined,
        });
      }
    });

    // Search vendors
    vendors.forEach(vendor => {
      const categoryString = vendor.category?.join(' ') || '';
      const matches =
        vendor.businessName.toLowerCase().includes(q) ||
        categoryString.toLowerCase().includes(q) ||
        vendor.phone?.includes(q) ||
        vendor.email?.toLowerCase().includes(q) ||
        vendor.contactPerson?.toLowerCase().includes(q);

      if (matches) {
        allResults.push({
          id: `vendor-${vendor.id}`,
          type: 'vendor',
          title: vendor.businessName,
          subtitle: vendor.category?.[0] || 'General',
          icon: <Users className="w-4 h-4 text-green-500" />,
          href: '/vendors',
          highlight: vendor.phone,
        });
      }
    });

    // Search warranties
    warranties.forEach(warranty => {
      const matches =
        warranty.itemName.toLowerCase().includes(q) ||
        warranty.provider?.toLowerCase().includes(q) ||
        warranty.notes?.toLowerCase().includes(q);

      if (matches) {
        allResults.push({
          id: `warranty-${warranty.id}`,
          type: 'warranty',
          title: warranty.itemName,
          subtitle: `Expires: ${warranty.endDate}`,
          icon: <Shield className="w-4 h-4 text-amber-500" />,
          href: '/warranties',
          highlight: warranty.provider,
        });
      }
    });

    // Search maintenance tasks
    tasks.forEach(task => {
      const matches =
        task.title.toLowerCase().includes(q) ||
        task.description?.toLowerCase().includes(q) ||
        task.category?.toLowerCase().includes(q);

      if (matches) {
        allResults.push({
          id: `task-${task.id}`,
          type: 'maintenance',
          title: task.title,
          subtitle: `${task.status} • ${task.priority}`,
          icon: <Wrench className="w-4 h-4 text-orange-500" />,
          href: '/maintenance',
          highlight: task.description?.substring(0, 60),
        });
      }
    });

    // Search documents (including OCR text)
    documents.forEach(doc => {
      const matches =
        doc.name.toLowerCase().includes(q) ||
        doc.description?.toLowerCase().includes(q) ||
        doc.tags?.some(t => t.toLowerCase().includes(q)) ||
        doc.notes?.toLowerCase().includes(q) ||
        doc.ocrText?.toLowerCase().includes(q);

      if (matches) {
        allResults.push({
          id: `doc-${doc.id}`,
          type: 'document',
          title: doc.name,
          subtitle: `${doc.category} • ${doc.fileType?.toUpperCase() || 'File'}`,
          icon: <FileText className="w-4 h-4 text-red-500" />,
          href: '/documents',
          highlight: doc.ocrText ? `OCR: ${doc.ocrText.substring(0, 50)}...` : doc.description?.substring(0, 60),
        });
      }
    });

    // Sort: pages first, then by relevance (title match > subtitle match)
    allResults.sort((a, b) => {
      if (a.type === 'page' && b.type !== 'page') return -1;
      if (b.type === 'page' && a.type !== 'page') return 1;
      
      const aTitle = a.title.toLowerCase().indexOf(q);
      const bTitle = b.title.toLowerCase().indexOf(q);
      if (aTitle !== -1 && bTitle === -1) return -1;
      if (bTitle !== -1 && aTitle === -1) return 1;
      if (aTitle !== -1 && bTitle !== -1) return aTitle - bTitle;
      
      return 0;
    });

    setResults(allResults.slice(0, 15)); // Limit to 15 results
    setSelectedIndex(0);
  }, [projects, items, vendors, warranties, tasks, documents]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 150);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex].href);
      setIsOpen(false);
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    navigate(result.href);
    setIsOpen(false);
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    const group = result.type;
    if (!acc[group]) acc[group] = [];
    acc[group].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const groupLabels: Record<string, string> = {
    page: 'Pages',
    project: 'Projects',
    item: 'Inventory',
    vendor: 'Vendors',
    warranty: 'Warranties',
    maintenance: 'Maintenance',
    document: 'Documents',
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg border border-border/50 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-background rounded border border-border">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Search modal */}
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={() => setIsOpen(false)} className="relative z-50">
          {/* Backdrop */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          {/* Modal */}
          <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-20">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="mx-auto max-w-xl transform overflow-hidden rounded-xl bg-card border border-border shadow-2xl transition-all">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 border-b border-border">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search everything..."
                    className="flex-1 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                  {results.length === 0 && query && (
                    <div className="px-4 py-8 text-center text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No results for "{query}"</p>
                    </div>
                  )}

                  {Object.entries(groupedResults).map(([group, groupItems]) => (
                    <div key={group}>
                      <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
                        {groupLabels[group]}
                      </div>
                      {groupItems.map((result) => {
                        const globalIndex = results.indexOf(result);
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                              globalIndex === selectedIndex
                                ? "bg-primary/10 text-foreground"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-muted">
                              {result.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{result.title}</p>
                              {result.subtitle && (
                                <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                              )}
                              {result.highlight && (
                                <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                                  {result.highlight}
                                </p>
                              )}
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground bg-muted/30">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-background rounded border border-border">↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-background rounded border border-border flex items-center">
                        <CornerDownLeft className="w-3 h-3" />
                      </kbd>
                      Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-background rounded border border-border">Esc</kbd>
                      Close
                    </span>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

export default GlobalSearch;
