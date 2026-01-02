import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Package, Wrench, Shield, FolderKanban, TrendingUp, AlertCircle } from 'lucide-react';
import { AIJobWidget } from '../components/AIJobMonitor';
import { useProjectStore } from '../store/projectStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useMaintenanceStore } from '../store/maintenanceStore';
import { useWarrantyStore } from '../store/warrantyStore';
import { cn, formatCurrency } from '../lib/utils';
import { MapleChat } from '../components/MapleChat';
import { useAISettingsStore } from '../store/aiSettingsStore';

export default function Dashboard() {
  const projects = useProjectStore((state) => state.projects);
  const items = useInventoryStore((state) => state.items);
  const { getUpcomingTasks } = useMaintenanceStore();
  const { getExpiringWarranties } = useWarrantyStore();
  
  // Subscribe to AI settings state for reactivity
  const aiSettings = useAISettingsStore((state) => state.settings);

  const upcomingTasks = getUpcomingTasks();
  const expiringWarranties = getExpiringWarranties(90);
  
  // Check if smart assistant is enabled (reactive to aiSettings changes)
  const showAIAssistant = aiSettings.activeProvider !== 'none' && 
    aiSettings.providers[aiSettings.activeProvider]?.enabled && 
    !!aiSettings.providers[aiSettings.activeProvider]?.apiKey &&
    aiSettings.features?.enableSmartAssistant;

  const stats = {
    totalItems: items.length,
    upcomingMaintenance: upcomingTasks.length,
    expiringWarranties: expiringWarranties.length,
    activeProjects: projects.filter((p) => p.status === 'in-progress').length,
    totalValue: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
  };

  const statCards = [
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      icon: FolderKanban,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-600 dark:text-blue-400',
      href: '/projects',
    },
    {
      title: 'Upcoming Maintenance',
      value: stats.upcomingMaintenance,
      icon: Wrench,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      textColor: 'text-orange-600 dark:text-orange-400',
      href: '/maintenance',
    },
    {
      title: 'Expiring Warranties',
      value: stats.expiringWarranties,
      icon: Shield,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-600 dark:text-red-400',
      href: '/items',
    },
    {
      title: 'Total Budget',
      value: formatCurrency(stats.totalValue),
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      href: '/projects',
    },
  ];

  const recentProjects = projects.slice(0, 3);

  const quickActions = [
    { label: 'Add Item', icon: Package, href: '/items', color: 'blue' },
    { label: 'New Project', icon: FolderKanban, href: '/projects', color: 'purple' },
    { label: 'Schedule Maintenance', icon: Wrench, href: '/maintenance', color: 'orange' },
    { label: 'Add Warranty', icon: Shield, href: '/items', color: 'emerald' },
  ];

  const actionColors = {
    blue: 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    purple: 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400',
    orange: 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    emerald: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your home.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.href}>
            <Card className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", stat.bgColor)}>
                      <stat.icon className={cn("w-6 h-6", stat.textColor)} />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={cn("h-1 bg-gradient-to-r", stat.color)}></div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Projects & Needs Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <FolderKanban className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Recent Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No projects yet</p>
                <Link to="/projects" className="text-primary hover:text-primary/80 text-sm font-medium mt-2 inline-block">
                  Create your first project →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div 
                    key={project.id} 
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{project.name}</h4>
                      <p className="text-sm text-muted-foreground">{project.category}</p>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{project.progress}%</p>
                        <p className="text-xs text-muted-foreground capitalize">{project.status.replace('-', ' ')}</p>
                      </div>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringWarranties.length > 0 && expiringWarranties.slice(0, 1).map((warranty) => (
                <Link 
                  key={warranty.id}
                  to="/warranties" 
                  className="flex items-start space-x-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                >
                  <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{warranty.itemName}</p>
                    <p className="text-sm text-muted-foreground">Expires soon</p>
                  </div>
                </Link>
              ))}
              {upcomingTasks.length > 0 && upcomingTasks.slice(0, 1).map((task) => (
                <Link 
                  key={task.id}
                  to="/maintenance" 
                  className="flex items-start space-x-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-sm text-muted-foreground">Due soon</p>
                  </div>
                </Link>
              ))}
              {expiringWarranties.length === 0 && upcomingTasks.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nothing needs attention right now</p>
                  <p className="text-sm text-muted-foreground mt-1">Great job staying on top of things! 🎉</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Processing & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Job Monitor Widget */}
        <div className="lg:col-span-1">
          <AIJobWidget />
        </div>

        {/* Quick Actions */}
        <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={cn(
                  "p-4 rounded-xl border-2 border-dashed transition-all hover:shadow-lg hover:scale-105",
                  actionColors[action.color as keyof typeof actionColors]
                )}
              >
                <action.icon className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium text-center">{action.label}</p>
              </Link>
            ))}
          </div>
        </CardContent>
        </Card>
      </div>

      {/* Floating Maple AI Assistant */}
      {showAIAssistant && (
        <MapleChat
          context="general"
          floating={true}
          defaultCollapsed={true}
          minHeight="450px"
        />
      )}
    </div>
  );
}
