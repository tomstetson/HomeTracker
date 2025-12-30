import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Items from './pages/Items';
import InventoryWizard from './pages/InventoryWizard';
import Vendors from './pages/Vendors';
import Maintenance from './pages/Maintenance';
import Documents from './pages/Documents';
import Diagrams from './pages/Diagrams';
import HomeInfo from './pages/HomeInfo';
import Budget from './pages/Budget';
import Settings from './pages/Settings';
import Warranties from './pages/Warranties';
import Backup from './pages/Backup';
import Login from './pages/Login';
import Register from './pages/Register';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { ToastContainer, useToast } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { autoSync } from './lib/autoSync';
import { initNotificationService } from './lib/notificationService';
import { registerServiceWorker } from './lib/pwa';

function AppContent() {
  const toast = useToast();
  const [synced, setSynced] = useState(false);
  const { initialize, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Initialize Supabase auth on startup
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Auto-sync on startup (only if authenticated)
    if (!synced && isAuthenticated) {
      autoSync().then((result) => {
        setSynced(true);
        if (result.source === 'backend') {
          toast.info('Data Synced', 'Loaded latest data from server');
          // Reload to reflect synced data
          setTimeout(() => window.location.reload(), 500);
        } else if (result.source === 'local' && result.message.includes('synced to backend')) {
          toast.success('Backup Complete', 'Local data backed up to server');
        }
      });
    }
    
    // Initialize notification service
    initNotificationService();
    
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }
  }, [synced, toast, isAuthenticated]);

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      
      {/* Protected routes - wrapped in Layout */}
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/items" element={<Items />} />
              <Route path="/inventory-wizard" element={<InventoryWizard />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/diagrams" element={<Diagrams />} />
              <Route path="/home-info" element={<HomeInfo />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/warranties" element={<Warranties />} />
              <Route path="/backup" element={<Backup />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <ConfirmProvider>
            <AppContent />
            <ToastContainer />
          </ConfirmProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
