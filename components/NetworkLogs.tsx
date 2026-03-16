import React, { useEffect, useRef, useState } from 'react';
import { SystemLog } from '../types';
import { getSystemLogs } from '../services/storageService';
import { eventService } from '../services/eventService';
import { Terminal, Activity, Server, AlertCircle } from 'lucide-react';

export const NetworkLogs: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial Load
    getSystemLogs().then(setLogs).catch(() => {});

    const handleNewLog = (log: any) => setLogs((prev: any) => [log, ...prev].slice(0, 200));
    eventService.on('log', handleNewLog);
    return () => eventService.off('log', handleNewLog);

    // Listen for real-time updates from storageService
    const handleUpdate = () => {
        getSystemLogs().then(setLogs).catch(() => {});
    };

    window.addEventListener('storage_agent7_system_logs', handleUpdate);
    return () => window.removeEventListener('storage_agent7_system_logs', handleUpdate);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6">
        <h2 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
            <Terminal className="text-emerald-500" />
            SYSTEM LOGS
        </h2>
        <p className="text-slate-400 font-mono text-sm mt-1">
          REAL-TIME OPERATIONAL EVENT STREAM
        </p>
      </header>

      <div className="flex-1 bg-black border border-slate-800 rounded font-mono text-xs p-4 overflow-hidden flex flex-col shadow-inner">
        {logs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-700">
                <Activity size={48} className="mb-4 opacity-20" />
                <p>NO SYSTEM ACTIVITY DETECTED</p>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar" ref={scrollRef}>
            {logs.slice().reverse().map((log) => (
                <div key={log.id} className="flex space-x-3 border-b border-slate-900/50 pb-1 hover:bg-slate-900/30 transition-colors">
                <span className="text-slate-600 min-w-[80px]">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                <span className="text-blue-500 font-bold min-w-[80px] text-right px-2">{log.source}</span>
                <span className={`w-16 font-bold text-center ${
                    log.status === 'ERROR' ? 'text-red-500 bg-red-900/10' :
                    log.status === 'WARNING' ? 'text-yellow-500 bg-yellow-900/10' :
                    log.status === 'SUCCESS' ? 'text-emerald-500 bg-emerald-900/10' :
                    'text-slate-400'
                }`}>{log.status}</span>
                <span className="text-slate-300 flex-1 break-words">{log.message}</span>
                </div>
            ))}
            <div className="animate-pulse text-emerald-500 font-bold mt-2 flex items-center">
                <span className="mr-2">_</span>
                <span className="text-[10px] text-emerald-900 bg-emerald-500/20 px-1 rounded">LIVE</span>
            </div>
            </div>
        )}
      </div>
    </div>
  );
};