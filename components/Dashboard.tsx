import React, { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Shield, Globe, Users, Wifi, LucideIcon, Activity, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAssets, getIntelRecords, getSystemLogs, getSettings } from '../services/storageService';
import { ChartDataPoint } from '../types';
import { useOperations } from '../context/OperationsContext';
const generateInitialData = (): ChartDataPoint[] => {
  return Array.from({ length: 20 }, (_, i) => ({
    name: `T-${i}`,
    uv: 0,
    pv: 0,
    amt: 0,
  }));
};

interface StatCardProps {
  title: string;
  value: number;
  sub: string;
  icon: LucideIcon;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, sub, icon: Icon, color }) => {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  return (
    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all duration-500 cursor-default">
      <div className={`absolute top-0 left-0 w-1 h-full ${color.replace('text-', 'bg-')}`}></div>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-950 rounded border border-slate-800 group-hover:scale-110 transition-transform duration-500">
          <Icon className={color} size={20} />
        </div>
        <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">Live_Feed</span>
            <div className="w-8 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div className={`h-full ${color.replace('text-', 'bg-')} animate-pulse`} style={{ width: `${Math.random() * 100}%` }}></div>
            </div>
        </div>
      </div>
      <h3 className="text-slate-500 text-xs font-mono font-bold tracking-widest mb-1 uppercase">{title}</h3>
      <div className="text-3xl font-bold text-white tracking-tighter tabular-nums flex items-baseline gap-2">
        {displayValue}
        <span className="text-[10px] text-slate-600 font-mono">UNIT_VAL</span>
      </div>
      <div className={`text-[10px] mt-2 font-mono uppercase tracking-tight ${color.replace('text-', 'text-opacity-60 ')}`}>{sub}</div>
      
      {/* Background Decoration */}
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Icon size={120} />
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<ChartDataPoint[]>(generateInitialData());
  const { aiStatus, checkAIStatus } = useOperations();
  const [stats, setStats] = useState({
    threats: 0,
    nodes: 0,
    interceptions: 0,
    logs: 0,
    bandwidth: 0
  });
  const [activeRegions, setActiveRegions] = useState<string[]>([]);

  // Update Stats from Storage
  const updateStats = async () => {
    const assets = getAssets();
    const intel = await getIntelRecords();
    const logs = getSystemLogs();

    // Re-check AI status periodically
    checkAIStatus();

    const totalBandwidth = assets.reduce((acc, curr) => acc + (curr.status === 'ACTIVE' ? curr.dataRate : 0), 0);
    
    setStats({
        threats: intel.filter(i => i.type === 'BREACH' || i.type === 'INTERCEPT').length,
        nodes: assets.length,
        interceptions: intel.length,
        logs: logs.length,
        bandwidth: totalBandwidth
    });

    setActiveRegions([...new Set(assets.map(a => a.region))]);
    return totalBandwidth;
  };

  useEffect(() => {
    updateStats();

    const handleStorageUpdate = () => {
      updateStats();
    };

    window.addEventListener('storage_agent7_ai_settings', handleStorageUpdate);
    window.addEventListener('storage_agent7_intel_db', handleStorageUpdate);
    window.addEventListener('storage_agent7_assets', handleStorageUpdate);

    const interval = setInterval(async () => {
      const currentBandwidth = await updateStats();
      const noise = Math.random() * 500 - 250;
      const simulatedTraffic = Math.max(0, currentBandwidth + noise);
      
      setData(prev => {
          const next = [...prev.slice(1), {
            name: `T-${Math.floor(Date.now() / 1000) % 100}`,
            uv: Math.floor(simulatedTraffic), 
            pv: Math.floor(simulatedTraffic * 0.6 + Math.random() * 100), 
            amt: Math.floor(simulatedTraffic),
          }];
          return next;
      });
    }, 2000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage_agent7_ai_settings', handleStorageUpdate);
      window.removeEventListener('storage_agent7_intel_db', handleStorageUpdate);
      window.removeEventListener('storage_agent7_assets', handleStorageUpdate);
    };
  }, []);

  // Memoize map dots to prevent re-render jitter on every data update
  const mapDots = useMemo(() => {
      return activeRegions.map((region, idx) => {
          // Deterministic random position based on string char code
          const top = (region.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 7) % 70 + 15;
          const left = (region.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 13) % 70 + 15;
          const color = idx % 2 === 0 ? 'bg-red-500' : 'bg-blue-500';
          
          return (
              <React.Fragment key={region}>
                  <div 
                      className={`absolute w-2 h-2 ${color} rounded-full animate-ping`} 
                      style={{ top: `${top}%`, left: `${left}%`, animationDuration: `${2 + idx}s` }}
                  ></div>
                  <div 
                      className={`absolute w-2 h-2 ${color} rounded-full`} 
                      style={{ top: `${top}%`, left: `${left}%` }}
                  ></div>
              </React.Fragment>
          );
      });
  }, [activeRegions]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-4xl font-bold text-white tracking-tighter mb-1">MISSION CONTROL</h2>
          <div className="flex items-center gap-6">
              <p className="text-slate-500 font-mono text-xs tracking-widest uppercase">
                GLOBAL SURVEILLANCE STATUS: <span className="text-emerald-500 animate-pulse">ACTIVE</span>
              </p>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  aiStatus === 'READY' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                  aiStatus === 'OFFLINE' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' :
                  'bg-slate-700'
                }`}></div>
                <span className={`text-[10px] font-mono font-bold tracking-tighter ${
                  aiStatus === 'READY' ? 'text-emerald-500' :
                  aiStatus === 'OFFLINE' ? 'text-red-500' :
                  'text-slate-500'
                }`}>
                  AI_LINK: {aiStatus === 'READY' ? 'SYNCHRONIZED' : aiStatus === 'OFFLINE' ? 'DISCONNECTED' : 'INITIALIZING...'}
                </span>
              </div>
              <div className="h-1 w-24 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 animate-progress" style={{ width: '100%' }}></div>
              </div>
          </div>
        </div>
        <div className="text-right font-mono">
             <div className="text-[10px] text-slate-600 tracking-widest uppercase mb-1">SYSTEM_TIME_UTC</div>
             <div className="text-2xl font-bold text-emerald-500 tabular-nums tracking-tighter">{new Date().toLocaleTimeString()}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="DETECTED THREATS" value={stats.threats} sub="HIGH_PRIORITY_TARGETS" icon={Shield} color="text-red-500" />
        <StatCard title="ACTIVE NODES" value={stats.nodes} sub="GLOBAL_ASSET_GRID" icon={Globe} color="text-blue-500" />
        <StatCard title="INTEL RECORDS" value={stats.interceptions} sub="ENCRYPTED_ARCHIVES" icon={Wifi} color="text-amber-500" />
        <StatCard title="SYSTEM EVENTS" value={stats.logs} sub="24H_LOG_ACTIVITY" icon={Users} color="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-lg p-6 flex flex-col min-h-[400px] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
          <div className="flex justify-between items-center mb-8">
              <h3 className="text-slate-500 text-xs font-bold tracking-widest flex items-center uppercase">
                <Activity size={14} className="text-emerald-500 mr-2" />
                Live Network Bandwidth (kb/s)
              </h3>
              <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">Uplink</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">Downlink</span>
                  </div>
              </div>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace' }}
                    itemStyle={{ padding: '2px 0' }}
                    cursor={{ stroke: '#334155', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="uv" stroke="#10b981" fillOpacity={1} fill="url(#colorUv)" strokeWidth={2} animationDuration={1000} />
                <Area type="monotone" dataKey="pv" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPv)" strokeWidth={1} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 relative overflow-hidden flex flex-col min-h-[400px]">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(16,185,129,0.05),transparent_70%)] pointer-events-none"></div>
             <h3 className="text-slate-500 text-xs font-bold mb-8 tracking-widest uppercase flex items-center">
                <Globe size={14} className="text-blue-500 mr-2" />
                Target Sectors
            </h3>
            <div className="flex-1 relative">
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full aspect-square max-w-[240px] border border-slate-800/50 rounded-full relative animate-spin-slow">
                        <div className="absolute inset-0 border border-slate-800/30 rounded-full scale-[0.8]"></div>
                        <div className="absolute inset-0 border border-slate-800/20 rounded-full scale-[0.6]"></div>
                        <div className="absolute inset-0 border border-slate-800/10 rounded-full scale-[0.4]"></div>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"></div>
                    </div>
                 </div>
                 <div className="absolute inset-0">
                    {mapDots}
                 </div>
            </div>
            <div className="mt-8 space-y-4">
                <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50 backdrop-blur-sm">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-2 uppercase tracking-widest">
                        <span>Active Zones</span>
                        <span className="text-emerald-500 font-bold">{activeRegions.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar pr-2">
                        {activeRegions.length > 0 ? activeRegions.map(r => (
                            <span key={r} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] font-mono text-slate-400 uppercase">
                                {r}
                            </span>
                        )) : <span className="text-slate-700 text-[9px] font-mono italic">NO_ACTIVE_ZONES_DETECTED</span>}
                    </div>
                </div>
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[9px] font-mono text-slate-600 uppercase">Grid_Sync_Active</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-600 uppercase">V_2.4.0</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
