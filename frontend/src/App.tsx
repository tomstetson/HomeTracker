import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Items from './pages/Items';
import Vendors from './pages/Vendors';
import Maintenance from './pages/Maintenance';
import Documents from './pages/Documents';
import HomeInfo from './pages/HomeInfo';
import Settings from './pages/Settings';
import { ToastContainer, useToast } from './components/ui/Toast';
import { autoSync } from './lib/autoSync';

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
  }, [synced, toast]);

  return (
    <Layout>
      <Routes>
        {/* Core modules - streamlined navigation */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/items" element={<Items />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/documents" element={<Documents />} />
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
        <AppContent />
        <ToastContainer />
      </Router>
    </ThemeProvider>
  );
}

export default App;
