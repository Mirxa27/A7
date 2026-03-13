import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { IntelAnalysis } from './components/IntelAnalysis';
import { IntelSearch } from './components/IntelSearch';
import { NetworkLogs } from './components/NetworkLogs';
import { NetworkGraph } from './components/NetworkGraph';
import { SurveillanceGrid } from './components/SurveillanceGrid';
import { SocialEngineering } from './components/SocialEngineering';
import { PredictiveModeling } from './components/PredictiveModeling';
import { TargetOperations } from './components/TargetOperations';
import { DataIngestion } from './components/DataIngestion';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ViewState } from './types';
import { OperationsProvider } from './context/OperationsContext';
import { NotificationProvider } from './context/NotificationContext';

function App() {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  const renderView = () => {
    return (
      <div key={view} className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
        {(() => {
          switch (view) {
            case ViewState.DASHBOARD: return <Dashboard />;
            case ViewState.SEARCH: return <IntelSearch />;
            case ViewState.ANALYSIS: return <IntelAnalysis />;
            case ViewState.SURVEILLANCE: return <SurveillanceGrid />;
            case ViewState.TARGET_OPS: return <TargetOperations />;
            case ViewState.DATA_INGESTION: return <DataIngestion />;
            case ViewState.SOCIAL_ENG: return <SocialEngineering />;
            case ViewState.PREDICTIVE: return <PredictiveModeling />;
            case ViewState.LOGS: return <NetworkLogs />;
            case ViewState.NETWORK: return <NetworkGraph />;
            case ViewState.SETTINGS: return <Settings />;
            default: return <Dashboard />;
          }
        })()}
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <OperationsProvider>
          <Layout currentView={view} setView={setView}>
            {renderView()}
          </Layout>
        </OperationsProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;