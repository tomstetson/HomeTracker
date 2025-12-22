import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  FolderKanban,
  Package,
  Wrench,
  FileText,
  Menu,
  X,
  Settings,
  Users,
  Database,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Building2,
  PenTool,
  Wallet,
  MapPin,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/theme';
import { getAllData } from '../lib/storage';
import DataManager from './DataManager';
import GlobalSearch from './GlobalSearch';
import NotificationPanel from './NotificationPanel';

// Hook to get property info from consolidated storage
function usePropertyInfo() {
  const [propertyInfo, setPropertyInfo] = useState<{ address: string; city: string; state: string } | null>(null);

  useEffect(() => {
    const loadPropertyInfo = () => {
      try {
        const data = getAllData();
        const property = data.settings?.property;
        if (property && (property.address || property.city)) {
          setPropertyInfo({
            address: property.address || '',
            city: property.city || '',
            state: property.state || '',
          });
        } else {
          setPropertyInfo(null);
        }
      } catch {
        setPropertyInfo(null);
      }
    };

    loadPropertyInfo();
    // Listen for storage changes
    window.addEventListener('storage', loadPropertyInfo);
    // Also check periodically for same-tab updates
    const interval = setInterval(loadPropertyInfo, 2000);
    return () => {
      window.removeEventListener('storage', loadPropertyInfo);
      clearInterval(interval);
    };
  }, []);

  return propertyInfo;
}

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDataManagerOpen, setIsDataManagerOpen] = useState(false);
  const location = useLocation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const propertyInfo = usePropertyInfo();
  
  // Check for mobile device on mount
  useEffect(() => {
    const checkMobile = () => window.innerWidth < 768;
    if (checkMobile()) {
      setSidebarCollapsed(true);
    }
  }, []);

  // Streamlined navigation - 10 core modules
  // Home Info = Property details, value, paint colors, emergency info
  // Settings = App config, API settings, data backup
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Inventory', href: '/items', icon: Package },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench },
    { name: 'Vendors', href: '/vendors', icon: Users },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Diagrams', href: '/diagrams', icon: PenTool },
    { name: 'Home Info', href: '/home-info', icon: Building2 },
    { name: 'Budget', href: '/budget', icon: Wallet },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const sidebarWidth = sidebarCollapsed ? 'w-20' : 'w-64';
  const contentMargin = sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen transition-all duration-300 hidden lg:block",
          sidebarWidth
        )}
      >
        <div className="h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 shadow-lg flex flex-col">
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center space-x-3 overflow-hidden">
              <img src="/logo.svg" alt="HomeTracker" className="w-8 h-8 flex-shrink-0" />
              {!sidebarCollapsed && (
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent whitespace-nowrap">
                  HomeTracker
                </h1>
              )}
            </div>
          </div>

          {/* Property Info */}
          {!sidebarCollapsed && (
            <Link 
              to="/home-info"
              className="block p-3 m-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors group"
            >
              {propertyInfo ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wide">
                      My Property
                    </p>
                  </div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 truncate">
                    {propertyInfo.address || 'Address not set'}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {propertyInfo.city}{propertyInfo.city && propertyInfo.state ? ', ' : ''}{propertyInfo.state}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wide">
                      Property
                    </p>
                  </div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Set up your home</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                    Click to configure →
                  </p>
                </>
              )}
            </Link>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 mt-4 overflow-y-auto">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center py-3 text-sm font-medium rounded-lg transition-all group",
                        sidebarCollapsed ? "justify-center px-2" : "px-4",
                        isActive
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                      )}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <item.icon
                        className={cn(
                          "w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0",
                          !sidebarCollapsed && "mr-3",
                          isActive ? "text-white" : "text-gray-500 dark:text-gray-400"
                        )}
                      />
                      {!sidebarCollapsed && item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-slate-700">
            {/* Collapse Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 mb-3 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <>
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  <span className="text-sm">Collapse</span>
                </>
              )}
            </button>

            {/* User Info */}
            <div className={cn(
              "flex items-center",
              sidebarCollapsed ? "justify-center" : "space-x-3"
            )}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">Homeowner</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 transition-transform lg:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 shadow-lg flex flex-col">
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <img src="/logo.svg" alt="HomeTracker" className="w-8 h-8" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                HomeTracker
              </h1>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Property Info */}
          <Link 
            to="/home-info"
            onClick={() => setMobileSidebarOpen(false)}
            className="block p-3 m-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors group"
          >
            {propertyInfo ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wide">
                    My Property
                  </p>
                </div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 truncate">
                  {propertyInfo.address || 'Address not set'}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {propertyInfo.city}{propertyInfo.city && propertyInfo.state ? ', ' : ''}{propertyInfo.state}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wide">
                    Property
                  </p>
                </div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Set up your home</p>
                <p className="text-xs text-blue-500 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  Click to configure →
                </p>
              </>
            )}
          </Link>

          {/* Navigation */}
          <nav className="flex-1 px-3 mt-4 overflow-y-auto">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={cn(
                        "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all group",
                        isActive
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-5 h-5 mr-3 transition-transform group-hover:scale-110",
                          isActive ? "text-white" : "text-gray-500 dark:text-gray-400"
                        )}
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Homeowner</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
              </div>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={cn("transition-all duration-300", contentMargin)}>
        {/* Top Bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm">
          <div className="h-full px-4 lg:px-6 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Desktop spacer */}
            <div className="hidden lg:block" />

            {/* Right Actions */}
            <div className="flex items-center space-x-2">
              {/* Global Search */}
              <GlobalSearch />
              
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
                title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Data Management */}
              <button
                onClick={() => setIsDataManagerOpen(true)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
                title="Data Management"
              >
                <Database className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <NotificationPanel />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>

      {/* Data Manager */}
      <DataManager isOpen={isDataManagerOpen} onClose={() => setIsDataManagerOpen(false)} />
    </div>
  );
}
