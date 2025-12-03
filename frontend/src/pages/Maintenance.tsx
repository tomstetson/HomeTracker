import { useState, useEffect, useMemo } from 'react';
import { useMaintenanceStore, MaintenanceTask } from '../store/maintenanceStore';
import { useVendorStore } from '../store/vendorStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import {
  Plus,
  CheckCircle2,
  Wrench,
  History,
  Search,
  Trash2,
  SkipForward,
  Check,
  X,
  List,
  LayoutGrid,
  Clock,
  AlertTriangle,
  Calendar,
  DollarSign,
  User,
  RotateCcw,
  Edit,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';

type ViewMode = 'tasks' | 'history';
type DisplayMode = 'list' | 'card';
type TaskFilter = 'all' | 'overdue' | 'upcoming' | 'pending' | 'completed';

export default function Maintenance() {
  const { tasks, isLoading, addTask, updateTask, deleteTask, getUpcomingTasks, getOverdueTasks, loadFromStorage } =
    useMaintenanceStore();
  const { vendors } = useVendorStore();
  const toast = useToast();
  
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  
  // Unified search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const upcomingTasks = getUpcomingTasks();
  const overdueTasks = getOverdueTasks();
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  // Get unique categories from all tasks
  const allCategories = useMemo(() => {
    const cats = new Set(tasks.map(t => t.category));
    return ['all', ...Array.from(cats).sort()];
  }, [tasks]);

  // Stats calculations (used in history view)
  const _stats = useMemo(() => {
    const totalSpent = completedTasks.reduce((sum, t) => sum + (t.actualCost || 0), 0);
    const thisYearTasks = completedTasks.filter(t => {
      const year = new Date(t.completedDate || t.dueDate).getFullYear();
      return year === new Date().getFullYear();
    });
    const thisYearSpent = thisYearTasks.reduce((sum, t) => sum + (t.actualCost || 0), 0);
    
    return {
      totalCompleted: completedTasks.length,
      totalSpent,
      thisYearTasks: thisYearTasks.length,
      thisYearSpent,
    };
  }, [completedTasks]);
  void _stats; // Suppress unused warning - stats available for future use

  // Filter tasks based on view mode and filters
  const displayedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply main filter from stat buttons
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    switch (taskFilter) {
      case 'overdue':
        filtered = filtered.filter(t => t.status !== 'completed' && new Date(t.dueDate) < now);
        break;
      case 'upcoming':
        filtered = filtered.filter(t => {
          if (t.status === 'completed') return false;
          const due = new Date(t.dueDate);
          return due >= now && due <= thirtyDaysFromNow;
        });
        break;
      case 'pending':
        filtered = filtered.filter(t => t.status === 'pending');
        break;
      case 'completed':
        filtered = filtered.filter(t => t.status === 'completed');
        break;
      case 'all':
      default:
        // For 'all' in tasks mode, show non-completed. In history mode, show completed
        if (viewMode === 'tasks') {
          filtered = filtered.filter(t => t.status !== 'completed');
        } else {
          filtered = filtered.filter(t => t.status === 'completed');
        }
        break;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.assignedTo?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (a.status === 'completed' && b.status === 'completed') {
        return new Date(b.completedDate || b.dueDate).getTime() - new Date(a.completedDate || a.dueDate).getTime();
      }
      // For tasks: overdue first, then by due date
      const aOverdue = new Date(a.dueDate) < new Date() ? 0 : 1;
      const bOverdue = new Date(b.dueDate) < new Date() ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return filtered;
  }, [tasks, viewMode, searchQuery, categoryFilter, priorityFilter, taskFilter]);

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTask: MaintenanceTask = {
      id: Date.now().toString(),
      title: formData.get('title') as string,
      description: formData.get('description') as string || undefined,
      category: formData.get('category') as string,
      priority: (formData.get('priority') as any) || 'medium',
      status: 'pending',
      dueDate: formData.get('dueDate') as string,
      recurrence: (formData.get('recurrence') as any) || 'none',
      assignedTo: formData.get('assignedTo') as string || undefined,
      estimatedCost: formData.get('estimatedCost') ? Number(formData.get('estimatedCost')) : undefined,
      notes: formData.get('notes') as string || undefined,
    };
    addTask(newTask);
    setIsAddDialogOpen(false);
    toast.success('Task Added', `Successfully added "${newTask.title}"`);
  };

  const handleEditTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTask) return;
    const formData = new FormData(e.currentTarget);
    updateTask(selectedTask.id, {
      title: formData.get('title') as string,
      description: formData.get('description') as string || undefined,
      category: formData.get('category') as string,
      priority: (formData.get('priority') as any) || 'medium',
      dueDate: formData.get('dueDate') as string,
      recurrence: (formData.get('recurrence') as any) || 'none',
      assignedTo: formData.get('assignedTo') as string || undefined,
      estimatedCost: formData.get('estimatedCost') ? Number(formData.get('estimatedCost')) : undefined,
      notes: formData.get('notes') as string || undefined,
    });
    setIsEditDialogOpen(false);
    setSelectedTask(null);
    toast.success('Task Updated', 'Changes saved');
  };

  const handleCompleteTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTask) return;

    const formData = new FormData(e.currentTarget);
    const actualCost = formData.get('actualCost') ? Number(formData.get('actualCost')) : undefined;
    const performedBy = formData.get('performedBy') as string || undefined;
    const notes = formData.get('notes') as string || undefined;

    updateTask(selectedTask.id, {
      status: 'completed',
      completedDate: new Date().toISOString().split('T')[0],
      actualCost,
      assignedTo: performedBy || selectedTask.assignedTo,
      notes: notes || selectedTask.notes,
    });

    setIsCompleteDialogOpen(false);
    toast.success('Task Completed', `Marked "${selectedTask.title}" as complete`);
    setSelectedTask(null);
  };

  // Quick complete
  const handleQuickComplete = (task: MaintenanceTask) => {
    updateTask(task.id, {
      status: 'completed',
      completedDate: new Date().toISOString().split('T')[0],
    });
    toast.success('Done!', `"${task.title}" marked complete. Click completed tasks to restore.`);
  };

  // Restore task from completed
  const handleRestoreTask = (task: MaintenanceTask) => {
    updateTask(task.id, {
      status: 'pending',
      completedDate: undefined,
      actualCost: undefined,
    });
    toast.info('Restored', `"${task.title}" moved back to pending`);
    setIsRestoreDialogOpen(false);
    setSelectedTask(null);
  };

  // Skip to next cycle for recurring tasks
  const handleSkipToNextCycle = () => {
    if (!selectedTask || !selectedTask.recurrence || selectedTask.recurrence === 'none') return;
    
    const currentDue = new Date(selectedTask.dueDate);
    let nextDue: Date;
    
    switch (selectedTask.recurrence) {
      case 'weekly':
        nextDue = new Date(currentDue.setDate(currentDue.getDate() + 7));
        break;
      case 'monthly':
        nextDue = new Date(currentDue.setMonth(currentDue.getMonth() + 1));
        break;
      case 'quarterly':
        nextDue = new Date(currentDue.setMonth(currentDue.getMonth() + 3));
        break;
      case 'yearly':
        nextDue = new Date(currentDue.setFullYear(currentDue.getFullYear() + 1));
        break;
      default:
        return;
    }
    
    updateTask(selectedTask.id, {
      dueDate: nextDue.toISOString().split('T')[0],
      notes: `Skipped on ${new Date().toLocaleDateString()}. ${selectedTask.notes || ''}`,
    });
    
    setIsSkipDialogOpen(false);
    toast.info('Skipped', `"${selectedTask.title}" moved to next ${selectedTask.recurrence} cycle`);
    setSelectedTask(null);
  };

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    deleteTask(selectedTask.id);
    setIsDeleteDialogOpen(false);
    toast.success('Task Deleted', `Removed "${selectedTask.title}"`);
    setSelectedTask(null);
  };

  // Handle stat button click - sets filter
  const handleStatClick = (filter: TaskFilter) => {
    if (taskFilter === filter) {
      setTaskFilter('all');
      setViewMode('tasks');
    } else {
      setTaskFilter(filter);
      if (filter === 'completed') {
        setViewMode('history');
      } else {
        setViewMode('tasks');
      }
    }
  };

  const priorityDots = {
    low: 'bg-slate-400',
    medium: 'bg-blue-400',
    high: 'bg-orange-400',
    urgent: 'bg-red-400',
  };

  const priorityBadges = {
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-muted/20 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // List view row component
  const TaskRow = ({ task }: { task: MaintenanceTask }) => {
    const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
    const isRecurring = task.recurrence && task.recurrence !== 'none';
    const isCompleted = task.status === 'completed';

    return (
      <div className={cn(
        "group flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-all",
        isOverdue ? "border-red-500/30 bg-red-500/5" : "border-border/50 bg-card/50",
        "hover:bg-muted/30"
      )}>
        {/* Checkbox/Status */}
        {!isCompleted ? (
          <button
            onClick={() => handleQuickComplete(task)}
            className={cn(
              "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
              "border-muted-foreground/30 hover:border-emerald-500 hover:bg-emerald-500/10"
            )}
            title="Mark complete"
          >
            <Check className="w-3 h-3 opacity-0 group-hover:opacity-50 text-emerald-500" />
          </button>
        ) : (
          <button
            onClick={() => { setSelectedTask(task); setIsRestoreDialogOpen(true); }}
            className="flex-shrink-0 w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center hover:bg-amber-500/20 transition-colors"
            title="Click to restore"
          >
            <Check className="w-3 h-3 text-emerald-500 group-hover:hidden" />
            <RotateCcw className="w-3 h-3 text-amber-500 hidden group-hover:block" />
          </button>
        )}

        {/* Priority dot */}
        <div className={cn("flex-shrink-0 w-2 h-2 rounded-full", priorityDots[task.priority])} 
             title={task.priority} />

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className={cn(
              "font-medium text-sm sm:text-base",
              isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
            )}>
              {task.title}
            </span>
            {isRecurring && (
              <span className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                {task.recurrence}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
            <span className="truncate max-w-[80px] sm:max-w-none">{task.category}</span>
            <span className="hidden sm:inline">•</span>
            <span className={cn(isOverdue && !isCompleted ? 'text-red-400 font-medium' : '')}>
              {isCompleted 
                ? `Done ${formatDate(task.completedDate || task.dueDate)}`
                : isOverdue 
                  ? `Overdue`
                  : `Due ${formatDate(task.dueDate)}`
              }
            </span>
            {task.actualCost !== undefined && isCompleted && (
              <span className="hidden sm:inline">• {formatCurrency(task.actualCost)}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {!isCompleted && (
            <>
              {isRecurring && (
                <button
                  onClick={() => { setSelectedTask(task); setIsSkipDialogOpen(true); }}
                  className="p-1 sm:p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title="Skip to next cycle"
                >
                  <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
              <button
                onClick={() => { setSelectedTask(task); setIsEditDialogOpen(true); }}
                className="p-1 sm:p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                title="Edit"
              >
                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => { setSelectedTask(task); setIsCompleteDialogOpen(true); }}
                className="p-1 sm:p-1.5 rounded hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-500"
                title="Complete with details"
              >
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => { setSelectedTask(task); setIsDeleteDialogOpen(true); }}
            className="p-1 sm:p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Card view component
  const TaskCard = ({ task }: { task: MaintenanceTask }) => {
    const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
    const isRecurring = task.recurrence && task.recurrence !== 'none';
    const isCompleted = task.status === 'completed';

    return (
      <Card className={cn(
        "transition-all hover:shadow-lg",
        isOverdue ? "border-red-500/30 bg-red-500/5" : "bg-card/80 backdrop-blur-sm border-border/50"
      )}>
        <CardContent className="p-3 sm:p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {!isCompleted ? (
                  <button
                    onClick={() => handleQuickComplete(task)}
                    className={cn(
                      "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      "border-muted-foreground/30 hover:border-emerald-500 hover:bg-emerald-500/10"
                    )}
                  >
                    <Check className="w-3 h-3 opacity-0 hover:opacity-50 text-emerald-500" />
                  </button>
                ) : (
                  <button
                    onClick={() => { setSelectedTask(task); setIsRestoreDialogOpen(true); }}
                    className="flex-shrink-0 w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center hover:bg-amber-500/20"
                    title="Click to restore"
                  >
                    <Check className="w-3 h-3 text-emerald-500" />
                  </button>
                )}
                <h3 className={cn(
                  "font-semibold text-sm sm:text-base truncate",
                  isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                )}>
                  {task.title}
                </h3>
              </div>
              {task.description && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 ml-7">{task.description}</p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3">
            <span className={cn('px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium border', priorityBadges[task.priority])}>
              {task.priority.toUpperCase()}
            </span>
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-muted/30 text-muted-foreground rounded text-[10px] sm:text-xs font-medium border border-border/50">
              {task.category}
            </span>
            {isRecurring && (
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-500/20 text-purple-400 rounded text-[10px] sm:text-xs font-medium border border-purple-500/30">
                {task.recurrence}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className={isOverdue && !isCompleted ? 'text-red-400 font-medium' : ''}>
                {isCompleted
                  ? `Completed: ${formatDate(task.completedDate || task.dueDate)}`
                  : isOverdue
                    ? `Overdue: ${formatDate(task.dueDate)}`
                    : `Due: ${formatDate(task.dueDate)}`
                }
              </span>
            </div>
            {task.assignedTo && (
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{task.assignedTo}</span>
              </div>
            )}
            {(task.estimatedCost !== undefined || task.actualCost !== undefined) && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>
                  {isCompleted && task.actualCost !== undefined
                    ? `Cost: ${formatCurrency(task.actualCost)}`
                    : task.estimatedCost !== undefined
                      ? `Est: ${formatCurrency(task.estimatedCost)}`
                      : ''
                  }
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1 sm:gap-2 mt-3 pt-3 border-t border-border/50">
            {!isCompleted ? (
              <>
                {isRecurring && (
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedTask(task); setIsSkipDialogOpen(true); }}>
                    <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => { setSelectedTask(task); setIsEditDialogOpen(true); }}>
                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-emerald-500" onClick={() => { setSelectedTask(task); setIsCompleteDialogOpen(true); }}>
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  <span className="text-xs">Complete</span>
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" className="text-amber-500" onClick={() => { setSelectedTask(task); setIsRestoreDialogOpen(true); }}>
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                <span className="text-xs">Restore</span>
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => { setSelectedTask(task); setIsDeleteDialogOpen(true); }}>
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || priorityFilter !== 'all';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Maintenance</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Track tasks and service history</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="sm:hidden">
            <Plus className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="hidden sm:flex">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
        
        {/* View controls */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex border border-input rounded-md overflow-hidden">
            <button
              onClick={() => { setViewMode('tasks'); setTaskFilter('all'); }}
              className={cn(
                "px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1",
                viewMode === 'tasks' && taskFilter !== 'completed' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              )}
            >
              <Wrench className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Tasks</span>
            </button>
            <button
              onClick={() => { setViewMode('history'); setTaskFilter('completed'); }}
              className={cn(
                "px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1",
                viewMode === 'history' || taskFilter === 'completed' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              )}
            >
              <History className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>
          </div>
          
          <div className="flex border border-input rounded-md overflow-hidden">
            <button
              onClick={() => setDisplayMode('list')}
              className={cn(
                "px-2 py-1.5 transition-colors",
                displayMode === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode('card')}
              className={cn(
                "px-2 py-1.5 transition-colors",
                displayMode === 'card' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              )}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats - Filter buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <button 
          onClick={() => handleStatClick('overdue')}
          className={cn(
            "p-2 sm:p-3 rounded-lg border text-left transition-all",
            taskFilter === 'overdue' 
              ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/50" 
              : "border-border/50 bg-card/50 hover:bg-card/80"
          )}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <AlertTriangle className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", overdueTasks.length > 0 ? "text-orange-500" : "text-muted-foreground")} />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Overdue</span>
          </div>
          <p className={cn("text-xl sm:text-2xl font-bold", overdueTasks.length > 0 ? "text-orange-500" : "text-muted-foreground")}>
            {overdueTasks.length}
          </p>
        </button>
        
        <button
          onClick={() => handleStatClick('upcoming')}
          className={cn(
            "p-2 sm:p-3 rounded-lg border text-left transition-all",
            taskFilter === 'upcoming'
              ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50"
              : "border-border/50 bg-card/50 hover:bg-card/80"
          )}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Upcoming</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-blue-500">{upcomingTasks.length}</p>
        </button>
        
        <button
          onClick={() => handleStatClick('pending')}
          className={cn(
            "p-2 sm:p-3 rounded-lg border text-left transition-all",
            taskFilter === 'pending'
              ? "border-slate-500 bg-slate-500/10 ring-1 ring-slate-500/50"
              : "border-border/50 bg-card/50 hover:bg-card/80"
          )}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Pending</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-400">{pendingTasks.length}</p>
        </button>
        
        <button
          onClick={() => handleStatClick('completed')}
          className={cn(
            "p-2 sm:p-3 rounded-lg border text-left transition-all",
            taskFilter === 'completed'
              ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50"
              : "border-border/50 bg-card/50 hover:bg-card/80"
          )}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Completed</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-500">{completedTasks.length}</p>
        </button>
      </div>

      {/* Search and Filters - Mobile optimized */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={allCategories.map(c => ({ value: c, label: c === 'all' ? 'Category' : c }))}
            className="flex-1 sm:w-32"
          />
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Priority' },
              { value: 'urgent', label: '🔴 Urgent' },
              { value: 'high', label: '🟠 High' },
              { value: 'medium', label: '🔵 Medium' },
              { value: 'low', label: '⚪ Low' },
            ]}
            className="flex-1 sm:w-32"
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setPriorityFilter('all');
            }}
            className="text-muted-foreground text-xs"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Task List / Grid */}
      {displayedTasks.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="py-8 sm:py-12 text-center">
            <Wrench className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="font-medium text-foreground mb-1 text-sm sm:text-base">
              {hasActiveFilters || taskFilter !== 'all' ? 'No matching tasks' : 'All caught up!'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {hasActiveFilters || taskFilter !== 'all' ? 'Try adjusting your filters' : 'No pending maintenance tasks'}
            </p>
          </CardContent>
        </Card>
      ) : displayMode === 'list' ? (
        <div className="space-y-2">
          {displayedTasks.map(task => <TaskRow key={task.id} task={task} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {displayedTasks.map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      )}

      {/* Results count */}
      {displayedTasks.length > 0 && (
        <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
          Showing {displayedTasks.length} {displayedTasks.length === 1 ? 'task' : 'tasks'}
          {(hasActiveFilters || taskFilter !== 'all') && ' (filtered)'}
        </p>
      )}

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} title="Add Task" maxWidth="lg">
        <form onSubmit={handleAddTask}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input name="title" label="Title" required placeholder="Replace HVAC Filter" className="sm:col-span-2" />
            <Textarea name="description" label="Description" placeholder="Details..." className="sm:col-span-2" rows={2} />
            <Input name="category" label="Category" required placeholder="HVAC" />
            <Select name="priority" label="Priority" options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]} />
            <Input name="dueDate" label="Due Date" type="date" required />
            <Select name="recurrence" label="Recurrence" options={[
              { value: 'none', label: 'One-time' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'yearly', label: 'Yearly' },
            ]} />
            <Input name="assignedTo" label="Assigned To" placeholder="Homeowner" />
            <Input name="estimatedCost" label="Est. Cost" type="number" step="0.01" placeholder="0.00" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button type="submit">Add Task</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onClose={() => { setIsEditDialogOpen(false); setSelectedTask(null); }} title="Edit Task" maxWidth="lg">
        {selectedTask && (
          <form onSubmit={handleEditTask}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input name="title" label="Title" required defaultValue={selectedTask.title} className="sm:col-span-2" />
              <Textarea name="description" label="Description" defaultValue={selectedTask.description} className="sm:col-span-2" rows={2} />
              <Input name="category" label="Category" required defaultValue={selectedTask.category} />
              <Select name="priority" label="Priority" defaultValue={selectedTask.priority} options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]} />
              <Input name="dueDate" label="Due Date" type="date" required defaultValue={selectedTask.dueDate} />
              <Select name="recurrence" label="Recurrence" defaultValue={selectedTask.recurrence} options={[
                { value: 'none', label: 'One-time' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]} />
              <Input name="assignedTo" label="Assigned To" defaultValue={selectedTask.assignedTo} />
              <Input name="estimatedCost" label="Est. Cost" type="number" step="0.01" defaultValue={selectedTask.estimatedCost} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedTask(null); }}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* Complete Task Dialog */}
      <Dialog open={isCompleteDialogOpen} onClose={() => { setIsCompleteDialogOpen(false); setSelectedTask(null); }} title="Complete Task" maxWidth="md">
        {selectedTask && (
          <form onSubmit={handleCompleteTask}>
            <div className="space-y-4">
              <div className="p-3 bg-muted/20 rounded-lg">
                <p className="font-medium text-foreground">{selectedTask.title}</p>
                <p className="text-sm text-muted-foreground">{selectedTask.category}</p>
              </div>
              <Select name="performedBy" label="Performed By" options={[
                { value: '', label: 'Select...' },
                { value: 'DIY / Homeowner', label: 'DIY / Homeowner' },
                ...vendors.map(v => ({ value: v.businessName, label: v.businessName })),
                { value: 'Other', label: 'Other' },
              ]} />
              <Input name="actualCost" label="Actual Cost" type="number" step="0.01" placeholder={selectedTask.estimatedCost?.toString() || '0.00'} />
              <Textarea name="notes" label="Notes" placeholder="Issues found, parts used, etc." rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsCompleteDialogOpen(false); setSelectedTask(null); }}>Cancel</Button>
              <Button type="submit"><Check className="w-4 h-4 mr-1" /> Complete</Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* Restore Task Dialog */}
      <Dialog open={isRestoreDialogOpen} onClose={() => { setIsRestoreDialogOpen(false); setSelectedTask(null); }} title="Restore Task?" maxWidth="sm">
        {selectedTask && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Move "{selectedTask.title}" back to pending tasks?
            </p>
            <p className="text-sm text-muted-foreground">
              This will clear the completion date and actual cost.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsRestoreDialogOpen(false); setSelectedTask(null); }}>Cancel</Button>
              <Button onClick={() => handleRestoreTask(selectedTask)}>
                <RotateCcw className="w-4 h-4 mr-1" /> Restore
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Skip to Next Cycle Dialog */}
      <Dialog open={isSkipDialogOpen} onClose={() => { setIsSkipDialogOpen(false); setSelectedTask(null); }} title="Skip to Next Cycle" maxWidth="sm">
        {selectedTask && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Skip "{selectedTask.title}" to the next {selectedTask.recurrence} cycle?
            </p>
            <div className="p-3 bg-muted/20 rounded-lg text-sm">
              <p><strong>Current due:</strong> {formatDate(selectedTask.dueDate)}</p>
              <p><strong>Next cycle:</strong> {
                (() => {
                  const current = new Date(selectedTask.dueDate);
                  switch (selectedTask.recurrence) {
                    case 'weekly': return formatDate(new Date(current.setDate(current.getDate() + 7)).toISOString());
                    case 'monthly': return formatDate(new Date(current.setMonth(current.getMonth() + 1)).toISOString());
                    case 'quarterly': return formatDate(new Date(current.setMonth(current.getMonth() + 3)).toISOString());
                    case 'yearly': return formatDate(new Date(current.setFullYear(current.getFullYear() + 1)).toISOString());
                    default: return 'N/A';
                  }
                })()
              }</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsSkipDialogOpen(false); setSelectedTask(null); }}>Cancel</Button>
              <Button onClick={handleSkipToNextCycle}><SkipForward className="w-4 h-4 mr-1" /> Skip</Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => { setIsDeleteDialogOpen(false); setSelectedTask(null); }} title="Delete Task?" maxWidth="sm">
        {selectedTask && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete "{selectedTask.title}"?
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setSelectedTask(null); }}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteTask}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
