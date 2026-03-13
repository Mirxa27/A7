import React, { useState } from 'react';
import { generateBehavioralForecast } from '../services/geminiService';
import { BehavioralForecast } from '../types';
import { TrendingUp, Activity, AlertOctagon, GitCommit } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const PredictiveModeling: React.FC = () => {
  const [intelData, setIntelData] = useState('');
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<BehavioralForecast | null>(null);

  const handleForecast = async () => {
    if (!intelData) return;
    setLoading(true);
    setForecast(null);
    try {
      const result = await generateBehavioralForecast(intelData);
      setForecast(result);
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
            <TrendingUp className="text-blue-500" />
            PREDICTIVE MODELING ENGINE
        </h2>
        <p className="text-slate-400 font-mono text-sm mt-1">
          BEHAVIORAL FORECASTING & RISK CALCULUS
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1 min-h-0">
        {/* Input Column */}
        <div className="xl:col-span-1 bg-slate-900/40 border border-slate-800 rounded-lg p-6 flex flex-col">
            <label className="text-blue-400 font-mono text-sm mb-2 font-bold">TARGET DATA VECTOR</label>
            <textarea
                value={intelData}
                onChange={(e) => setIntelData(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded p-4 text-slate-300 font-mono focus:outline-none focus:border-blue-500 transition-all resize-none mb-4 text-sm"
                placeholder="Input target historical data, recent comms, and psychological profile..."
            ></textarea>
            <button
                onClick={handleForecast}
                disabled={loading || !intelData}
                className={`w-full py-3 rounded font-bold tracking-widest transition-all border border-blue-900 ${
                loading 
                    ? 'bg-slate-800 text-slate-500' 
                    : 'bg-blue-900/40 hover:bg-blue-800/40 text-blue-400 hover:text-blue-200'
                }`}
            >
                {loading ? 'CALCULATING PROBABILITIES...' : 'RUN SIMULATION'}
            </button>
        </div>

        {/* Visualization Column */}
        <div className="xl:col-span-2 flex flex-col gap-6">
             {forecast ? (
                 <>
                    {/* Top Row: Metrics & Narrative */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6">
                            <h3 className="text-xs text-slate-500 font-mono font-bold mb-4">RISK METRICS</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm font-mono mb-1">
                                        <span className="text-slate-300">FLIGHT RISK</span>
                                        <span className={forecast.flightRisk > 70 ? "text-red-500" : "text-blue-500"}>{forecast.flightRisk}%</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{width: `${forecast.flightRisk}%`}}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm font-mono mb-1">
                                        <span className="text-slate-300">COMPROMISE SUSCEPTIBILITY</span>
                                        <span className="text-emerald-500">{forecast.compromiseSusceptibility}%</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{width: `${forecast.compromiseSusceptibility}%`}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 overflow-y-auto max-h-[250px] custom-scrollbar">
                             <h3 className="text-xs text-slate-500 font-mono font-bold mb-2">NARRATIVE ANALYSIS</h3>
                             <p className="text-sm text-slate-300 font-mono leading-relaxed">
                                 {forecast.narrativeAnalysis}
                             </p>
                        </div>
                    </div>

                    {/* Bottom Row: Scenarios Chart */}
                    <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-lg p-6 flex flex-col min-h-[300px]">
                        <h3 className="text-xs text-slate-500 font-mono font-bold mb-4">PREDICTED SCENARIO PROBABILITIES</h3>
                        <div className="flex-1 w-full min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={forecast.scenarios} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} stroke="#475569" fontSize={12} />
                                    <YAxis dataKey="action" type="category" width={150} stroke="#94a3b8" fontSize={11} />
                                    <Tooltip 
                                        cursor={{fill: '#1e293b'}}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                    />
                                    <Bar dataKey="probability" fill="#3b82f6" barSize={20} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                             {forecast.scenarios.map((scene, i) => (
                                 <div key={i} className="text-xs font-mono text-slate-500 border border-slate-800 p-2 rounded flex items-center">
                                     <AlertOctagon size={12} className="mr-2 text-blue-500" />
                                     <span>IF {scene.trigger} {'->'} {scene.action}</span>
                                 </div>
                             ))}
                        </div>
                    </div>
                 </>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 border border-dashed border-slate-800 rounded-lg">
                    <Activity size={64} className="mb-4 opacity-20" />
                    <p className="font-mono text-sm">AWAITING SIMULATION DATA</p>
                </div>
             )}
        </div>
      </div>
    </div>
  );
};