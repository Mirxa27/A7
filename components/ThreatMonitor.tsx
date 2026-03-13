import React, { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { audio } from '../services/audioService';
import { addSystemLog } from '../services/storageService';

const THREAT_MESSAGES = [
  "HIGH-PRIORITY: Unauthorized access attempt detected on Node-X7.",
  "CRITICAL: Unusual data exfiltration pattern identified in EU-CENTRAL.",
  "ALERT: Subject-09 has changed geolocation to restricted zone.",
  "WARNING: Encrypted packet burst detected from unknown origin.",
  "INTEL: Significant shift in social sentiment for Target Alpha.",
  "SYSTEM: AI Core identifying predictive anomaly in behavioral forecast."
];

export const ThreatMonitor: React.FC = () => {
  const { notify } = useNotification();
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      // 10% chance of a threat alert every 30 seconds
      if (Math.random() < 0.1) {
        const message = THREAT_MESSAGES[Math.floor(Math.random() * THREAT_MESSAGES.length)];
        notify(message, 'warning');
        addSystemLog('NETWORK', message, 'WARNING');
        setLastAlert(new Date().toLocaleTimeString());
      }
    }, 30000);

    return () => clearInterval(interval);
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
