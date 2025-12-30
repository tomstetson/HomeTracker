import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, Wrench, DollarSign, FolderKanban, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { ActionSheet } from './ui/BottomSheet';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/', icon: <Home className="w-5 h-5" />, label: 'Home' },
  { path: '/items', icon: <Package className="w-5 h-5" />, label: 'Items' },
  { path: '/maintenance', icon: <Wrench className="w-5 h-5" />, label: 'Tasks' },
  { path: '/budget', icon: <DollarSign className="w-5 h-5" />, label: 'Budget' },
  { path: '/projects', icon: <FolderKanban className="w-5 h-5" />, label: 'Projects' },
];

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const quickAddActions = [
    {
      label: 'Add Item',
      icon: <Package className="w-5 h-5" />,
      onClick: () => navigate('/items?action=add'),
    },
    {
      label: 'Add Maintenance Task',
      icon: <Wrench className="w-5 h-5" />,
      onClick: () => navigate('/maintenance?action=add'),
    },
    {
      label: 'Add Transaction',
      icon: <DollarSign className="w-5 h-5" />,
      onClick: () => navigate('/budget?action=add'),
    },
    {
      label: 'Add Project',
      icon: <FolderKanban className="w-5 h-5" />,
      onClick: () => navigate('/projects?action=add'),
    },
  ];

  return (
    <>
      {/* Bottom Navigation Bar - Only visible on mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.slice(0, 2).map((item) => (
            <NavButton
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            />
          ))}

          {/* Center FAB */}
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center justify-center w-14 h-14 -mt-6 bg-primary text-primary-foreground rounded-full shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>

          {navItems.slice(2, 4).map((item) => (
            <NavButton
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>
      </nav>

      {/* Quick Add Action Sheet */}
      <ActionSheet
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        title="Quick Add"
        actions={quickAddActions}
      />

      {/* Spacer for content above bottom nav on mobile */}
      <div className="h-16 md:hidden" />
    </>
  );
}

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center w-16 h-full gap-0.5 transition-colors',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground active:text-foreground'
      )}
    >
      {item.icon}
      <span className="text-[10px] font-medium">{item.label}</span>
    </button>
  );
}

// Hook to detect if we're on mobile
export function useIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}
