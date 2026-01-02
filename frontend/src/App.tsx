import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageErrorBoundary } from './components/PageErrorBoundary';
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
              <Route path="/" element={
                <PageErrorBoundary pageName="Dashboard">
                  <Dashboard />
                </PageErrorBoundary>
              } />
              <Route path="/projects" element={
                <PageErrorBoundary pageName="Projects" showBackButton>
                  <Projects />
                </PageErrorBoundary>
              } />
              <Route path="/items" element={
                <PageErrorBoundary pageName="Inventory" showBackButton>
                  <Items />
                </PageErrorBoundary>
              } />
              <Route path="/inventory-wizard" element={
                <PageErrorBoundary pageName="Inventory Wizard" showBackButton>
                  <InventoryWizard />
                </PageErrorBoundary>
              } />
              <Route path="/maintenance" element={
                <PageErrorBoundary pageName="Maintenance" showBackButton>
                  <Maintenance />
                </PageErrorBoundary>
              } />
              <Route path="/vendors" element={
                <PageErrorBoundary pageName="Vendors" showBackButton>
                  <Vendors />
                </PageErrorBoundary>
              } />
              <Route path="/documents" element={
                <PageErrorBoundary pageName="Documents" showBackButton>
                  <Documents />
                </PageErrorBoundary>
              } />
              <Route path="/diagrams" element={
                <PageErrorBoundary pageName="Diagrams" showBackButton>
                  <Diagrams />
                </PageErrorBoundary>
              } />
              <Route path="/home-info" element={
                <PageErrorBoundary pageName="Home Info" showBackButton>
                  <HomeInfo />
                </PageErrorBoundary>
              } />
              <Route path="/budget" element={
                <PageErrorBoundary pageName="Budget" showBackButton>
                  <Budget />
                </PageErrorBoundary>
              } />
              <Route path="/settings" element={
                <PageErrorBoundary pageName="Settings" showBackButton>
                  <Settings />
                </PageErrorBoundary>
              } />
              <Route path="/warranties" element={
                <PageErrorBoundary pageName="Warranties" showBackButton>
                  <Warranties />
                </PageErrorBoundary>
              } />
              <Route path="/backup" element={
                <PageErrorBoundary pageName="Backup" showBackButton>
                  <Backup />
                </PageErrorBoundary>
              } />
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
