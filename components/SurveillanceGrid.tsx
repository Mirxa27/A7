import React, { useState, useEffect } from 'react';
import { Wifi, Eye, Lock, Globe, Server, User, MapPin, Activity, ShieldAlert } from 'lucide-react';
import { Asset, Target } from '../types';
import { getAssets, saveAsset, getTargets } from '../services/storageService';
import { generateTacticalAsset } from '../services/geminiService';

export const SurveillanceGrid: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    setAssets(getAssets());
    setTargets(getTargets());
    
    const handleUpdate = () => {
        setAssets(getAssets());
        setTargets(getTargets());
    };
    window.addEventListener('storage_agent7_assets', handleUpdate);
    window.addEventListener('storage_agent7_targets', handleUpdate);
    return () => {
        window.removeEventListener('storage_agent7_assets', handleUpdate);
        window.removeEventListener('storage_agent7_targets', handleUpdate);
    };
  }, []);

  const deployAsset = async () => {
    setIsDeploying(true);
    try {
        const newAsset = await generateTacticalAsset();
        const updatedAssets = saveAsset(newAsset);
        setAssets(updatedAssets);
    } catch (e) {
        console.error("Failed to deploy asset", e);
    } finally {
        setIsDeploying(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
              <Globe className="text-emerald-500" />
              GLOBAL ASSET GRID
          </h2>
          <p className="text-slate-400 font-mono text-sm mt-1">
            AUTONOMOUS SURVEILLANCE NODE MANAGEMENT
          </p>
        </div>
        <button 
          onClick={deployAsset}
          disabled={isDeploying}
          className={`px-4 py-2 rounded font-mono text-sm tracking-wider flex items-center transition-all border ${
            isDeploying 
                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                : 'bg-emerald-900/50 hover:bg-emerald-800 text-emerald-400 border-emerald-700'
          }`}
        >
          {isDeploying ? (
             <>
                <span className="animate-spin h-3 w-3 border-2 border-slate-500 border-t-white rounded-full mr-2"></span>
                PROVISIONING NODE...
             </>
          ) : (
             <>
                <Server size={16} className="mr-2" />
                DEPLOY NEW ASSET
             </>
          )}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-4 custom-scrollbar">
        {/* Active Targets Section */}
        <div className="lg:col-span-2 xl:col-span-3 bg-slate-900/20 border border-slate-800/50 rounded-lg p-6 mb-2">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-900/20 rounded text-red-500">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">ACTIVE TARGET TRACKING</h3>
                        <p className="text-xs text-slate-500 font-mono uppercase">Continuous monitoring of identified subjects</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 bg-black/40 px-3 py-1 rounded border border-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-mono text-emerald-500 font-bold tracking-widest">LIVE_FEED_ACTIVE</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {targets.length > 0 ? targets.map(target => (
                    <div key={target.id} className="bg-slate-950/50 border border-slate-800 rounded p-4 relative overflow-hidden group hover:border-red-500/30 transition-all flex flex-col">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                            <User size={48} />
                        </div>
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="flex items-center space-x-3">
                                {target.images && target.images.length > 0 ? (
                                    <img 
                                        src={target.images[0]} 
                                        alt={target.name} 
                                        className="w-10 h-10 rounded-full object-cover border border-slate-700"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                                        <User size={20} />
                                    </div>
                                )}
                                <div>
                                    <div className="text-sm font-bold text-white mb-1">{target.name}</div>
                                    <div className="text-[10px] font-mono text-slate-500">{target.id}</div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="text-[10px] font-mono text-emerald-500 font-bold mb-1">STABLE_LINK</div>
                                <div className="text-[9px] text-slate-600 font-mono uppercase">Last Seen: {new Date(target.lastSeen).toLocaleTimeString()}</div>
                            </div>
                        </div>

                        <div className="space-y-3 relative z-10 flex-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-slate-500 flex items-center"><MapPin size={10} className="mr-1" /> LOCATION:</span>
                                <span className="text-slate-300">{target.location || 'TRIANGULATING...'}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-slate-500 flex items-center"><Activity size={10} className="mr-1" /> ACTIVITY:</span>
                                <span className="text-emerald-400 font-bold">{target.activityLevel}%</span>
                            </div>
                            
                            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500 animate-[pulse_2s_infinite]" 
                                    style={{ width: `${target.activityLevel}%` }}
                                ></div>
                            </div>

                            {target.socialFootprint && (
                                <div className="pt-2 border-t border-slate-800/50 space-y-2">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                        <span className="text-slate-500">SOCIAL VISIBILITY:</span>
                                        <span className="text-blue-400 font-bold">{target.socialFootprint.visibility}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                        <span className="text-slate-500">ACCESS LEVEL:</span>
                                        <span className={`font-bold ${
                                            target.socialFootprint.accessLevel === 'FULL' ? 'text-emerald-500' :
                                            target.socialFootprint.accessLevel === 'PARTIAL' ? 'text-amber-500' :
                                            'text-red-500'
                                        }`}>{target.socialFootprint.accessLevel}</span>
                                    </div>
                                    <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                                        {target.socialFootprint.accounts.map((acc, i) => (
                                            <div key={i} className="flex flex-col">
                                                <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[8px] text-slate-400 font-mono whitespace-nowrap">
                                                    {acc.platform}
                                                </span>
                                                {acc.accessDetails && (
                                                    <div className="text-[7px] text-purple-500 font-mono mt-0.5 truncate max-w-[80px]" title={acc.accessDetails}>
                                                        {acc.accessDetails}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center relative z-10">
                            <div className="flex -space-x-1">
                                {[1,2,3].map(i => (
                                    <div key={i} className="w-5 h-5 rounded-full bg-slate-800 border border-slate-900 flex items-center justify-center text-[8px] text-slate-500 font-bold">
                                        N{i}
                                    </div>
                                ))}
                            </div>
                            <button className="text-[9px] font-mono text-emerald-500 hover:underline uppercase font-bold">
                                Open Feed
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-700 border border-dashed border-slate-800 rounded-lg">
                        <Eye size={32} className="mb-2 opacity-20" />
                        <p className="text-xs font-mono uppercase tracking-widest">No targets currently under active surveillance</p>
                    </div>
                )}
            </div>
        </div>

        {assets.map((asset) => (
          <div key={asset.id} className="bg-slate-900/40 border border-slate-800 rounded p-4 hover:border-emerald-500/50 transition-all group relative overflow-hidden animate-fadeIn">
            {asset.status === 'EXFILTRATING' && (
              <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none"></div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded bg-slate-800 ${
                  asset.status === 'COMPROMISED' ? 'text-red-500' : 
                  asset.status === 'EXFILTRATING' ? 'text-emerald-400 animate-pulse' : 'text-blue-400'
                }`}>
                  {asset.type === 'IOT_SWARM' && <Wifi size={20} />}
                  {asset.type === 'PACKET_SNIFFER' && <Eye size={20} />}
                  {asset.type === 'GHOST_RELAY' && <Server size={20} />}
                  {asset.type === 'TROJAN_DAEMON' && <Lock size={20} />}
                </div>
                <div>
                  <div className="font-mono font-bold text-white">{asset.id}</div>
                  <div className="text-xs text-slate-500 font-mono">{asset.type}</div>
                </div>
              </div>
              <div className={`text-xs px-2 py-1 rounded border font-mono ${
                asset.status === 'ACTIVE' ? 'border-emerald-900 text-emerald-500 bg-emerald-900/20' :
                asset.status === 'EXFILTRATING' ? 'border-amber-900 text-amber-500 bg-amber-900/20' :
                asset.status === 'COMPROMISED' ? 'border-red-900 text-red-500 bg-red-900/20' :
                'border-slate-700 text-slate-500'
              }`}>
                {asset.status}
              </div>
            </div>

            <div className="space-y-2 text-sm font-mono text-slate-400">
              <div className="flex justify-between">
                <span>REGION:</span>
                <span className="text-white">{asset.region}</span>
              </div>
              <div className="flex justify-between">
                <span>DATA STREAM:</span>
                <span className={asset.dataRate > 1000 ? 'text-emerald-400' : 'text-white'}>{asset.dataRate} kb/s</span>
              </div>
              <div className="flex justify-between">
                <span>ENCRYPTION:</span>
                <span className="text-white">AES-256-GCM</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
               <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mr-4">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000" 
                    style={{width: `${Math.random() * 100}%`}}
                  ></div>
               </div>
               <span className="text-[10px] text-slate-500 whitespace-nowrap">BUFFER LOAD</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};