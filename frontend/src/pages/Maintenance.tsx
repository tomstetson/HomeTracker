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
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';

type ViewMode = 'tasks' | 'history';
type TaskFilter = 'all' | 'overdue' | 'upcoming' | 'pending';

export default function Maintenance() {
  const { tasks, isLoading, addTask, updateTask, deleteTask, getUpcomingTasks, getOverdueTasks, loadFromStorage } =
    useMaintenanceStore();
  const { vendors } = useVendorStore();
  const toast = useToast();
  
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  
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

  // Stats calculations
  const stats = useMemo(() => {
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

  // Filter tasks based on view mode and filters
  const displayedTasks = useMemo(() => {
    let filtered = viewMode === 'tasks' 
      ? tasks.filter(t => t.status !== 'completed')
      : completedTasks;

    // Apply task type filter (only for tasks view)
    if (viewMode === 'tasks' && taskFilter !== 'all') {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      switch (taskFilter) {
        case 'overdue':
          filtered = filtered.filter(t => new Date(t.dueDate) < now);
          break;
        case 'upcoming':
          filtered = filtered.filter(t => {
            const due = new Date(t.dueDate);
            return due >= now && due <= thirtyDaysFromNow;
          });
          break;
        case 'pending':
          filtered = filtered.filter(t => t.status === 'pending');
          break;
      }
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
      if (viewMode === 'history') {
        return new Date(b.completedDate || b.dueDate).getTime() - new Date(a.completedDate || a.dueDate).getTime();
      }
      // For tasks: overdue first, then by due date
      const aOverdue = new Date(a.dueDate) < new Date() ? 0 : 1;
      const bOverdue = new Date(b.dueDate) < new Date() ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return filtered;
  }, [tasks, completedTasks, viewMode, searchQuery, categoryFilter, priorityFilter, taskFilter]);

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

  // Quick complete (no dialog, just mark done)
  const handleQuickComplete = (task: MaintenanceTask) => {
    updateTask(task.id, {
      status: 'completed',
      completedDate: new Date().toISOString().split('T')[0],
    });
    toast.success('Done!', `"${task.title}" marked complete`);
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

  const priorityDots = {
    low: 'bg-slate-400',
    medium: 'bg-blue-400',
    high: 'bg-orange-400',
    urgent: 'bg-red-400',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-muted/20 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Compact task row for list view
  const TaskRow = ({ task }: { task: MaintenanceTask }) => {
    const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
    const isRecurring = task.recurrence && task.recurrence !== 'none';

    return (
      <div className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-muted/30",
        isOverdue ? "border-red-500/30 bg-red-500/5" : "border-border/50 bg-card/50"
      )}>
        {/* Quick complete checkbox */}
        {task.status !== 'completed' && (
          <button
            onClick={() => handleQuickComplete(task)}
            className={cn(
              "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
              "border-muted-foreground/30 hover:border-emerald-500 hover:bg-emerald-500/10"
            )}
            title="Quick complete"
          >
            <Check className="w-3 h-3 opacity-0 group-hover:opacity-50 text-emerald-500" />
          </button>
        )}
        {task.status === 'completed' && (
          <div className="flex-shrink-0 w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-emerald-500" />
          </div>
        )}

        {/* Priority dot */}
        <div className={cn("flex-shrink-0 w-2 h-2 rounded-full", priorityDots[task.priority])} 
             title={task.priority} />

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium truncate",
              task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'
            )}>
              {task.title}
            </span>
            {isRecurring && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                {task.recurrence}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{task.category}</span>
            <span>•</span>
            <span className={isOverdue ? 'text-red-400 font-medium' : ''}>
              {task.status === 'completed' 
                ? `Done ${formatDate(task.completedDate || task.dueDate)}`
                : isOverdue 
                  ? `Overdue ${formatDate(task.dueDate)}`
                  : `Due ${formatDate(task.dueDate)}`
              }
            </span>
            {task.estimatedCost !== undefined && task.status !== 'completed' && (
              <>
                <span>•</span>
                <span>{formatCurrency(task.estimatedCost)}</span>
              </>
            )}
            {task.actualCost !== undefined && task.status === 'completed' && (
              <>
                <span>•</span>
                <span>{formatCurrency(task.actualCost)}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        {task.status !== 'completed' && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isRecurring && (
              <button
                onClick={() => { setSelectedTask(task); setIsSkipDialogOpen(true); }}
                className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                title="Skip to next cycle"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => { setSelectedTask(task); setIsCompleteDialogOpen(true); }}
              className="p-1.5 rounded hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-500"
              title="Complete with details"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setSelectedTask(task); setIsDeleteDialogOpen(true); }}
              className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || priorityFilter !== 'all' || taskFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Maintenance</h1>
          <p className="text-muted-foreground text-sm">Track tasks and service history</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-input rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('tasks')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5",
                viewMode === 'tasks' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              )}
            >
              <Wrench className="w-3.5 h-3.5" />
              Tasks
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5",
                viewMode === 'history' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              )}
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Stats - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {viewMode === 'tasks' ? (
          <>
            <button 
              onClick={() => setTaskFilter(taskFilter === 'overdue' ? 'all' : 'overdue')}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                taskFilter === 'overdue' 
                  ? "border-orange-500 bg-orange-500/10" 
                  : "border-border/50 bg-card/50 hover:bg-card/80"
              )}
            >
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className={cn("text-2xl font-bold", overdueTasks.length > 0 ? "text-orange-500" : "text-muted-foreground")}>
                {overdueTasks.length}
              </p>
            </button>
            <button
              onClick={() => setTaskFilter(taskFilter === 'upcoming' ? 'all' : 'upcoming')}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                taskFilter === 'upcoming'
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-border/50 bg-card/50 hover:bg-card/80"
              )}
            >
              <p className="text-xs text-muted-foreground">Upcoming (30d)</p>
              <p className="text-2xl font-bold text-blue-500">{upcomingTasks.length}</p>
            </button>
            <button
              onClick={() => setTaskFilter(taskFilter === 'pending' ? 'all' : 'pending')}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                taskFilter === 'pending'
                  ? "border-slate-500 bg-slate-500/10"
                  : "border-border/50 bg-card/50 hover:bg-card/80"
              )}
            >
              <p className="text-xs text-muted-foreground">Total Pending</p>
              <p className="text-2xl font-bold text-slate-400">{pendingTasks.length}</p>
            </button>
            <div className="p-3 rounded-lg border border-border/50 bg-card/50">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-emerald-500">{completedTasks.length}</p>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-lg border border-border/50 bg-card/50">
              <p className="text-xs text-muted-foreground">Total Completed</p>
              <p className="text-2xl font-bold text-emerald-500">{stats.totalCompleted}</p>
            </div>
            <div className="p-3 rounded-lg border border-border/50 bg-card/50">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-xl font-bold text-blue-500">{formatCurrency(stats.totalSpent)}</p>
            </div>
            <div className="p-3 rounded-lg border border-border/50 bg-card/50">
              <p className="text-xs text-muted-foreground">This Year</p>
              <p className="text-2xl font-bold text-purple-500">{stats.thisYearTasks}</p>
            </div>
            <div className="p-3 rounded-lg border border-border/50 bg-card/50">
              <p className="text-xs text-muted-foreground">This Year Cost</p>
              <p className="text-xl font-bold text-amber-500">{formatCurrency(stats.thisYearSpent)}</p>
            </div>
          </>
        )}
      </div>

      {/* Search and Filters - Always visible */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={viewMode === 'tasks' ? "Search tasks..." : "Search history..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
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
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={allCategories.map(c => ({ value: c, label: c === 'all' ? 'All Categories' : c }))}
          className="w-full sm:w-40"
        />
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Priority' },
            { value: 'urgent', label: '🔴 Urgent' },
            { value: 'high', label: '🟠 High' },
            { value: 'medium', label: '🔵 Medium' },
            { value: 'low', label: '⚪ Low' },
          ]}
          className="w-full sm:w-36"
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setPriorityFilter('all');
              setTaskFilter('all');
            }}
            className="text-muted-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {displayedTasks.length === 0 ? (
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              {viewMode === 'tasks' ? (
                <>
                  <Wrench className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <h3 className="font-medium text-foreground mb-1">
                    {hasActiveFilters ? 'No matching tasks' : 'All caught up!'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {hasActiveFilters ? 'Try adjusting your filters' : 'No pending maintenance tasks'}
                  </p>
                </>
              ) : (
                <>
                  <History className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <h3 className="font-medium text-foreground mb-1">No service history</h3>
                  <p className="text-sm text-muted-foreground">Completed tasks will appear here</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          displayedTasks.map(task => <TaskRow key={task.id} task={task} />)
        )}
      </div>

      {/* Results count */}
      {displayedTasks.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {displayedTasks.length} {displayedTasks.length === 1 ? 'task' : 'tasks'}
          {hasActiveFilters && ' (filtered)'}
        </p>
      )}

      {/* Add Task Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Add Maintenance Task"
        maxWidth="lg"
      >
        <form onSubmit={handleAddTask}>
          <div className="grid grid-cols-2 gap-4">
            <Input name="title" label="Task Title" required placeholder="Replace HVAC Filter" className="col-span-2" />
            <Textarea name="description" label="Description" placeholder="Details..." className="col-span-2" rows={2} />
            <Input name="category" label="Category" required placeholder="HVAC, Plumbing, etc." />
            <Select
              name="priority"
              label="Priority"
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
            <Input name="dueDate" label="Due Date" type="date" required />
            <Select
              name="recurrence"
              label="Recurrence"
              options={[
                { value: 'none', label: 'One-time' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />
            <Input name="assignedTo" label="Assigned To" placeholder="Homeowner" />
            <Input name="estimatedCost" label="Est. Cost" type="number" step="0.01" placeholder="0.00" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button type="submit">Add Task</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Complete Task Dialog */}
      <Dialog
        open={isCompleteDialogOpen}
        onClose={() => { setIsCompleteDialogOpen(false); setSelectedTask(null); }}
        title="Complete Task"
        maxWidth="md"
      >
        {selectedTask && (
          <form onSubmit={handleCompleteTask}>
            <div className="space-y-4">
              <div className="p-3 bg-muted/20 rounded-lg">
                <p className="font-medium text-foreground">{selectedTask.title}</p>
                <p className="text-sm text-muted-foreground">{selectedTask.category}</p>
              </div>
              <Select
                name="performedBy"
                label="Performed By"
                options={[
                  { value: '', label: 'Select...' },
                  { value: 'DIY / Homeowner', label: 'DIY / Homeowner' },
                  ...vendors.map(v => ({ value: v.businessName, label: v.businessName })),
                  { value: 'Other', label: 'Other' },
                ]}
              />
              <Input
                name="actualCost"
                label="Actual Cost"
                type="number"
                step="0.01"
                placeholder={selectedTask.estimatedCost?.toString() || '0.00'}
              />
              <Textarea name="notes" label="Notes" placeholder="Issues found, parts used, etc." rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsCompleteDialogOpen(false); setSelectedTask(null); }}>
                Cancel
              </Button>
              <Button type="submit">
                <Check className="w-4 h-4 mr-1" /> Complete
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* Skip to Next Cycle Dialog */}
      <Dialog
        open={isSkipDialogOpen}
        onClose={() => { setIsSkipDialogOpen(false); setSelectedTask(null); }}
        title="Skip to Next Cycle"
        maxWidth="sm"
      >
        {selectedTask && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Skip "{selectedTask.title}" to the next scheduled {selectedTask.recurrence} cycle?
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
              <Button type="button" variant="outline" onClick={() => { setIsSkipDialogOpen(false); setSelectedTask(null); }}>
                Cancel
              </Button>
              <Button onClick={handleSkipToNextCycle}>
                <SkipForward className="w-4 h-4 mr-1" /> Skip
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setSelectedTask(null); }}
        title="Delete Task?"
        maxWidth="sm"
      >
        {selectedTask && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete "{selectedTask.title}"?
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setSelectedTask(null); }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteTask}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
