import React, { useEffect, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { getAssets, getIntelRecords } from '../services/storageService';
import { RadarMetric } from '../types';

export const NetworkGraph: React.FC = () => {
  const [data, setData] = useState<RadarMetric[]>([]);

  const calculateMetrics = async (): Promise<RadarMetric[]> => {
    const assets = getAssets();
    const intel = await getIntelRecords();

    // 1. Coverage: Based on unique regions occupied
    const regions = new Set(assets.map(a => a.region));
    // Cap at 150 for 6+ regions
    const coverageScore = Math.min(150, (regions.size / 4) * 100 + 50); 

    // 2. Speed: Aggregate Data Rate of active assets
    const totalRate = assets.reduce((acc, curr) => acc + (curr.status === 'ACTIVE' ? curr.dataRate : 0), 0);
    // Normalize: 5000kbps = 150
    const speedScore = Math.min(150, (totalRate / 5000) * 150);

    // 3. Stealth: Penalize for compromised/exfiltrating assets
    const compromisedCount = assets.filter(a => a.status === 'COMPROMISED').length;
    const exfiltratingCount = assets.filter(a => a.status === 'EXFILTRATING').length;
    const stealthScore = Math.max(20, 150 - (compromisedCount * 40) - (exfiltratingCount * 20));

    // 4. Access: Volume of Intel Records
    // 50 records = max score
    const accessScore = Math.min(150, (intel.length / 10) * 150);

    // 5. Reliability: Uptime ratio (Active / Total)
    const activeCount = assets.filter(a => a.status === 'ACTIVE').length;
    const reliabilityScore = assets.length > 0 ? (activeCount / assets.length) * 150 : 0;

    // 6. Encryption: Base level + bonus for 'TROJAN_DAEMON' types
    const secureAssets = assets.filter(a => a.type === 'TROJAN_DAEMON' || a.type === 'GHOST_RELAY').length;
    const encryptionScore = Math.min(150, 80 + (secureAssets * 20));

    return [
      { subject: 'Encryption', A: encryptionScore, fullMark: 150 },
      { subject: 'Speed', A: speedScore, fullMark: 150 },
      { subject: 'Stealth', A: stealthScore, fullMark: 150 },
      { subject: 'Coverage', A: coverageScore, fullMark: 150 },
      { subject: 'Reliability', A: reliabilityScore, fullMark: 150 },
      { subject: 'Access', A: accessScore, fullMark: 150 },
    ];
  };

  useEffect(() => {
    // Initial calculation
    calculateMetrics().then(setData);

    // Listen for updates
    const handleAssetUpdate = () => calculateMetrics().then(setData);
    const handleIntelUpdate = () => calculateMetrics().then(setData);

    window.addEventListener('storage_agent7_assets', handleAssetUpdate);
    window.addEventListener('storage_agent7_intel_db', handleIntelUpdate);

    return () => {
      window.removeEventListener('storage_agent7_assets', handleAssetUpdate);
      window.removeEventListener('storage_agent7_intel_db', handleIntelUpdate);
    };
  }, []);

  return (
    <div className="p-8 h-full flex flex-col">
      <h2 className="text-3xl font-bold text-white tracking-tighter mb-6">NETWORK CAPABILITY MATRIX</h2>
      <div className="flex-1 bg-slate-900/30 border border-slate-800 rounded p-8 flex items-center justify-center min-h-0 overflow-hidden relative">
         <div className="absolute top-4 right-4 text-xs font-mono text-slate-500 text-right">
            <div>METRICS: REAL-TIME</div>
            <div>SOURCE: STORAGE_GATEWAY</div>
         </div>
         <div className="w-full h-full max-w-4xl min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 14 }} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#475569" tick={false} />
                <Radar
                    name="System Capabilities"
                    dataKey="A"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="#10b981"
                    fillOpacity={0.4}
                />
                </RadarChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};