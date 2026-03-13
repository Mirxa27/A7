import React, { useState, useEffect } from 'react';
import { Shield, Lock, Fingerprint, ChevronRight, Activity } from 'lucide-react';
import { audio } from '../services/audioService';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'BOOT' | 'AUTH' | 'VERIFYING'>('BOOT');
  const [bootLog, setBootLog] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    // Boot Sequence
    const logs = [
      "INITIALIZING AGENT7 CORE...",
      "LOADING NEURAL MODULES...",
      "CONNECTING TO SATELLITE UPLINK...",
      "ESTABLISHING SECURE HANDSHAKE...",
      "SYSTEM READY."
    ];

    let delay = 0;
    logs.forEach((log, i) => {
      delay += Math.random() * 500 + 200;
      setTimeout(() => {
        setBootLog(prev => [...prev, log]);
        audio.playTyping();
        if (i === logs.length - 1) {
          setTimeout(() => setStep('AUTH'), 800);
        }
      }, delay);
    });
  }, []);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    audio.playClick();
    setStep('VERIFYING');
    
    // Simulate verification
    setTimeout(() => {
      // For demo, any password works, but we add a "fake" error for realism if empty
      if (password.length > 0) {
        audio.playSuccess();
        onLogin();
      } else {
        audio.playError();
        setError(true);
        setStep('AUTH');
        setTimeout(() => setError(false), 2000);
      }
    }, 1500);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-950 font-mono text-slate-200 p-4 relative overflow-hidden">
      {/* Background FX */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none z-0"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md">
        
        {step === 'BOOT' && (
          <div className="space-y-2">
            {bootLog.map((log, i) => (
              <div key={i} className="text-xs text-emerald-500 font-bold">
                <span className="mr-2">[{new Date().toLocaleTimeString()}]</span>
                {log}
              </div>
            ))}
            <div className="animate-pulse text-emerald-500">_</div>
          </div>
        )}

        {(step === 'AUTH' || step === 'VERIFYING') && (
          <div className="bg-slate-900/50 border border-slate-700 p-8 rounded-lg backdrop-blur-md shadow-2xl animate-[fadeIn_0.5s_ease-out]">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse"></div>
                <Shield size={64} className="text-emerald-500 relative z-10" />
              </div>
            </div>
            
            <h2 className="text-center text-2xl font-black tracking-[0.3em] mb-2 text-white">AGENT7</h2>
            <p className="text-center text-xs text-slate-500 mb-8 tracking-widest">RESTRICTED ACCESS TERMINAL</p>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="relative group">
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 ${error ? 'from-red-500 to-orange-500 opacity-75' : ''}`}></div>
                <div className="relative bg-slate-950 rounded-lg flex items-center p-1 border border-slate-800">
                  <Lock className="text-slate-500 ml-3" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={step === 'VERIFYING'}
                    className="w-full bg-transparent border-none text-white px-4 py-3 focus:ring-0 focus:outline-none placeholder-slate-600 font-mono tracking-widest text-center"
                    placeholder="ENTER ACCESS CODE"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={step === 'VERIFYING'}
                className={`w-full py-4 rounded-lg font-bold tracking-[0.2em] transition-all flex items-center justify-center relative overflow-hidden group ${
                  step === 'VERIFYING' 
                    ? 'bg-emerald-900/50 text-emerald-500 cursor-wait'
                    : 'bg-slate-800 hover:bg-emerald-900 text-slate-400 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500'
                }`}
              >
                {step === 'VERIFYING' ? (
                  <div className="flex items-center space-x-2">
                    <Activity className="animate-spin" size={18} />
                    <span>AUTHENTICATING...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Fingerprint size={18} />
                    <span>INITIALIZE SESSION</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-4 text-center text-xs text-red-500 font-bold animate-pulse">
                ACCESS DENIED. INVALID CREDENTIALS.
              </div>
            )}
            
            <div className="mt-8 text-center text-[10px] text-slate-600 uppercase tracking-widest">
              Secured by Quantum-256 Encryption
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
