import React, { useState, useEffect } from 'react';
import { generatePersona } from '../services/geminiService';
import { PersonaProfile, Target } from '../types';
import { UserCheck, MessageSquare, Fingerprint, Brain, Globe, Share2, ExternalLink, Key, Eye, EyeOff, Shield, Lock, Users } from 'lucide-react';
import { getTargets, addSystemLog } from '../services/storageService';

export const SocialEngineering: React.FC = () => {
  const [targetWeakness, setTargetWeakness] = useState('');
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState<PersonaProfile | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);

  useEffect(() => {
    getTargets().then(setTargets).catch(() => {});
    const handleUpdate = () => getTargets().then(setTargets).catch(() => {});
    window.addEventListener('storage_agent7_targets', handleUpdate);
    return () => window.removeEventListener('storage_agent7_targets', handleUpdate);
  }, []);

  const handleGenerate = async () => {
    if (!targetWeakness) return;
    setLoading(true);
    setPersona(null);
    try {
      const result = await generatePersona(targetWeakness);
      setPersona(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6">
        <h2 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
            <UserCheck className="text-purple-500" />
            SOCIAL ENGINEERING MODULE
        </h2>
        <p className="text-slate-400 font-mono text-sm mt-1">
          AI-DRIVEN PERSONA GENERATION & SOCIAL FOOTPRINT ANALYSIS
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        {/* Left Column: Target Selection & Footprint */}
        <div className="lg:col-span-1 flex flex-col space-y-6 min-h-0">
            {/* Target Selection */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex flex-col h-[40%] min-h-0">
                <div className="flex items-center space-x-2 text-purple-400 font-mono text-xs font-bold mb-4 uppercase tracking-widest">
                    <Users size={14} />
                    <span>TARGET DATABASE</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {targets.length > 0 ? targets.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setSelectedTarget(t)}
                            className={`w-full text-left p-3 rounded border transition-all flex items-center space-x-3 ${
                                selectedTarget?.id === t.id 
                                ? 'bg-purple-900/20 border-purple-500/50' 
                                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                            }`}
                        >
                            {t.images && t.images.length > 0 ? (
                                <img 
                                    src={t.images[0]} 
                                    alt={t.name} 
                                    className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                    <Users size={14} />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-white truncate">{t.name}</div>
                                <div className="text-[10px] font-mono text-slate-500 mt-1 flex justify-between">
                                    <span>{t.id}</span>
                                    <span className={t.status === 'TRACKING' ? 'text-emerald-500' : 'text-slate-600'}>{t.status}</span>
                                </div>
                            </div>
                        </button>
                    )) : (
                        <div className="py-8 text-center text-slate-700 font-mono text-[10px]">
                            NO TARGETS FOUND
                        </div>
                    )}
                </div>
            </div>

            {/* Social Footprint Analysis */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2 text-purple-400 font-mono text-xs font-bold uppercase tracking-widest">
                        <Globe size={14} />
                        <span>SOCIAL FOOTPRINT</span>
                    </div>
                    {selectedTarget && (
                        <button 
                            onClick={async () => {
                                if (!selectedTarget.name) return;
                                // Try to scan for the target's name as a username
                                const response = await fetch(`/api/osint/username/${encodeURIComponent(selectedTarget.name.replace(/\s+/g, '').toLowerCase())}`);
                                const result = await response.json();
                                const found = result.filter((r: any) => r.available === false);
                                // Update the target in storage (this is a bit complex since we need to update the global state)
                                // For now, let's just show a toast or log it.
                                addSystemLog('USER_OPS', `Real-time social scan for ${selectedTarget.name} found ${found.length} profiles.`, 'SUCCESS').catch(() => {});
                            }}
                            className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                        >
                            SCAN SOCIALS
                        </button>
                    )}
                </div>

                {selectedTarget ? (
                    <div className="flex-1 flex flex-col space-y-6 overflow-y-auto custom-scrollbar pr-2">
                        {selectedTarget.images && selectedTarget.images.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {selectedTarget.images.map((img, i) => (
                                    <img 
                                        key={i} 
                                        src={img} 
                                        alt={`Target ${i}`} 
                                        className="w-full aspect-square object-cover rounded border border-slate-800"
                                        referrerPolicy="no-referrer"
                                    />
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-950/50 border border-slate-800 p-3 rounded">
                                <div className="text-[10px] text-slate-500 font-mono mb-1 uppercase">Visibility</div>
                                <div className="text-xl font-bold text-white">{selectedTarget.socialFootprint?.visibility || 0}%</div>
                            </div>
                            <div className="bg-slate-950/50 border border-slate-800 p-3 rounded">
                                <div className="text-[10px] text-slate-500 font-mono mb-1 uppercase">Access</div>
                                <div className={`text-sm font-bold ${
                                    selectedTarget.socialFootprint?.accessLevel === 'FULL' ? 'text-emerald-500' : 
                                    selectedTarget.socialFootprint?.accessLevel === 'PARTIAL' ? 'text-yellow-500' : 'text-red-500'
                                }`}>
                                    {selectedTarget.socialFootprint?.accessLevel || 'NONE'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">DISCOVERED ACCOUNTS</div>
                            {(selectedTarget.socialFootprint?.accounts || []).length > 0 ? (
                                selectedTarget.socialFootprint?.accounts.map((acc, idx) => (
                                    <div key={idx} className="flex flex-col p-3 bg-slate-950/30 border border-slate-800/50 rounded hover:bg-slate-900/50 transition-colors space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-1.5 bg-slate-800 rounded text-slate-400">
                                                    <Share2 size={12} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-white">{acc.platform}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono">{acc.username}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button className="p-1 text-slate-600 hover:text-emerald-500 transition-colors">
                                                    <ExternalLink size={12} />
                                                </button>
                                                <button className="p-1 text-slate-600 hover:text-purple-500 transition-colors">
                                                    <Key size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        {acc.accessDetails && (
                                            <div className="text-[9px] font-mono text-slate-500 bg-black/20 p-2 rounded border border-slate-800/50">
                                                <span className="text-purple-500 mr-1">ACCESS_VECTOR:</span>
                                                {acc.accessDetails}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="py-4 text-center text-slate-700 font-mono text-[10px]">
                                    NO ACCOUNTS DISCOVERED
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-700 text-center px-6">
                        <EyeOff size={32} className="mb-4 opacity-20" />
                        <p className="text-xs font-mono uppercase tracking-widest">Select a target to view social engineering data</p>
                    </div>
                )}
            </div>
        </div>

        {/* Right Column: Persona Generator */}
        <div className="lg:col-span-2 flex flex-col space-y-6 min-h-0">
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-8 flex flex-col flex-1 min-h-0">
                <div className="flex items-center space-x-2 text-purple-400 font-mono text-xs font-bold mb-6 uppercase tracking-widest">
                    <Brain size={16} />
                    <span>DEEP COVER PERSONA GENERATOR</span>
                </div>

                <div className="flex gap-4 mb-8 shrink-0">
                    <div className="flex-1 relative">
                        <Fingerprint className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                        <textarea 
                            value={targetWeakness}
                            onChange={(e) => setTargetWeakness(e.target.value)}
                            placeholder="Enter target profile or psychological weakness..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all font-mono text-sm h-12 resize-none leading-relaxed"
                        />
                    </div>
                    <button 
                        onClick={handleGenerate}
                        disabled={loading || !targetWeakness}
                        className="px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20 uppercase tracking-widest text-xs h-12"
                    >
                        {loading ? 'ANALYZING...' : 'GENERATE'}
                        <Brain size={16} />
                    </button>
                </div>

                <div className="flex-1 relative overflow-y-auto custom-scrollbar pr-2">
                    {!persona && !loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
                            <Fingerprint size={64} className="mb-4 opacity-20" />
                            <p className="font-mono text-sm uppercase tracking-widest">No active persona generated</p>
                        </div>
                    )}

                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin h-12 w-12 border-4 border-purple-900 border-t-purple-500 rounded-full"></div>
                        </div>
                    )}

                    {persona && (
                        <div className="space-y-8 animate-fadeIn">
                            <div className="flex items-center justify-between border-b border-purple-900/30 pb-6">
                                <div>
                                    <div className="text-xs text-purple-500 font-mono uppercase tracking-widest mb-1">CODENAME</div>
                                    <div className="text-3xl font-bold text-white tracking-widest">{persona.codename}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-purple-500 font-mono uppercase tracking-widest mb-1">OCCUPATION</div>
                                    <div className="text-xl text-slate-300">{persona.occupation}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Lock size={48} />
                                    </div>
                                    <h3 className="text-purple-400 font-mono text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2">
                                        <Shield size={14} />
                                        BACKSTORY & LEGEND
                                    </h3>
                                    <div className="text-sm text-slate-300 leading-relaxed font-mono">
                                        {persona.backgroundStory}
                                    </div>
                                </div>

                                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Brain size={48} />
                                    </div>
                                    <h3 className="text-purple-400 font-mono text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2">
                                        <MessageSquare size={14} />
                                        PSYCHOLOGICAL HOOKS
                                    </h3>
                                    <div className="space-y-3">
                                        {persona.psychologicalHooks.map((hook, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></div>
                                                <div className="text-xs text-slate-300 italic">"{hook}"</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-xl p-6">
                                <h3 className="text-emerald-500 font-mono text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare size={14} />
                                    SUGGESTED OPENING STRATEGY
                                </h3>
                                <div className="text-lg text-emerald-100 font-mono italic leading-relaxed">
                                    "{persona.suggestedOpeningLine}"
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
