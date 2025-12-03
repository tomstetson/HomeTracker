import { useState, useEffect } from 'react';
import { useMaintenanceStore, MaintenanceTask } from '../store/maintenanceStore';
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
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Maintenance() {
  const { tasks, isLoading, addTask, completeTask, getUpcomingTasks, getOverdueTasks, loadFromStorage } =
    useMaintenanceStore();
  const toast = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const upcomingTasks = getUpcomingTasks();
  const overdueTasks = getOverdueTasks();
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

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
    const notes = formData.get('notes') as string || undefined;

    completeTask(selectedTask.id, actualCost, notes);
    setIsCompleteDialogOpen(false);
    toast.success('Task Completed', `Marked "${selectedTask.title}" as complete`);
    setSelectedTask(null);
  };

  const openCompleteDialog = (task: MaintenanceTask) => {
    setSelectedTask(task);
    setIsCompleteDialogOpen(true);
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

  const renderTask = (task: MaintenanceTask) => {
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
            {task.status !== 'completed' && (
              <Button size="sm" onClick={() => openCompleteDialog(task)}>
                Complete
              </Button>
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
                Due: {new Date(task.dueDate).toLocaleDateString()}
                {isOverdue && <span className="text-red-500 ml-2 font-medium">(Overdue)</span>}
              </span>
            </div>
            {task.assignedTo && (
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                <span>{task.assignedTo}</span>
              </div>
            )}
            {task.estimatedCost !== undefined && (
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>Estimated: ${task.estimatedCost}</span>
              </div>
            )}
            {task.actualCost !== undefined && (
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                <span className="font-medium text-foreground">Actual: ${task.actualCost}</span>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Maintenance Tracker</h1>
          <p className="text-muted-foreground">Stay on top of home maintenance tasks</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-orange-500 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Overdue</p>
            <p className="text-3xl font-bold text-orange-500">{overdueTasks.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Upcoming (30 days)</p>
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
      </div>

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            Overdue Tasks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overdueTasks.map(renderTask)}
          </div>
        </div>
      )}

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Upcoming (Next 30 Days)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingTasks.map(renderTask)}
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
            {pendingTasks.map(renderTask)}
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Recently Completed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedTasks.slice(0, 6).map(renderTask)}
          </div>
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
            <Input name="assignedTo" label="Assigned To" placeholder="Assignee Name" />
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
        description="Mark this task as completed"
        maxWidth="md"
      >
        {selectedTask && (
          <form onSubmit={handleCompleteTask}>
            <div className="space-y-4">
              <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                <h3 className="font-semibold text-foreground mb-1">{selectedTask.title}</h3>
                {selectedTask.description && <p className="text-sm text-muted-foreground">{selectedTask.description}</p>}
              </div>
              <Input
                name="actualCost"
                label="Actual Cost"
                type="number"
                step="0.01"
                placeholder={selectedTask.estimatedCost?.toString() || '0.00'}
              />
              <Textarea name="notes" label="Completion Notes" placeholder="Add notes about this task..." rows={3} />
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
              <Button type="submit">Mark Complete</Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </div>
  );
}
