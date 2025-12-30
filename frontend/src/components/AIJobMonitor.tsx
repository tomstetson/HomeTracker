import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { useConfirm } from './ui/ConfirmDialog';
import { api, AIJob, AIJobStatus, AIJobStats } from '../lib/api';
import {
  Brain,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
  Image,
  AlertTriangle,
  BarChart3,
  Eye,
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

interface AIJobMonitorProps {
  compact?: boolean;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onJobSelect?: (job: AIJob) => void;
}

const STATUS_CONFIG: Record<AIJobStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, color: 'text-yellow-500', label: 'Pending' },
  processing: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-500', label: 'Processing' },
  completed: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-500', label: 'Completed' },
  failed: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-500', label: 'Failed' },
  cancelled: { icon: <Ban className="w-4 h-4" />, color: 'text-gray-500', label: 'Cancelled' },
};

const JOB_TYPE_LABELS: Record<string, string> = {
  inventory_detection: 'Inventory Detection',
  warranty_detection: 'Warranty Detection',
  appliance_identification: 'Appliance ID',
  receipt_scan: 'Receipt Scan',
  condition_assessment: 'Condition Assessment',
};

export default function AIJobMonitor({
  compact = false,
  limit = 10,
  autoRefresh = true,
  refreshInterval = 5000,
  onJobSelect,
}: AIJobMonitorProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const [jobs, setJobs] = useState<AIJob[]>([]);
  const [stats, setStats] = useState<AIJobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AIJobStatus | 'all'>('all');

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      const status = filterStatus === 'all' ? undefined : filterStatus;
      const result = await api.getAIJobs(status, limit);
      if (result.success && result.jobs) {
        setJobs(result.jobs);
      }
    } catch (error) {
      console.error('Failed to fetch AI jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, limit]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await api.getAIStats();
      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Failed to fetch AI stats:', error);
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchJobs();
    fetchStats();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchJobs();
        fetchStats();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchJobs, fetchStats, autoRefresh, refreshInterval]);

  // Cancel job
  const handleCancelJob = async (jobId: string) => {
    const confirmed = await confirm({
      title: 'Cancel AI Job',
      message: 'Are you sure you want to cancel this job? This cannot be undone.',
      confirmText: 'Cancel Job',
      variant: 'danger',
    });

    if (!confirmed) return;

    const result = await api.cancelAIJob(jobId);
    if (result.success) {
      toast.success('Job Cancelled', 'The AI job has been cancelled');
      fetchJobs();
    } else {
      toast.error('Error', result.error || 'Failed to cancel job');
    }
  };

  // Retry failed items
  const handleRetryJob = async (jobId: string) => {
    const result = await api.retryAIJob(jobId);
    if (result.success) {
      toast.success('Retry Started', `Retrying ${result.retriedCount} failed items`);
      fetchJobs();
    } else {
      toast.error('Error', result.error || 'Failed to retry job');
    }
  };

  // Calculate progress percentage
  const getProgress = (job: AIJob): number => {
    if (job.total_items === 0) return 0;
    return Math.round((job.processed_items / job.total_items) * 100);
  };

  // Render job card
  const renderJobCard = (job: AIJob) => {
    const statusConfig = STATUS_CONFIG[job.status];
    const progress = getProgress(job);
    const isExpanded = expandedJobId === job.id;

    return (
      <div
        key={job.id}
        className={cn(
          'border rounded-lg p-4 transition-all',
          'bg-white dark:bg-gray-800',
          'hover:border-blue-300 dark:hover:border-blue-700',
          isExpanded && 'ring-2 ring-blue-500'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-gray-100 dark:bg-gray-700', statusConfig.color)}>
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {JOB_TYPE_LABELS[job.job_type] || job.job_type}
              </h4>
              <p className="text-sm text-gray-500">
                {formatDate(job.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn('flex items-center gap-1 text-sm font-medium', statusConfig.color)}>
              {statusConfig.icon}
              {statusConfig.label}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {(job.status === 'processing' || job.status === 'pending') && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                {job.processed_items} / {job.total_items} images
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats row (compact view) */}
        {!isExpanded && job.status === 'completed' && (
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Image className="w-4 h-4" />
              {job.total_items} images
            </span>
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              {job.created_items} items created
            </span>
            {job.failed_items > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="w-4 h-4" />
                {job.failed_items} failed
              </span>
            )}
          </div>
        )}

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Images:</span>
                <span className="ml-2 font-medium">{job.total_items}</span>
              </div>
              <div>
                <span className="text-gray-500">Processed:</span>
                <span className="ml-2 font-medium">{job.processed_items}</span>
              </div>
              <div>
                <span className="text-gray-500">Items Created:</span>
                <span className="ml-2 font-medium text-green-600">{job.created_items}</span>
              </div>
              <div>
                <span className="text-gray-500">Failed:</span>
                <span className={cn('ml-2 font-medium', job.failed_items > 0 ? 'text-red-500' : '')}>
                  {job.failed_items}
                </span>
              </div>
              {job.started_at && (
                <div className="col-span-2">
                  <span className="text-gray-500">Started:</span>
                  <span className="ml-2">{formatDate(job.started_at)}</span>
                </div>
              )}
              {job.completed_at && (
                <div className="col-span-2">
                  <span className="text-gray-500">Completed:</span>
                  <span className="ml-2">{formatDate(job.completed_at)}</span>
                </div>
              )}
              {job.error_message && (
                <div className="col-span-2">
                  <span className="text-gray-500">Error:</span>
                  <p className="mt-1 text-red-500 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {job.error_message}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
              {(job.status === 'pending' || job.status === 'processing') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelJob(job.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Ban className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}
              {job.status === 'failed' && job.failed_items > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRetryJob(job.id)}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Retry Failed
                </Button>
              )}
              {onJobSelect && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onJobSelect(job)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Compact widget view
  if (compact) {
    const activeJobs = jobs.filter(j => j.status === 'processing' || j.status === 'pending');
    const recentCompleted = jobs.filter(j => j.status === 'completed').slice(0, 3);

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              AI Processing
            </h3>
            <Button variant="ghost" size="sm" onClick={fetchJobs}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Active jobs */}
              {activeJobs.length > 0 ? (
                <div className="space-y-3">
                  {activeJobs.map(job => (
                    <div key={job.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {JOB_TYPE_LABELS[job.job_type]}
                        </span>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      </div>
                      <div className="h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${getProgress(job)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {job.processed_items}/{job.total_items} images
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No active AI jobs
                </p>
              )}

              {/* Recent completed */}
              {recentCompleted.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Recent</p>
                  {recentCompleted.map(job => (
                    <div key={job.id} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {JOB_TYPE_LABELS[job.job_type]}
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {job.created_items} items
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Stats summary */}
              {stats && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.totalItemsCreated}
                    </p>
                    <p className="text-xs text-gray-500">Items Created</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.totalImagesProcessed}
                    </p>
                    <p className="text-xs text-gray-500">Images Processed</p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-500" />
          AI Job Queue
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AIJobStatus | 'all')}
            className="px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchJobs}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{stats.totalJobs}</p>
              <p className="text-sm text-gray-500">Total Jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Image className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{stats.totalImagesProcessed}</p>
              <p className="text-sm text-gray-500">Images Processed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{stats.totalItemsCreated}</p>
              <p className="text-sm text-gray-500">Items Created</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">
                {stats.averageProcessingTime ? `${Math.round(stats.averageProcessingTime)}s` : '-'}
              </p>
              <p className="text-sm text-gray-500">Avg. Time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">No AI Jobs</h3>
            <p className="text-sm text-gray-500 mt-1">
              Upload images through the Inventory Wizard to start AI processing
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map(renderJobCard)}
        </div>
      )}
    </div>
  );
}

// Dashboard widget export
export function AIJobWidget() {
  return <AIJobMonitor compact limit={5} />;
}
