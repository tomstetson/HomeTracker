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
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  User,
  Wrench,
  History,
  Search,
  Trash2,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';

type ViewMode = 'tasks' | 'history';

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
  const [historyFilter, setHistoryFilter] = useState('');
  const [historyCategory, setHistoryCategory] = useState('all');

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const upcomingTasks = getUpcomingTasks();
  const overdueTasks = getOverdueTasks();
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

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

  // Get unique categories from completed tasks
  const historyCategories = useMemo(() => {
    const cats = new Set(completedTasks.map(t => t.category));
    return ['all', ...Array.from(cats).sort()];
  }, [completedTasks]);

  // Filter history
  const filteredHistory = useMemo(() => {
    let filtered = [...completedTasks];
    
    if (historyFilter) {
      const query = historyFilter.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
      );
    }
    
    if (historyCategory !== 'all') {
      filtered = filtered.filter(t => t.category === historyCategory);
    }
    
    // Sort by completed date, most recent first
    filtered.sort((a, b) => {
      const dateA = new Date(b.completedDate || b.dueDate).getTime();
      const dateB = new Date(a.completedDate || a.dueDate).getTime();
      return dateA - dateB;
    });
    
    return filtered;
  }, [completedTasks, historyFilter, historyCategory]);

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

    // Update the task with completion info
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

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    deleteTask(selectedTask.id);
    setIsDeleteDialogOpen(false);
    toast.success('Task Deleted', `Removed "${selectedTask.title}"`);
    setSelectedTask(null);
  };

  const openCompleteDialog = (task: MaintenanceTask) => {
    setSelectedTask(task);
    setIsCompleteDialogOpen(true);
  };

  const openDeleteDialog = (task: MaintenanceTask) => {
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };

  const priorityStyles = {
    low: 'bg-slate-500/20 text-slate-400 dark:text-slate-300 border-slate-500/30',
    medium: 'bg-blue-500/20 text-blue-400 dark:text-blue-300 border-blue-500/30',
    high: 'bg-orange-500/20 text-orange-400 dark:text-orange-300 border-orange-500/30',
    urgent: 'bg-red-500/20 text-red-400 dark:text-red-300 border-red-500/30',
  };

  const statusIcons = {
    pending: Clock,
    'in-progress': Clock,
    completed: CheckCircle2,
    overdue: AlertCircle,
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

  const renderTask = (task: MaintenanceTask, showActions = true) => {
    const StatusIcon = statusIcons[task.status];
    const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();

    return (
      <Card key={task.id} className="hover:shadow-lg transition-all bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <StatusIcon
                  className={cn(
                    'w-5 h-5',
                    task.status === 'completed'
                      ? 'text-emerald-500'
                      : isOverdue
                      ? 'text-red-500'
                      : 'text-muted-foreground'
                  )}
                />
                <h3 className="font-semibold text-foreground">{task.title}</h3>
              </div>
              {task.description && <p className="text-sm text-muted-foreground ml-7">{task.description}</p>}
            </div>
            {showActions && task.status !== 'completed' && (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => openCompleteDialog(task)}>
                  Complete
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => openDeleteDialog(task)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 ml-7">
            <span className={cn('px-2 py-1 rounded-md text-xs font-medium border', priorityStyles[task.priority])}>
              {task.priority.toUpperCase()}
            </span>
            <span className="px-2 py-1 bg-muted/30 text-muted-foreground rounded-md text-xs font-medium border border-border/50">
              {task.category}
            </span>
            {task.recurrence && task.recurrence !== 'none' && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 dark:text-purple-300 rounded-md text-xs font-medium border border-purple-500/30">
                {task.recurrence}
              </span>
            )}
          </div>

          <div className="mt-3 ml-7 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>
                {task.status === 'completed' ? (
                  <>Completed: {formatDate(task.completedDate || task.dueDate)}</>
                ) : (
                  <>
                    Due: {formatDate(task.dueDate)}
                    {isOverdue && <span className="text-red-500 ml-2 font-medium">(Overdue)</span>}
                  </>
                )}
              </span>
            </div>
            {task.assignedTo && (
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                <span>{task.assignedTo}</span>
              </div>
            )}
            {task.estimatedCost !== undefined && task.status !== 'completed' && (
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>Estimated: {formatCurrency(task.estimatedCost)}</span>
              </div>
            )}
            {task.actualCost !== undefined && (
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                <span className="font-medium text-foreground">Cost: {formatCurrency(task.actualCost)}</span>
              </div>
            )}
            {task.notes && task.status === 'completed' && (
              <div className="mt-2 p-2 bg-muted/20 rounded text-xs">
                <strong>Notes:</strong> {task.notes}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Maintenance</h1>
          <p className="text-muted-foreground">Track tasks and view service history</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-input rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('tasks')}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                viewMode === 'tasks' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              )}
            >
              <Wrench className="w-4 h-4" />
              Tasks
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                viewMode === 'history' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              )}
            >
              <History className="w-4 h-4" />
              History
            </button>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {viewMode === 'tasks' ? (
          <>
            <Card className="border-l-4 border-l-orange-500 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Overdue</p>
                <p className="text-3xl font-bold text-orange-500">{overdueTasks.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Upcoming (30d)</p>
                <p className="text-3xl font-bold text-blue-500">{upcomingTasks.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-slate-500 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-3xl font-bold text-slate-400">{pendingTasks.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-3xl font-bold text-emerald-500">{completedTasks.length}</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="border-l-4 border-l-emerald-500 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Completed</p>
                <p className="text-3xl font-bold text-emerald-500">{stats.totalCompleted}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-blue-500">{formatCurrency(stats.totalSpent)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">This Year</p>
                <p className="text-3xl font-bold text-purple-500">{stats.thisYearTasks}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">This Year Cost</p>
                <p className="text-2xl font-bold text-amber-500">{formatCurrency(stats.thisYearSpent)}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {viewMode === 'tasks' ? (
        <>
          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                Overdue Tasks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {overdueTasks.map(t => renderTask(t))}
              </div>
            </div>
          )}

          {/* Upcoming Tasks */}
          {upcomingTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Upcoming (Next 30 Days)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingTasks.map(t => renderTask(t))}
              </div>
            </div>
          )}

          {/* All Pending Tasks */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">All Pending Tasks</h2>
            {pendingTasks.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="py-8 text-center">
                  <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wrench className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No pending tasks. You're all caught up!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingTasks.map(t => renderTask(t))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Service History View */
        <div className="space-y-4">
          {/* History Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={historyCategory}
              onChange={(e) => setHistoryCategory(e.target.value)}
              options={historyCategories.map(c => ({ 
                value: c, 
                label: c === 'all' ? 'All Categories' : c 
              }))}
            />
          </div>

          {/* History List */}
          {filteredHistory.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No service history</h3>
                <p className="text-muted-foreground">
                  {historyFilter || historyCategory !== 'all' 
                    ? 'No completed tasks match your filters'
                    : 'Completed maintenance tasks will appear here'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map(task => renderTask(task, false))}
            </div>
          )}
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Add Maintenance Task"
        description="Schedule a new maintenance task"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddTask}>
          <div className="grid grid-cols-2 gap-4">
            <Input name="title" label="Task Title" required placeholder="Replace HVAC Filter" className="col-span-2" />
            <Textarea name="description" label="Description" placeholder="Change air filter in main HVAC system" className="col-span-2" />
            <Input name="category" label="Category" required placeholder="HVAC" />
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
                { value: 'none', label: 'None' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />
            <Input name="assignedTo" label="Assigned To" placeholder="Homeowner or Vendor Name" />
            <Input name="estimatedCost" label="Estimated Cost" type="number" step="0.01" placeholder="0.00" />
            <Textarea name="notes" label="Notes" placeholder="Additional notes..." className="col-span-2" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Task</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Complete Task Dialog */}
      <Dialog
        open={isCompleteDialogOpen}
        onClose={() => {
          setIsCompleteDialogOpen(false);
          setSelectedTask(null);
        }}
        title="Complete Task"
        description="Record completion details for service history"
        maxWidth="md"
      >
        {selectedTask && (
          <form onSubmit={handleCompleteTask}>
            <div className="space-y-4">
              <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                <h3 className="font-semibold text-foreground mb-1">{selectedTask.title}</h3>
                {selectedTask.description && <p className="text-sm text-muted-foreground">{selectedTask.description}</p>}
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
              
              <Textarea 
                name="notes" 
                label="Completion Notes" 
                placeholder="Add notes about this service (issues found, parts used, etc.)..." 
                rows={3} 
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCompleteDialogOpen(false);
                  setSelectedTask(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedTask(null);
        }}
        title="Delete Task?"
      >
        {selectedTask && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong className="text-foreground">{selectedTask.title}</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedTask(null);
                }}
              >
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleDeleteTask}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
