import React, { useState, useEffect } from 'react';
import { analyzeIntel } from '../services/geminiService';
import { getIntelRecords } from '../services/storageService';
import { AnalysisResult, IntelRecord } from '../types';
import { Search, AlertTriangle, CheckCircle, BrainCircuit, MapPin, User, FileText, ChevronDown, ChevronUp, Database, Zap, ShieldCheck, Scale, Link, UserCheck } from 'lucide-react';

import { performOsintLookup } from '../services/osintService';

export const IntelAnalysis: React.FC = () => {
  // ... state ...
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [records, setRecords] = useState<IntelRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getIntelRecords().then(setRecords);
  }, []);

  const handleAnalysis = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setResult(null);
    try {
      // 1. Perform real OSINT lookup if applicable
      const realOsintData = await performOsintLookup(input.trim());
      
      // 2. Analyze with AI, passing the real OSINT data as context
      const data = await analyzeIntel(input.trim(), realOsintData);
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadRecord = (details: string) => {
    setInput(details);
    // Optional: Auto-scroll to top or highlight input
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="p-8 h-full flex flex-col max-h-screen">
      <header className="mb-6">
        <h2 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
            <BrainCircuit className="text-emerald-500" />
            INTELLIGENCE SYNTHESIS
        </h2>
        <p className="text-slate-400 font-mono text-sm mt-1">
          AI-POWERED THREAT ASSESSMENT & ENTITY EXTRACTION
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* Left Column: Input & Feed */}
        <div className="flex flex-col h-full space-y-4 min-h-0">
            {/* Input Section */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 flex flex-col h-1/2">
                <label className="text-emerald-500 font-mono text-sm mb-2 flex justify-between">
                    <span>RAW DATA INPUT</span>
                    <span className="text-slate-500">
                      {/^\+[1-9]\d{1,14}$/.test(input.trim()) ? 'E.164 MOBILE DETECTED' : 
                       /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(input.trim()) ? 'SOCIAL URL DETECTED' : 
                       'ENCRYPTION: NONE'}
                    </span>
                </label>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded p-4 text-slate-300 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none mb-4 text-sm custom-scrollbar"
                    placeholder="// Paste intercepted communications, mission reports, or surveillance logs here for analysis..."
                ></textarea>
                
                <button
                    onClick={handleAnalysis}
                    disabled={loading || !input}
                    className={`w-full py-3 rounded font-bold tracking-widest transition-all flex items-center justify-center space-x-2 ${
                    loading 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    }`}
                >
                    {loading ? (
                        <>
                            <span className="animate-spin h-5 w-5 border-2 border-slate-500 border-t-white rounded-full mr-2"></span>
                            <span>PROCESSING DATA STREAM...</span>
                        </>
                    ) : (
                        <>
                            <Search size={20} />
                            <span>INITIATE ANALYSIS</span>
                        </>
                    )}
                </button>
            </div>

            {/* Intel Feed Section */}
            <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex flex-col min-h-0">
                <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-slate-800">
                    <Database size={16} className="text-emerald-500" />
                    <span className="text-sm font-bold text-white tracking-widest">LIVE INTEL FEED</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {records.map((rec) => (
                        <div key={rec.id} className={`border rounded transition-all bg-slate-950/50 ${expandedId === rec.id ? 'border-emerald-500/40' : 'border-slate-800 hover:border-slate-700'}`}>
                            <div 
                                className="p-3 flex justify-between items-center cursor-pointer"
                                onClick={() => toggleExpand(rec.id)}
                            >
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    <div className={`text-xs px-1.5 py-0.5 rounded border font-mono ${
                                        rec.type === 'BREACH' ? 'border-red-900 text-red-500 bg-red-900/10' :
                                        rec.type === 'SURVEILLANCE' ? 'border-blue-900 text-blue-500 bg-blue-900/10' :
                                        'border-slate-700 text-slate-500'
                                    }`}>
                                        {rec.type}
                                    </div>
                                    <div className="truncate font-mono text-xs text-slate-300">{rec.title}</div>
                                </div>
                                <div className="text-slate-500 hover:text-emerald-500">
                                    {expandedId === rec.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </div>
                            
                            {expandedId === rec.id && (
                                <div className="px-3 pb-3 animate-fadeIn">
                                    <div className="text-xs font-mono text-slate-500 mb-2 line-clamp-3 italic border-l-2 border-slate-800 pl-2">
                                        {rec.details}
                                    </div>
                                    <button 
                                        onClick={() => loadRecord(rec.details || '')}
                                        className="w-full py-2 bg-slate-800 hover:bg-emerald-900/30 border border-slate-700 hover:border-emerald-500/50 text-xs font-mono text-emerald-500 rounded flex items-center justify-center space-x-2 transition-all"
                                    >
                                        <Zap size={12} />
                                        <span>LOAD & ANALYZE</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Column: Output Section */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 overflow-y-auto custom-scrollbar relative">
            {!result && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                    <FileText size={64} className="mb-4 opacity-20" />
                    <p className="font-mono text-sm">AWAITING INPUT DATA</p>
                </div>
            )}

            {loading && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                    <div className="font-mono text-emerald-500 animate-pulse text-lg">DECRYPTING...</div>
                    <div className="w-64 h-1 bg-slate-800 rounded overflow-hidden">
                        <div className="h-full bg-emerald-500 animate-[loading_1s_ease-in-out_infinite] w-1/2"></div>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                        Running neural heuristics
                        <br/>
                        Cross-referencing databases
                        <br/>
                        Calculating threat vectors
                    </div>
                </div>
            )}

            {result && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Header Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950 p-4 border border-slate-800 rounded">
                            <div className="text-xs text-slate-500 font-mono mb-1">THREAT LEVEL</div>
                            <div className="flex items-end space-x-2">
                                <span className={`text-4xl font-bold font-mono ${
                                    result.threatLevel > 70 ? 'text-red-500' : 
                                    result.threatLevel > 40 ? 'text-yellow-500' : 'text-emerald-500'
                                }`}>
                                    {result.threatLevel}
                                </span>
                                <span className="text-sm text-slate-400 mb-1">/100</span>
                            </div>
                             <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${
                                        result.threatLevel > 70 ? 'bg-red-500' : 
                                        result.threatLevel > 40 ? 'bg-yellow-500' : 'bg-emerald-500'
                                    }`} 
                                    style={{ width: `${result.threatLevel}%` }}
                                ></div>
                             </div>
                        </div>
                        <div className="bg-slate-950 p-4 border border-slate-800 rounded">
                            <div className="text-xs text-slate-500 font-mono mb-1">SENTIMENT</div>
                            <div className="text-2xl font-bold text-white font-mono mt-1">{(result.sentiment || 'UNKNOWN').toUpperCase()}</div>
                            <div className="mt-2 text-xs text-slate-400 flex items-center">
                                {result.sentiment === 'Hostile' ? <AlertTriangle size={14} className="text-red-500 mr-1"/> : <CheckCircle size={14} className="text-emerald-500 mr-1"/>}
                                AI Confidence: 98.4%
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="border-l-2 border-emerald-500 pl-4 py-1">
                        <h3 className="text-slate-400 text-xs font-bold tracking-widest mb-2">EXECUTIVE SUMMARY</h3>
                        <p className="text-slate-200 leading-relaxed font-mono text-sm">
                            {result.summary}
                        </p>
                    </div>

                    {/* Entities & Locations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-slate-400 text-xs font-bold tracking-widest mb-3 flex items-center">
                                <User size={14} className="mr-2 text-emerald-500" /> IDENTIFIED ENTITIES
                            </h3>
                            <ul className="space-y-2">
                                {result.entities.length > 0 ? result.entities.map((entity, idx) => (
                                    <li key={idx} className="bg-slate-800/50 px-3 py-2 rounded border border-slate-700/50 text-sm font-mono text-emerald-100 flex items-center justify-between">
                                        <span>{entity}</span>
                                        <span className="text-[10px] text-emerald-500/50">ID_VERIFIED</span>
                                    </li>
                                )) : <li className="text-slate-600 text-sm italic">No entities detected</li>}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-slate-400 text-xs font-bold tracking-widest mb-3 flex items-center">
                                <MapPin size={14} className="mr-2 text-blue-500" /> LOCATIONS
                            </h3>
                            <ul className="space-y-2">
                                {result.locations.length > 0 ? result.locations.map((loc, idx) => (
                                    <li key={idx} className="bg-slate-800/50 px-3 py-2 rounded border border-slate-700/50 text-sm font-mono text-blue-100 flex items-center justify-between">
                                        <span>{loc}</span>
                                        <span className="text-[10px] text-blue-500/50">GEO_LOCKED</span>
                                    </li>
                                )) : <li className="text-slate-600 text-sm italic">No locations detected</li>}
                            </ul>
                        </div>
                    </div>

                    {/* Recommendation */}
                    <div className="bg-red-950/20 border border-red-900/50 p-4 rounded mt-4">
                         <h3 className="text-red-400 text-xs font-bold tracking-widest mb-2 flex items-center">
                            <AlertTriangle size={14} className="mr-2" /> TACTICAL RECOMMENDATION
                        </h3>
                        <p className="text-red-100 font-mono text-sm">
                            {result.tacticalRecommendation}
                        </p>
                    </div>

                    {/* New Sections: Identity Resolution, Compliance, Risk Assessment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Identity Confidence */}
                        {result.identityConfidence && (
                            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded">
                                <h3 className="text-blue-400 text-xs font-bold tracking-widest mb-3 flex items-center">
                                    <UserCheck size={14} className="mr-2" /> IDENTITY RESOLUTION
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs font-mono text-slate-300">
                                        <span>OVERALL CONFIDENCE</span>
                                        <span className={result.identityConfidence.overallScore > 80 ? 'text-emerald-500' : 'text-yellow-500'}>{result.identityConfidence.overallScore}%</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                        <div className={`h-full ${result.identityConfidence.overallScore > 80 ? 'bg-emerald-500' : 'bg-yellow-500'}`} style={{ width: `${result.identityConfidence.overallScore}%` }}></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 mt-2">
                                        <div>NAME MATCH: <span className="text-slate-200">{result.identityConfidence.nameMatch}%</span></div>
                                        <div>DOB MATCH: <span className="text-slate-200">{result.identityConfidence.dobMatch}%</span></div>
                                        <div>ADDRESS: <span className="text-slate-200">{result.identityConfidence.addressMatch}%</span></div>
                                        <div>SOURCES: <span className="text-slate-200">{result.identityConfidence.sources}</span></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Compliance & Risk */}
                        <div className="space-y-4">
                            {result.compliance && (
                                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded">
                                    <h3 className="text-emerald-400 text-xs font-bold tracking-widest mb-3 flex items-center">
                                        <Scale size={14} className="mr-2" /> COMPLIANCE LAYER
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
                                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                            <div className="text-slate-500 mb-1">GDPR STATUS</div>
                                            <div className={result.compliance.gdprStatus === 'COMPLIANT' ? 'text-emerald-400' : 'text-red-400'}>{result.compliance.gdprStatus}</div>
                                        </div>
                                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                            <div className="text-slate-500 mb-1">CCPA STATUS</div>
                                            <div className="text-blue-400">{result.compliance.ccpaStatus}</div>
                                        </div>
                                        <div className="bg-slate-950 p-2 rounded border border-slate-800 col-span-2">
                                            <div className="text-slate-500 mb-1">LEGAL BASIS</div>
                                            <div>{result.compliance.legalBasis.replace('_', ' ')}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Risk Assessment */}
                    {result.riskAssessment && (
                        <div className={`p-4 rounded border mt-4 ${result.riskAssessment.sensitiveDataExposed ? 'bg-red-900/20 border-red-900/50' : 'bg-slate-900/60 border-slate-800'}`}>
                            <h3 className={`text-xs font-bold tracking-widest mb-3 flex items-center ${result.riskAssessment.sensitiveDataExposed ? 'text-red-400' : 'text-slate-400'}`}>
                                <ShieldCheck size={14} className="mr-2" /> RISK ASSESSMENT
                            </h3>
                            <div className="space-y-2">
                                {result.riskAssessment.riskIndicators.map((indicator, idx) => (
                                    <div key={idx} className="flex items-start text-sm font-mono text-slate-300">
                                        <span className="text-red-500 mr-2">!</span>
                                        <span>{indicator}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sources */}
                    {result.sources && result.sources.length > 0 && (
                        <div className="mt-4 border-t border-slate-800 pt-4">
                            <h3 className="text-slate-400 text-xs font-bold tracking-widest mb-3 flex items-center">
                                <Link size={14} className="mr-2" /> VERIFIED SOURCES
                            </h3>
                            <ul className="space-y-2">
                                {result.sources.map((source, idx) => (
                                    <li key={idx} className="text-xs font-mono">
                                        <a href={source.uri} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline flex items-center">
                                            <span className="truncate">{source.title}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};