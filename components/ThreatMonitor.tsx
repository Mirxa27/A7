import React, { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { audio } from '../services/audioService';
import { eventService } from '../services/eventService';

export const ThreatMonitor: React.FC = () => {
  const { notify } = useNotification();
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  useEffect(() => {
    const handleLog = (log: any) => {
      if (log.status === 'WARNING' || log.status === 'ERROR') {
        notify(log.message, log.status === 'ERROR' ? 'error' : 'warning');
        setLastAlert(new Date().toLocaleTimeString());
      }
    };
    eventService.on('log', handleLog);
    return () => eventService.off('log', handleLog);
  }, [notify]);

  return (
    <div className="fixed bottom-4 left-4 z-40 pointer-events-none">
      <div className="bg-black/80 border border-emerald-500/30 rounded-lg p-3 backdrop-blur-md flex items-center gap-3 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-emerald-500/70 font-bold">Threat Monitor Active</span>
          {lastAlert && (
            <span className="text-[9px] text-white/40 font-mono">Last Alert: {lastAlert}</span>
          )}
        </div>
      </div>
    </div>
  );
};
