import { useState, useEffect, useCallback } from 'react';
import { useProjectStore, Project } from '../store/projectStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { TagInput, PROJECT_TAG_SUGGESTIONS } from '../components/ui/TagInput';
import { useToast } from '../components/ui/Toast';
import { 
  Plus, GripVertical, Calendar, DollarSign, Tag, Edit, Trash2, 
  ChevronDown, ChevronRight, LayoutGrid, List, Filter,
  ArrowRight, Check, Clock, Pause, Archive
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

type ViewMode = 'kanban' | 'list';

export default function Projects() {
  const { projects, addProject, updateProject, deleteProject, moveProject } = useProjectStore();
  const toast = useToast();
  const [draggedProject, setDraggedProject] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['backlog', 'planning', 'in-progress']));
  
  // Tag state for add/edit dialogs
  const [newProjectTags, setNewProjectTags] = useState<string[]>([]);
  const [editProjectTags, setEditProjectTags] = useState<string[]>([]);

  // Responsive view mode detection
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('list');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const columns = [
    { id: 'backlog', title: 'Backlog', color: 'slate', icon: Archive, gradient: 'from-slate-500/20 to-slate-600/20' },
    { id: 'planning', title: 'Planning', color: 'blue', icon: Clock, gradient: 'from-blue-500/20 to-blue-600/20' },
    { id: 'in-progress', title: 'In Progress', color: 'amber', icon: ArrowRight, gradient: 'from-amber-500/20 to-amber-600/20' },
    { id: 'on-hold', title: 'On Hold', color: 'orange', icon: Pause, gradient: 'from-orange-500/20 to-orange-600/20' },
    { id: 'completed', title: 'Completed', color: 'emerald', icon: Check, gradient: 'from-emerald-500/20 to-emerald-600/20' },
  ];

  const handleDragStart = (projectId: string) => {
    setDraggedProject(projectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: Project['status']) => {
    if (draggedProject) {
      const project = projects.find((p) => p.id === draggedProject);
      moveProject(draggedProject, status);
      setDraggedProject(null);
      if (project) {
        const column = columns.find((c) => c.id === status);
        toast.info('Project Moved', `Moved "${project.name}" to ${column?.title}`);
      }
    }
  };

  const getProjectsByStatus = useCallback((status: string) => {
    return projects.filter((p) => p.status === status);
  }, [projects]);

  const getFilteredProjects = useCallback(() => {
    if (activeFilter === 'all') return projects;
    return projects.filter((p) => p.status === activeFilter);
  }, [projects, activeFilter]);

  const getPriorityStyles = (priority: string) => {
    const styles = {
      low: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[priority as keyof typeof styles] || styles.medium;
  };

  const getColumnAccentColor = (color: string) => {
    const colors: Record<string, string> = {
      slate: 'bg-slate-500',
      blue: 'bg-blue-500',
      amber: 'bg-amber-500',
      orange: 'bg-orange-500',
      emerald: 'bg-emerald-500',
    };
    return colors[color] || 'bg-slate-500';
  };

  const getStatusColor = (status: string) => {
    const column = columns.find(c => c.id === status);
    return column?.color || 'slate';
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Quick status change for mobile
  const handleQuickStatusChange = (projectId: string, newStatus: Project['status']) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      moveProject(projectId, newStatus);
      const column = columns.find(c => c.id === newStatus);
      toast.success('Status Updated', `"${project.name}" moved to ${column?.title}`);
    }
  };

  const handleAddProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newProject: Project = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      status: (formData.get('status') as any) || 'backlog',
      priority: (formData.get('priority') as any) || 'medium',
      budget: formData.get('budget') ? Number(formData.get('budget')) : undefined,
      actualCost: formData.get('actualCost') ? Number(formData.get('actualCost')) : undefined,
      startDate: formData.get('startDate') as string || undefined,
      endDate: formData.get('endDate') as string || undefined,
      progress: formData.get('progress') ? Number(formData.get('progress')) : 0,
      category: formData.get('category') as string,
      tags: newProjectTags,
    };
    addProject(newProject);
    setIsAddDialogOpen(false);
    setNewProjectTags([]);
    toast.success('Project Added', `Successfully added "${newProject.name}"`);
  };

  const handleEditProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    const formData = new FormData(e.currentTarget);
    const updates: Partial<Project> = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      status: (formData.get('status') as any) || 'backlog',
      priority: (formData.get('priority') as any) || 'medium',
      budget: formData.get('budget') ? Number(formData.get('budget')) : undefined,
      actualCost: formData.get('actualCost') ? Number(formData.get('actualCost')) : undefined,
      startDate: formData.get('startDate') as string || undefined,
      endDate: formData.get('endDate') as string || undefined,
      progress: formData.get('progress') ? Number(formData.get('progress')) : 0,
      category: formData.get('category') as string,
      tags: editProjectTags,
    };
    updateProject(selectedProject.id, updates);
    setIsEditDialogOpen(false);
    setSelectedProject(null);
    setEditProjectTags([]);
    toast.success('Project Updated', `Successfully updated "${updates.name}"`);
  };

  const handleDeleteProject = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteProject(id);
      toast.success('Project Deleted', `Removed "${name}"`);
    }
  };

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setEditProjectTags(project.tags || []);
    setIsEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setNewProjectTags([]);
    setIsAddDialogOpen(true);
  };

  // Compact project card for list view
  const renderListCard = (project: Project) => {
    const statusColor = getStatusColor(project.status);
    const column = columns.find(c => c.id === project.status);
    const StatusIcon = column?.icon || Archive;

    return (
      <div
        key={project.id}
        className={cn(
          "bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 p-3",
          "hover:bg-card transition-all touch-manipulation"
        )}
      >
        <div className="flex items-start gap-3">
          {/* Status indicator */}
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            `bg-${statusColor}-500/20`
          )}>
            <StatusIcon className={cn("w-5 h-5", `text-${statusColor}-500`)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-foreground truncate">{project.name}</h4>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openEditDialog(project)}
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteProject(project.id, project.name)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium border",
                getPriorityStyles(project.priority)
              )}>
                {project.priority}
              </span>
              
              {project.budget && (
                <span className="text-xs text-muted-foreground flex items-center">
                  <DollarSign className="w-3 h-3 mr-0.5" />
                  {formatCurrency(project.actualCost || 0)} / {formatCurrency(project.budget)}
                </span>
              )}

              {project.progress > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", `bg-${statusColor}-500`)}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{project.progress}%</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {project.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-xs text-primary"
                  >
                    {tag}
                  </span>
                ))}
                {project.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{project.tags.length - 3}</span>
                )}
              </div>
            )}

            {/* Quick status change - Mobile only */}
            <div className="flex gap-1 mt-3 overflow-x-auto pb-1 -mb-1 md:hidden">
              {columns.map((col) => {
                const Icon = col.icon;
                const isActive = project.status === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => !isActive && handleQuickStatusChange(project.id, col.id as Project['status'])}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap transition-all",
                      isActive 
                        ? `bg-${col.color}-500 text-white` 
                        : `bg-${col.color}-500/10 text-${col.color}-500 hover:bg-${col.color}-500/20`
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{col.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Kanban card for desktop
  const renderKanbanCard = (project: Project, columnColor: string) => (
    <Card
      key={project.id}
      draggable
      onDragStart={() => handleDragStart(project.id)}
      className={cn(
        "cursor-move hover:shadow-xl transition-all border-border/50",
        "bg-card/80 backdrop-blur-sm hover:bg-card",
        draggedProject === project.id && "opacity-50 scale-95"
      )}
    >
      <CardContent className="p-4">
        {/* Project Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-2 flex-1 min-w-0">
            <GripVertical className="w-4 h-4 text-muted-foreground mt-1 cursor-grab flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate">{project.name}</h4>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex space-x-1 flex-shrink-0 ml-2">
            <button
              onClick={(e) => { e.stopPropagation(); openEditDialog(project); }}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id, project.name); }}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Priority & Category */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={cn(
            "px-2 py-1 rounded text-xs font-medium border",
            getPriorityStyles(project.priority)
          )}>
            {project.priority.toUpperCase()}
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-muted/50 text-muted-foreground border border-border/50 truncate max-w-[120px]">
            {project.category}
          </span>
        </div>

        {/* Progress Bar */}
        {project.progress > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span className="font-medium text-foreground">{project.progress}%</span>
            </div>
            <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", `bg-${columnColor}-500`)}
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Project Details */}
        <div className="space-y-2 text-sm">
          {project.budget && (
            <div className="flex items-center text-muted-foreground">
              <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">
                {formatCurrency(project.actualCost || 0)} / {formatCurrency(project.budget)}
              </span>
            </div>
          )}
          {(project.startDate || project.endDate) && (
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate text-xs">
                {project.startDate && new Date(project.startDate).toLocaleDateString()}
                {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString()}`}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-xs text-primary"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{project.tags.length - 3}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Project Tracker</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage all your home improvement projects</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle - Desktop only */}
          <div className="hidden md:flex items-center bg-muted/30 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                "p-2 rounded-md transition-all",
                viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Kanban View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-md transition-all",
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={openAddDialog} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Project</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
        {columns.map((column) => {
          const count = getProjectsByStatus(column.id).length;
          const Icon = column.icon;
          return (
            <Card 
              key={column.id} 
              className={cn(
                "overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 cursor-pointer transition-all",
                activeFilter === column.id && "ring-2 ring-primary"
              )}
              onClick={() => setActiveFilter(activeFilter === column.id ? 'all' : column.id)}
            >
              <CardContent className="p-2 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("w-4 h-4", `text-${column.color}-500`)} />
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">{column.title}</p>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{count}</p>
              </CardContent>
              <div className={cn("h-1", getColumnAccentColor(column.color))} />
            </Card>
          );
        })}
      </div>

      {/* Filter indicator */}
      {activeFilter !== 'all' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>Showing {columns.find(c => c.id === activeFilter)?.title} projects</span>
          <button 
            onClick={() => setActiveFilter('all')}
            className="text-primary hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {activeFilter === 'all' ? (
            // Grouped by status with collapsible sections
            columns.map((column) => {
              const columnProjects = getProjectsByStatus(column.id);
              const isExpanded = expandedSections.has(column.id);
              const Icon = column.icon;

              return (
                <div key={column.id} className="bg-card/30 rounded-xl border border-border/50 overflow-hidden">
                  <button
                    onClick={() => toggleSection(column.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", `bg-${column.color}-500/20`)}>
                        <Icon className={cn("w-4 h-4", `text-${column.color}-500`)} />
                      </div>
                      <span className="font-semibold text-foreground">{column.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                        {columnProjects.length}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="p-3 pt-0 space-y-2">
                      {columnProjects.length === 0 ? (
                        <p className="text-center py-4 text-muted-foreground text-sm">No projects</p>
                      ) : (
                        columnProjects.map((project) => renderListCard(project))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Filtered view - flat list
            <div className="space-y-2">
              {getFilteredProjects().length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No projects in this category</p>
                </div>
              ) : (
                getFilteredProjects().map((project) => renderListCard(project))
              )}
            </div>
          )}
        </div>
      )}

      {/* Kanban View - Desktop */}
      {viewMode === 'kanban' && (
        <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
          {(activeFilter === 'all' ? columns : columns.filter(c => c.id === activeFilter)).map((column) => (
            <div
              key={column.id}
              className="flex-shrink-0 w-80"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id as Project['status'])}
            >
              <div className={cn(
                "rounded-xl p-4 backdrop-blur-md border border-border/50 h-full min-h-[400px]",
                "bg-gradient-to-b", column.gradient
              )}>
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground flex items-center">
                    <span className={cn("w-3 h-3 rounded-full mr-2", getColumnAccentColor(column.color))} />
                    {column.title}
                    <span className="ml-2 px-2 py-0.5 bg-background/50 rounded-full text-xs text-muted-foreground">
                      {getProjectsByStatus(column.id).length}
                    </span>
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-background/50"
                    onClick={openAddDialog}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Project Cards */}
                <div className="space-y-3">
                  {getProjectsByStatus(column.id).map((project) => renderKanbanCard(project, column.color))}

                  {/* Empty State */}
                  {getProjectsByStatus(column.id).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border/50 rounded-lg">
                      <p>No projects</p>
                      <p className="text-xs mt-1">Drag here or click +</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onClose={() => { setIsAddDialogOpen(false); setNewProjectTags([]); }}
        title="Add New Project"
        description="Create a new home improvement project"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddProject}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="name" label="Project Name" required placeholder="Kitchen Remodel" />
            <Input name="category" label="Category" required placeholder="Renovation" />
            
            <Select
              name="status"
              label="Status"
              required
              options={columns.map(c => ({ value: c.id, label: c.title }))}
            />
            
            <Select
              name="priority"
              label="Priority"
              required
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />

            <Input name="budget" label="Budget" type="number" step="0.01" placeholder="5000.00" />
            <Input name="actualCost" label="Actual Cost" type="number" step="0.01" placeholder="0.00" />
            
            <Input name="startDate" label="Start Date" type="date" />
            <Input name="endDate" label="End Date" type="date" />
            
            <Input name="progress" label="Progress (%)" type="number" min="0" max="100" defaultValue="0" />
            
            <div className="md:col-span-2">
              <TagInput
                label="Tags"
                tags={newProjectTags}
                onChange={setNewProjectTags}
                suggestions={PROJECT_TAG_SUGGESTIONS}
                placeholder="Add tags like 'outdoor', 'electrical'..."
              />
            </div>
            
            <Textarea 
              name="description" 
              label="Description" 
              placeholder="Project details and goals..." 
              rows={3}
              className="md:col-span-2"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); setNewProjectTags([]); }}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => { setIsEditDialogOpen(false); setSelectedProject(null); setEditProjectTags([]); }}
        title="Edit Project"
        description="Update project details"
        maxWidth="2xl"
      >
        {selectedProject && (
          <form onSubmit={handleEditProject}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input name="name" label="Project Name" required defaultValue={selectedProject.name} />
              <Input name="category" label="Category" required defaultValue={selectedProject.category} />
              
              <Select
                name="status"
                label="Status"
                required
                defaultValue={selectedProject.status}
                options={[
                  ...columns.map(c => ({ value: c.id, label: c.title })),
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
              
              <Select
                name="priority"
                label="Priority"
                required
                defaultValue={selectedProject.priority}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
              />

              <Input name="budget" label="Budget" type="number" step="0.01" defaultValue={selectedProject.budget} />
              <Input name="actualCost" label="Actual Cost" type="number" step="0.01" defaultValue={selectedProject.actualCost} />
              
              <Input name="startDate" label="Start Date" type="date" defaultValue={selectedProject.startDate} />
              <Input name="endDate" label="End Date" type="date" defaultValue={selectedProject.endDate} />
              
              <Input name="progress" label="Progress (%)" type="number" min="0" max="100" defaultValue={selectedProject.progress} />
              
              <div className="md:col-span-2">
                <TagInput
                  label="Tags"
                  tags={editProjectTags}
                  onChange={setEditProjectTags}
                  suggestions={PROJECT_TAG_SUGGESTIONS}
                  placeholder="Add tags like 'outdoor', 'electrical'..."
                />
              </div>
              
              <Textarea 
                name="description" 
                label="Description" 
                defaultValue={selectedProject.description}
                rows={3}
                className="md:col-span-2"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedProject(null); setEditProjectTags([]); }}>
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
