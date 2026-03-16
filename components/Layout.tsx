import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewState } from '../types';
import { ShieldAlert, Activity, FileText, Network, Terminal, LogOut, Radio, UserCheck, TrendingUp, Database, Crosshair, Menu, X, Volume2, VolumeX, HardDrive, Settings as SettingsIcon } from 'lucide-react';
import { useOperations } from '../context/OperationsContext';
import { useNotification } from '../context/NotificationContext';
import { addSystemLog } from '../services/storageService';
import { audio } from '../services/audioService';
import { authService } from '../services/authService';

interface LayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, setView, children }) => {
  const { resetOperation, aiStatus } = useOperations();
  const { notify } = useNotification();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [metrics, setMetrics] = useState<any>({ cpu: 0, memory: { percentage: 0 } });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/metrics', { headers: authService.getAuthHeaders() as any });
        if (res.ok) setMetrics(await res.json());
      } catch (e) { /* ignore */ }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async () => {
      audio.playClick();
      resetOperation();
      addSystemLog('USER_OPS', 'Manual Secure Disconnect initiated.', 'WARNING').catch(() => {});
      notify('SECURE DISCONNECT INITIATED', 'error');
      await authService.logout();
      setTimeout(() => window.location.reload(), 1000); 
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    audio.setEnabled(newState);
    if (newState) {
        audio.playClick();
        notify('AUDIO SYSTEMS ONLINE', 'success');
    } else {
        notify('AUDIO SYSTEMS SILENCED', 'info');
    }
  };

  const handleNavClick = (view: ViewState) => {
      audio.playHover();
      setView(view);
      setMobileMenuOpen(false);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => handleNavClick(view)}
      onMouseEnter={() => audio.playHover()}
      className={`flex items-center space-x-3 w-full p-3 rounded-r-lg transition-all duration-300 border-l-4 ${
        currentView === view
          ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400'
          : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-emerald-300'
      }`}
    >
      <Icon size={20} />
      <span className="font-bold tracking-wider">{label}</span>
      {currentView === view && (
        <motion.div 
          layoutId="activeNav"
          className="absolute right-0 w-1 h-8 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
        />
      )}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-200 font-mono selection:bg-emerald-500/30">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-50">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="text-emerald-500" size={24} />
            <span className="font-bold text-white tracking-widest">AGENT7</span>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-400">
              {mobileMenuOpen ? <X /> : <Menu />}
          </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 border-r border-slate-800 flex flex-col bg-slate-900/95 backdrop-blur-md z-40 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-6 border-b border-slate-800 flex items-center space-x-2 h-20 lg:h-auto"
        >
          <ShieldAlert className="text-emerald-500" size={32} />
          <div>
            <h1 className="text-xl font-bold text-white tracking-widest">AGENT7</h1>
            <p className="text-xs text-emerald-600 font-mono">INTEL_OPS_V.2.4</p>
          </div>
        </motion.div>

        <nav className="flex-1 py-6 space-y-1 pr-4 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-2 text-xs font-mono text-slate-600 font-bold">CORE SYSTEMS</div>
          <NavItem view={ViewState.DASHBOARD} icon={Activity} label="OVERVIEW" />
          <NavItem view={ViewState.SEARCH} icon={Database} label="INTEL DATABASE" />
          <NavItem view={ViewState.ANALYSIS} icon={FileText} label="INTEL ANALYSIS" />
          <NavItem view={ViewState.SURVEILLANCE} icon={Radio} label="SURVEILLANCE" />
          
          <div className="px-4 py-2 mt-4 text-xs font-mono text-slate-600 font-bold">OPS MODULES</div>
          <NavItem view={ViewState.TARGET_OPS} icon={Crosshair} label="TARGET OPS" />
          <NavItem view={ViewState.DATA_INGESTION} icon={HardDrive} label="DATA INGESTION" />
          <NavItem view={ViewState.SOCIAL_ENG} icon={UserCheck} label="SOCIAL ENG" />
          <NavItem view={ViewState.PREDICTIVE} icon={TrendingUp} label="PREDICTIVE" />
          
          <div className="px-4 py-2 mt-4 text-xs font-mono text-slate-600 font-bold">DIAGNOSTICS</div>
          <NavItem view={ViewState.NETWORK} icon={Network} label="NETWORK GRAPH" />
          <NavItem view={ViewState.LOGS} icon={Terminal} label="SYSTEM LOGS" />
          <NavItem view={ViewState.SETTINGS} icon={SettingsIcon} label="AI SETTINGS" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-900 rounded p-3 text-xs font-mono text-slate-500 border border-slate-800 mb-4"
          >
             <div className="flex justify-between">
                <span>CPU</span>
                <span className="text-emerald-500">{metrics.cpu}%</span>
             </div>
             <div className="w-full bg-slate-800 h-1 mt-1 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.cpu}%` }}
                  className="bg-emerald-500 h-full"
                ></motion.div>
             </div>
             <div className="flex justify-between mt-2">
                <span>MEM</span>
                <span className="text-emerald-500">{metrics.memory.percentage}%</span>
             </div>
              <div className="w-full bg-slate-800 h-1 mt-1 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.memory.percentage}%` }}
                  className="bg-emerald-500 h-full"
                ></motion.div>
             </div>
          </motion.div>
          
          <div className="flex space-x-2">
              <button 
                onClick={toggleSound}
                className="flex-1 flex items-center justify-center space-x-2 text-slate-500 hover:text-emerald-400 bg-slate-800 p-2 rounded transition-colors"
                title="Toggle Audio"
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button 
                onClick={handleDisconnect}
                className="flex-[2] flex items-center justify-center space-x-2 text-slate-500 hover:text-red-400 bg-slate-800 p-2 rounded transition-colors"
              >
                <LogOut size={16} />
                <span className="text-xs">LOGOUT</span>
              </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative pt-16 lg:pt-0 flex flex-col">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
        
        {/* Breadcrumb / Header */}
        <header className="hidden lg:flex h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm items-center justify-between px-8 z-30">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-4"
            >
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
                    <ShieldAlert size={14} className="text-emerald-500" />
                    <span className="tracking-widest">AGENT7</span>
                    <span className="text-slate-700">/</span>
                    <span className="text-emerald-400 font-bold tracking-widest">{currentView.replace('_', ' ')}</span>
                </div>
            </motion.div>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${aiStatus === 'READY' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'} `}></div>
                        <span className={`text-[10px] font-mono font-bold ${aiStatus === 'READY' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {aiStatus === 'READY' ? 'NEURAL_LINK_STABLE' : 'NEURAL_LINK_OFFLINE'}
                        </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                        <Activity size={12} className="text-blue-500" />
                        <span>LATENCY: 24ms</span>
                    </div>
                </div>
        </header>

        <div className="flex-1 relative overflow-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
