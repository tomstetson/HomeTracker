import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
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
import Settings from './pages/Settings';
import { ToastContainer, useToast } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { autoSync } from './lib/autoSync';
import { initNotificationService } from './lib/notificationService';
import { registerServiceWorker } from './lib/pwa';

function AppContent() {
  const toast = useToast();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    // Auto-sync on startup
    if (!synced) {
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
  }, [synced, toast]);

  return (
    <Layout>
      <Routes>
        {/* Core modules - streamlined navigation */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/items" element={<Items />} />
        <Route path="/inventory-wizard" element={<InventoryWizard />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/diagrams" element={<Diagrams />} />
        <Route path="/home-info" element={<HomeInfo />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ConfirmProvider>
          <AppContent />
          <ToastContainer />
        </ConfirmProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
