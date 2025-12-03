import { useState, useEffect, useCallback } from 'react';
import { useProjectStore, Project } from '../store/projectStore';
import { useVendorStore } from '../store/vendorStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { TagInput, PROJECT_TAG_SUGGESTIONS } from '../components/ui/TagInput';
import { useToast } from '../components/ui/Toast';
import { 
  Plus, GripVertical, Calendar, DollarSign, Tag, Edit, Trash2, 
  ChevronDown, ChevronRight, LayoutGrid, List, Filter,
  ArrowRight, Check, Clock, Pause, Archive, CheckSquare, Square,
  ListTodo, X
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

type ViewMode = 'kanban' | 'list';

export default function Projects() {
  const { 
    projects, addProject, updateProject, deleteProject, moveProject,
    addSubtask, toggleSubtask, deleteSubtask, getSubtaskProgress 
  } = useProjectStore();
  const { vendors } = useVendorStore();
  const toast = useToast();
  const [draggedProject, setDraggedProject] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['backlog', 'planning', 'in-progress']));
  
  // Tag state for add/edit dialogs
  const [newProjectTags, setNewProjectTags] = useState<string[]>([]);
  const [editProjectTags, setEditProjectTags] = useState<string[]>([]);
  
  // Subtask state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('');
  const [newSubtaskCost, setNewSubtaskCost] = useState('');

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
      subtasks: [],
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

  const openSubtaskDialog = (project: Project) => {
    setSelectedProject(project);
    setIsSubtaskDialogOpen(true);
    setNewSubtaskTitle('');
    setNewSubtaskAssignee('');
    setNewSubtaskCost('');
  };

  const openAddDialog = () => {
    setNewProjectTags([]);
    setIsAddDialogOpen(true);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newSubtaskTitle.trim()) return;
    
    addSubtask(selectedProject.id, {
      title: newSubtaskTitle.trim(),
      completed: false,
      assignedTo: newSubtaskAssignee || undefined,
      estimatedCost: newSubtaskCost ? Number(newSubtaskCost) : undefined,
    });
    
    setNewSubtaskTitle('');
    setNewSubtaskAssignee('');
    setNewSubtaskCost('');
    toast.success('Subtask Added', `Added "${newSubtaskTitle}"`);
  };

  const handleToggleSubtask = (projectId: string, subtaskId: string) => {
    toggleSubtask(projectId, subtaskId);
  };

  const handleDeleteSubtask = (projectId: string, subtaskId: string, title: string) => {
    deleteSubtask(projectId, subtaskId);
    toast.info('Subtask Removed', `Removed "${title}"`);
  };

  // Subtask indicator component
  const SubtaskIndicator = ({ project }: { project: Project }) => {
    const progress = getSubtaskProgress(project);
    if (progress.total === 0) return null;
    
    return (
      <button
        onClick={(e) => { e.stopPropagation(); openSubtaskDialog(project); }}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs transition-colors"
        title="View subtasks"
      >
        <ListTodo className="w-3 h-3" />
        <span>{progress.completed}/{progress.total}</span>
        {progress.percentage > 0 && (
          <div className="w-8 h-1.5 bg-purple-500/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full" 
              style={{ width: `${progress.percentage}%` }} 
            />
          </div>
        )}
      </button>
    );
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
                  onClick={() => openSubtaskDialog(project)}
                  className="p-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 rounded"
                  title="Subtasks"
                >
                  <ListTodo className="w-4 h-4" />
                </button>
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
              
              <SubtaskIndicator project={project} />
              
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
              onClick={(e) => { e.stopPropagation(); openSubtaskDialog(project); }}
              className="p-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 rounded transition-colors"
              title="Subtasks"
            >
              <ListTodo className="w-4 h-4" />
            </button>
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

        {/* Priority, Category & Subtasks */}
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
          <SubtaskIndicator project={project} />
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
          <button onClick={() => setActiveFilter('all')} className="text-primary hover:underline">Clear</button>
        </div>
      )}

      {/* List View - Mobile/Tablet or when selected */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {columns.map((column) => {
            const columnProjects = getFilteredProjects().filter(p => p.status === column.id);
            if (columnProjects.length === 0 && activeFilter !== 'all') return null;
            
            return (
              <div key={column.id}>
                <button
                  onClick={() => toggleSection(column.id)}
                  className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground"
                >
                  {expandedSections.has(column.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <column.icon className={cn("w-4 h-4", `text-${column.color}-500`)} />
                  <span>{column.title}</span>
                  <span className="text-muted-foreground">({columnProjects.length})</span>
                </button>
                
                {expandedSections.has(column.id) && (
                  <div className="space-y-2 ml-6">
                    {columnProjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No projects</p>
                    ) : (
                      columnProjects.map(project => renderListCard(project))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Kanban View - Desktop */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex-shrink-0 w-72 lg:w-80"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id as Project['status'])}
            >
              <div className="bg-muted/30 backdrop-blur-sm rounded-lg border border-border/50 p-3">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={cn("w-3 h-3 rounded-full", getColumnAccentColor(column.color))} />
                    <h3 className="font-semibold text-foreground">{column.title}</h3>
                    <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                      {getProjectsByStatus(column.id).length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground p-1.5"
                    onClick={() => { setNewProjectTags([]); setIsAddDialogOpen(true); }}
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

      {/* Subtasks Dialog */}
      <Dialog
        open={isSubtaskDialogOpen}
        onClose={() => { setIsSubtaskDialogOpen(false); setSelectedProject(null); }}
        title={selectedProject ? `Subtasks: ${selectedProject.name}` : 'Subtasks'}
        description="Break down your project into manageable steps"
        maxWidth="lg"
      >
        {selectedProject && (
          <div className="space-y-4">
            {/* Add new subtask */}
            <form onSubmit={handleAddSubtask} className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label="New Subtask"
                  placeholder="e.g., Install cabinets"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                />
              </div>
              <Select
                value={newSubtaskAssignee}
                onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                options={[
                  { value: '', label: 'Assign to...' },
                  { value: 'DIY', label: 'DIY / Homeowner' },
                  ...vendors.map(v => ({ value: v.businessName, label: v.businessName })),
                ]}
                className="w-40"
              />
              <Input
                type="number"
                placeholder="Est. cost"
                value={newSubtaskCost}
                onChange={(e) => setNewSubtaskCost(e.target.value)}
                className="w-28"
              />
              <Button type="submit" disabled={!newSubtaskTitle.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </form>

            {/* Progress summary */}
            {selectedProject.subtasks && selectedProject.subtasks.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">
                      {getSubtaskProgress(selectedProject).completed} / {getSubtaskProgress(selectedProject).total} complete
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all" 
                      style={{ width: `${getSubtaskProgress(selectedProject).percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Subtask list */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(!selectedProject.subtasks || selectedProject.subtasks.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No subtasks yet</p>
                  <p className="text-sm">Add subtasks to break down this project</p>
                </div>
              ) : (
                selectedProject.subtasks.sort((a, b) => a.order - b.order).map((subtask) => (
                  <div 
                    key={subtask.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      subtask.completed 
                        ? "bg-emerald-500/5 border-emerald-500/20" 
                        : "bg-card/50 border-border/50 hover:bg-card/80"
                    )}
                  >
                    <button
                      onClick={() => handleToggleSubtask(selectedProject.id, subtask.id)}
                      className="flex-shrink-0"
                    >
                      {subtask.completed ? (
                        <CheckSquare className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium",
                        subtask.completed ? "line-through text-muted-foreground" : "text-foreground"
                      )}>
                        {subtask.title}
                      </p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {subtask.assignedTo && <span>{subtask.assignedTo}</span>}
                        {subtask.estimatedCost && <span>• {formatCurrency(subtask.estimatedCost)}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSubtask(selectedProject.id, subtask.id, subtask.title)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsSubtaskDialogOpen(false); setSelectedProject(null); }}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
