import React from 'react';
import { ShieldCheck, Lock, UserCheck, AlertTriangle, FileText, Database, Scale, Clock, EyeOff } from 'lucide-react';
import { TargetDossier } from '../types';

interface Props {
  dossier: TargetDossier | null;
}

export const IdentityPanel: React.FC<Props> = ({ dossier }) => {
  if (!dossier || !dossier.compliance || !dossier.identityConfidence) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
        <ShieldCheck size={48} className="mb-4" />
        <p className="font-mono text-sm">AWAITING COMPLIANCE METADATA</p>
      </div>
    );
  }

  const { compliance, identityConfidence } = dossier;

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar p-1">
      
      {/* Identity Confidence Section */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center text-blue-400 font-bold text-xs tracking-widest">
            <UserCheck size={16} className="mr-2" />
            IDENTITY CONFIDENCE SCORE
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            VERIFIED SOURCES: {identityConfidence.sources}
          </div>
        </div>

        <div className="flex items-center gap-8 mb-6">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="8" fill="transparent" />
              <circle 
                cx="48" cy="48" r="40" 
                stroke={identityConfidence.overallScore > 80 ? "#10b981" : identityConfidence.overallScore > 50 ? "#f59e0b" : "#ef4444"} 
                strokeWidth="8" 
                fill="transparent" 
                strokeDasharray={251.2} 
                strokeDashoffset={251.2 - (251.2 * identityConfidence.overallScore) / 100} 
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{identityConfidence.overallScore}</span>
              <span className="text-[8px] text-slate-500">CONFIDENCE</span>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>NAME MATCH</span>
                <span>{identityConfidence.nameMatch}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${identityConfidence.nameMatch}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>DOB VERIFICATION</span>
                <span>{identityConfidence.dobMatch}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${identityConfidence.dobMatch}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>ADDRESS CORRELATION</span>
                <span>{identityConfidence.addressMatch}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${identityConfidence.addressMatch}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Monitor Section */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center text-emerald-400 font-bold text-xs tracking-widest">
            <Scale size={16} className="mr-2" />
            COMPLIANCE MONITOR
          </div>
          <div className="flex items-center space-x-2">
             <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${compliance.gdprStatus === 'COMPLIANT' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>
                GDPR: {compliance.gdprStatus}
             </span>
             <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${compliance.ccpaStatus === 'OPT_IN' ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                CCPA: {compliance.ccpaStatus}
             </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
           <div className="bg-slate-950 border border-slate-800 p-3 rounded">
              <div className="text-[10px] text-slate-500 font-mono mb-1 flex items-center">
                 <Database size={12} className="mr-1" /> LEGAL BASIS
              </div>
              <div className="text-sm font-bold text-slate-200">{compliance.legalBasis.replace('_', ' ')}</div>
           </div>
           <div className="bg-slate-950 border border-slate-800 p-3 rounded">
              <div className="text-[10px] text-slate-500 font-mono mb-1 flex items-center">
                 <EyeOff size={12} className="mr-1" /> ANONYMIZATION
              </div>
              <div className="text-sm font-bold text-slate-200">{compliance.anonymizationLevel}</div>
           </div>
        </div>

        <div className="bg-red-900/10 border border-red-900/30 rounded p-4 flex items-start space-x-3">
           <Clock size={16} className="text-red-400 mt-0.5" />
           <div>
              <div className="text-xs font-bold text-red-400 mb-1">DATA RETENTION POLICY</div>
              <p className="text-[10px] text-red-200/70 font-mono leading-relaxed">
                 This record is scheduled for automated deletion on <span className="text-white font-bold">{compliance.dataRetentionDate}</span> in accordance with Article 17 (Right to Erasure).
              </p>
           </div>
        </div>
      </div>

    </div>
  );
};
