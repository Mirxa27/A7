import React, { useRef, useEffect, useState } from 'react';
import { 
  Crosshair, Globe, Shield, Terminal, Activity, ChevronRight, 
  CheckCircle, ExternalLink, Cpu, FileText, Lock, RefreshCw, 
  Hash, Link as LinkIcon, AlertTriangle, UserCheck, AlertCircle, 
  Smartphone, Wifi, Radio, Zap, Battery, MapPin, Skull, Eye, 
  Database, Server, Radar, Folder, File, Image, Music, Video,
  Key, CreditCard, HardDrive, Download, Info, Flame, Siren,
  Volume2, Mic, Map, Navigation, LocateFixed, FileCode, FileImage, FileJson, FileText as FileIcon,
  ShieldCheck
} from 'lucide-react';
import { useOperations } from '../context/OperationsContext';
import { synthesizeSpeech } from '../services/geminiService';
import { audio } from '../services/audioService';
import { IdentityPanel } from './IdentityPanel';

// --- UTILITY COMPONENTS ---

// 1. Decryption Text Effect
const ScrambleText = ({ text, delay = 0 }: { text: string, delay?: number }) => {
  const [display, setDisplay] = useState('');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';

  useEffect(() => {
    let iteration = 0;
    let interval: any;
    
    setTimeout(() => {
      interval = setInterval(() => {
        setDisplay(text
          .split('')
          .map((letter, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
        );
        if (iteration >= text.length) clearInterval(interval);
        iteration += 1 / 3;
      }, 30);
    }, delay);

    return () => clearInterval(interval);
  }, [text, delay]);

  return <span>{display}</span>;
};

// 2. Animated Radar Visualizer
const RadarVisualizer = ({ active, color = "text-emerald-500" }: { active: boolean, color?: string }) => (
  <div className={`relative w-24 h-24 flex items-center justify-center opacity-80 ${active ? 'animate-pulse' : 'opacity-20 grayscale'}`}>
    <div className={`absolute inset-0 border-2 ${color.replace('text', 'border')} rounded-full opacity-20 animate-[spin_4s_linear_infinite]`}></div>
    <div className={`absolute inset-2 border ${color.replace('text', 'border')} border-dashed rounded-full opacity-40 animate-[spin_10s_linear_infinite_reverse]`}></div>
    <div className="absolute inset-0 flex items-center justify-center">
      <Crosshair size={24} className={color} />
    </div>
    {active && (
      <div className={`absolute top-1/2 left-1/2 w-[50%] h-[2px] ${color.replace('text', 'bg')} origin-left animate-[spin_2s_linear_infinite] opacity-50 shadow-[0_0_10px_currentColor]`}></div>
    )}
  </div>
);

// 3. Mock File System Data
const MOCK_FILES = [
  { name: 'DCIM', type: 'folder', size: '', date: '2023-11-01' },
  { name: 'Downloads', type: 'folder', size: '', date: '2023-11-04' },
  { name: 'Secure_Notes', type: 'folder', size: '', date: '2023-10-22' },
  { name: 'Signal_Backup.enc', type: 'file', icon: Lock, size: '45 MB', date: '2023-11-05' },
  { name: 'passwords.txt', type: 'file', icon: Key, size: '2 KB', date: '2023-10-15' },
  { name: 'bank_statement_nov.pdf', type: 'file', icon: FileText, size: '1.2 MB', date: '2023-11-02' },
  { name: 'contact_dump.vcf', type: 'file', icon: UserCheck, size: '800 KB', date: '2023-11-05' },
  { name: 'geo_history.json', type: 'file', icon: MapPin, size: '12 MB', date: '2023-11-05' },
];

const CYBER_TOOLS = [
    { 
      id: 'PEGASUS_LITE', 
      label: 'PEGASUS PROTOCOL', 
      icon: Smartphone, 
      color: 'text-pink-400', 
      border: 'border-pink-500/50', 
      bg: 'bg-pink-500/10', 
      highRisk: false,
      desc: 'Zero-click mobile surveillance suite aimed at kernel-level iOS/Android extraction.',
      risk: 'MODERATE: Requires carrier triangulation.'
    },
    { 
      id: 'ZERO_DAY', 
      label: '0-DAY EXPLOIT', 
      icon: Flame, 
      color: 'text-red-500', 
      border: 'border-red-600', 
      bg: 'bg-red-900/20', 
      highRisk: true,
      desc: 'Unpatched vulnerability execution for total system administrative control. IRREVERSIBLE.',
      risk: 'CRITICAL: Irreversible system instability & high detection footprint.'
    },
    { 
      id: 'SS7_INTERCEPT', 
      label: 'SS7 GATEWAY', 
      icon: Radio, 
      color: 'text-orange-400', 
      border: 'border-orange-500/50', 
      bg: 'bg-orange-500/10', 
      highRisk: false,
      desc: 'Man-in-the-Middle attack on global telecommunication signaling protocols.',
      risk: 'LOW: Passive interception, difficult to trace.'
    },
    { 
      id: 'ROOTKIT', 
      label: 'KERNEL ROOTKIT', 
      icon: Cpu, 
      color: 'text-purple-400', 
      border: 'border-purple-600', 
      bg: 'bg-purple-900/20', 
      highRisk: true,
      desc: 'Persistent deep-system backdoor masking processes and network activity.',
      risk: 'HIGH: Permanent hardware flagging if heuristics fail.'
    },
    { 
      id: 'BRUTE_FORCE', 
      label: 'QUANTUM DECRYPT', 
      icon: Lock, 
      color: 'text-blue-400', 
      border: 'border-blue-500/50', 
      bg: 'bg-blue-500/10', 
      highRisk: false,
      desc: 'Distributed quantum-computing array for breaking AES-256 encryption.',
      risk: 'MODERATE: High bandwidth usage triggers IDS alerts.'
    }
];

export const TargetOperations: React.FC = () => {
  const {
    targetInput, setTargetInput,
    emailInput, setEmailInput,
    phoneInput, setPhoneInput,
    socialsInput, setSocialsInput,
    socialInput, setSocialInput,
    objectiveInput, setObjectiveInput,
    activeResources, setActiveResources,
    status, localLogs,
    dossier, missionPlan, exfiltratedFiles,
    activeTab, setActiveTab,
    executeOperation, resetOperation
  } = useOperations();

  const logsEndRef = useRef<HTMLDivElement>(null);
  const [exfilTab, setExfilTab] = useState<'FILES' | 'NETWORK' | 'CREDS'>('FILES');

  const getFileIcon = (category: string) => {
    switch(category) {
      case 'DOC': return FileIcon;
      case 'IMG': return FileImage;
      case 'SYS': return FileCode;
      case 'DB': return Database;
      default: return FileText;
    }
  };
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  
  // Audio State
  const [audioLoading, setAudioLoading] = useState(false);
  
  // Terminal State
  const [commandInput, setCommandInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);

  useEffect(() => {
    // Sync context logs to terminal history
    if (localLogs.length > 0) {
        setTerminalHistory(prev => {
            const newLogs = localLogs.filter(log => !prev.includes(log));
            return [...prev, ...newLogs];
        });
    } else if (status === 'IDLE' && terminalHistory.length > 5) {
        setTerminalHistory(['> SYSTEM READY. AWAITING COMMANDS...']);
    }
  }, [localLogs, status]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const toggleResource = (id: string) => {
      if (status === 'ACTIVE') return;
      audio.playClick();
      if (activeResources.includes(id)) {
          setActiveResources(activeResources.filter(r => r !== id));
      } else {
          setActiveResources([...activeResources, id]);
      }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!commandInput.trim()) return;
      audio.playTyping();

      const cmd = commandInput.trim().toLowerCase();
      const args = cmd.split(' ');
      const mainCmd = args[0];

      setTerminalHistory(prev => [...prev, `root@agent7:~# ${commandInput}`]);
      setCommandInput('');

      // CLI Logic
      switch (mainCmd) {
          case 'help':
              setTerminalHistory(prev => [...prev, 
                  'AVAILABLE COMMANDS:',
                  '  set-target [id]  : Define primary target identifier',
                  '  set-obj [text]   : Define mission objective',
                  '  scan             : Initiate operations (requires target & obj)',
                  '  deploy [tool_id] : Toggle cyber resource (e.g. deploy zero_day)',
                  '  list-tools       : Show available arsenal',
                  '  whois [domain]   : Real-time WHOIS lookup',
                  '  dns [domain]     : Real-time DNS resolution',
                  '  phone [number]   : Real-time phone metadata lookup',
                  '  clear            : Clear terminal',
                  '  reset            : Reset current operation'
              ]);
              break;
          case 'set-target':
              if (args[1]) {
                  setTargetInput(args[1]);
                  setTerminalHistory(prev => [...prev, `> TARGET IDENTIFIER SET: ${(args[1] || '').toUpperCase()}`]);
              } else {
                  setTerminalHistory(prev => [...prev, `> ERROR: MISSING ARGUMENT. USAGE: set-target [id]`]);
              }
              break;
          case 'set-obj':
              if (args.length > 1) {
                  const obj = args.slice(1).join(' ');
                  setObjectiveInput(obj);
                  setTerminalHistory(prev => [...prev, `> OBJECTIVE UPDATED: ${(obj || '').toUpperCase().substring(0, 20)}...`]);
              } else {
                  setTerminalHistory(prev => [...prev, `> ERROR: MISSING ARGUMENT.`]);
              }
              break;
          case 'deploy':
              if (args[1]) {
                  const tool = CYBER_TOOLS.find(t => t.id.toLowerCase().includes(args[1]) || t.label.toLowerCase().includes(args[1]));
                  if (tool) {
                      toggleResource(tool.id);
                      setTerminalHistory(prev => [...prev, `> RESOURCE TOGGLED: ${tool.label}`]);
                  } else {
                      setTerminalHistory(prev => [...prev, `> ERROR: TOOL NOT FOUND.`]);
                  }
              } else {
                  setTerminalHistory(prev => [...prev, `> ERROR: SPECIFY TOOL ID.`]);
              }
              break;
          case 'list-tools':
              setTerminalHistory(prev => [...prev, 'ARSENAL MANIFEST:', ...CYBER_TOOLS.map(t => `  - ${t.id} [${t.label}]`)]);
              break;
          case 'scan':
          case 'execute':
          case 'run':
              if (targetInput && objectiveInput) {
                  executeOperation();
              } else {
                  setTerminalHistory(prev => [...prev, `> ERROR: TARGET AND OBJECTIVE REQUIRED.`]);
              }
              break;
          case 'clear':
              setTerminalHistory([]);
              break;
          case 'reset':
              resetOperation();
              setTerminalHistory(['> SYSTEM RESET.']);
              break;
          case 'whois':
              if (args[1]) {
                  setTerminalHistory(prev => [...prev, `> INITIATING WHOIS LOOKUP FOR: ${args[1]}`]);
                  fetch(`/api/osint/whois/${encodeURIComponent(args[1])}`)
                      .then(res => res.json())
                      .then(data => {
                          const lines = JSON.stringify(data, null, 2).split('\n');
                          setTerminalHistory(prev => [...prev, ...lines.slice(0, 20), '... (TRUNCATED)']);
                      })
                      .catch(err => setTerminalHistory(prev => [...prev, `> ERROR: WHOIS FAILED.`]));
              } else {
                  setTerminalHistory(prev => [...prev, `> ERROR: USAGE: whois [domain]`]);
              }
              break;
          case 'dns':
              if (args[1]) {
                  setTerminalHistory(prev => [...prev, `> INITIATING DNS LOOKUP FOR: ${args[1]}`]);
                  fetch(`/api/osint/dns/${encodeURIComponent(args[1])}`)
                      .then(res => res.json())
                      .then(data => {
                          const lines = JSON.stringify(data, null, 2).split('\n');
                          setTerminalHistory(prev => [...prev, ...lines]);
                      })
                      .catch(err => setTerminalHistory(prev => [...prev, `> ERROR: DNS FAILED.`]));
              } else {
                  setTerminalHistory(prev => [...prev, `> ERROR: USAGE: dns [domain]`]);
              }
              break;
          case 'phone':
              if (args[1]) {
                  setTerminalHistory(prev => [...prev, `> INITIATING PHONE LOOKUP FOR: ${args[1]}`]);
                  fetch(`/api/osint/phone/${encodeURIComponent(args[1])}`)
                      .then(res => res.json())
                      .then(data => {
                          const lines = JSON.stringify(data, null, 2).split('\n');
                          setTerminalHistory(prev => [...prev, ...lines]);
                      })
                      .catch(err => setTerminalHistory(prev => [...prev, `> ERROR: PHONE LOOKUP FAILED.`]));
              } else {
                  setTerminalHistory(prev => [...prev, `> ERROR: USAGE: phone [number]`]);
              }
              break;
          default:
              setTerminalHistory(prev => [...prev, `> ERROR: UNKNOWN COMMAND '${mainCmd}'. TYPE 'help' FOR MENU.`]);
      }
  };

  const handlePlayBriefing = async () => {
    if (!dossier?.report || audioLoading) return;
    setAudioLoading(true);
    audio.playClick();
    try {
        const audioData = await synthesizeSpeech(dossier.report);
        await audio.playAudioBuffer(audioData);
    } catch (e) {
        console.error("Audio failure", e);
    } finally {
        setAudioLoading(false);
    }
  };

  const hasHighRiskActive = activeResources.some(r => CYBER_TOOLS.find(t => t.id === r)?.highRisk);
  const activeHoverData = CYBER_TOOLS.find(t => t.id === hoveredTool);

  return (
    <div className="relative p-6 h-full flex flex-col overflow-hidden bg-slate-950 text-slate-200 selection:bg-red-500/30 font-mono">
      
      {/* --- CSS FX OVERLAYS --- */}
      <style>{`
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        .scanline::after { content: " "; display: block; position: absolute; top: 0; left: 0; bottom: 0; right: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); z-index: 2; background-size: 100% 2px, 3px 100%; pointer-events: none; }
        .hazard-stripe { background: repeating-linear-gradient(45deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2) 10px, rgba(220, 38, 38, 0.1) 10px, rgba(220, 38, 38, 0.1) 20px); }
        .radar-sweep { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: conic-gradient(from 0deg, transparent 0deg, rgba(16, 185, 129, 0.2) 60deg, transparent 70deg); animation: radar-spin 3s linear infinite; border-radius: 50%; }
        @keyframes radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      
      {/* Background Grid & Vignette */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.9)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] z-0 pointer-events-none opacity-20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none z-0"></div>
      <div className="scanline absolute inset-0 pointer-events-none z-50 opacity-20 mix-blend-overlay"></div>

      {/* --- HEADER --- */}
      <header className="relative z-10 mb-6 flex items-center justify-between shrink-0 border-b border-slate-800/60 pb-4">
        <div className="flex items-center space-x-4">
            <div className={`relative group transition-all duration-500 ${hasHighRiskActive ? 'scale-110' : ''}`}>
                <div className={`absolute inset-0 blur-xl opacity-20 ${hasHighRiskActive ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}`}></div>
                <div className={`p-3 rounded border bg-slate-900/80 relative overflow-hidden backdrop-blur-sm ${hasHighRiskActive ? 'border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'border-slate-700'}`}>
                    {hasHighRiskActive ? <Skull className="text-red-500 animate-[pulse_2s_infinite]" size={28} /> : <Database className="text-blue-400" size={28} />}
                </div>
            </div>
            <div>
                <h2 className="text-3xl font-black text-white tracking-[0.2em] glitch-text" data-text="TACTICAL OPS">
                    TACTICAL<span className="text-slate-600">_</span>OPS
                </h2>
                <div className="flex items-center space-x-3 mt-1">
                    <span className="text-[10px] text-slate-500 font-bold tracking-widest bg-slate-900 px-1 border border-slate-800">
                        SYS.VER.9.4.1
                    </span>
                    
                    {/* Status Badge */}
                    <div className={`px-3 py-0.5 rounded-sm border text-[10px] font-bold tracking-wider flex items-center transition-all duration-300 shadow-lg ${
                        status === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' :
                        status === 'COMPLETE' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' :
                        status === 'FAILED' ? 'bg-red-500/10 border-red-500/50 text-red-500' :
                        'bg-slate-800 border-slate-600 text-slate-500'
                    }`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                             status === 'ACTIVE' ? 'bg-emerald-400 animate-ping' : 
                             status === 'IDLE' ? 'bg-slate-500' : 'bg-current'
                        }`}></div>
                        STATUS: {status}
                    </div>
                </div>
            </div>
        </div>
        
        <div className="flex items-center space-x-3">
             {status !== 'IDLE' && (
                <button 
                    onClick={() => {
                        audio.playClick();
                        resetOperation();
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-red-950/30 border border-slate-700 hover:border-red-500/50 text-slate-400 hover:text-red-400 text-xs font-bold tracking-wider flex items-center transition-all group"
                >
                    <RefreshCw size={14} className="mr-2 group-hover:rotate-180 transition-transform duration-500" />
                    PURGE CACHE
                </button>
            )}
        </div>
      </header>

      {/* --- MAIN GRID --- */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* LEFT COLUMN: CONTROLS */}
        <div className="lg:col-span-4 flex flex-col gap-4 min-h-0">
          
          {/* Input Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-sm p-1 flex flex-col gap-1 shadow-2xl shrink-0 backdrop-blur-md relative group">
             {/* Corner Accents */}
             <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-slate-600 group-hover:border-blue-500 transition-colors"></div>
             <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-slate-600 group-hover:border-blue-500 transition-colors"></div>

             <div className="p-4 space-y-5">
                {/* Target Fields */}
                <div className="space-y-4">
                    <div className="relative">
                        <div className="flex justify-between items-end mb-2">
                             <label className="text-[10px] font-bold text-blue-400 tracking-widest flex items-center">
                                <Crosshair size={12} className="mr-1" /> PRIMARY TARGET
                            </label>
                            <span className="text-[9px] text-slate-600 font-mono">UID_SELECTOR</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <RadarVisualizer active={!!targetInput && status !== 'IDLE'} color={hasHighRiskActive ? 'text-red-500' : 'text-blue-500'} />
                            <input 
                                type="text"
                                value={targetInput}
                                onChange={(e) => setTargetInput(e.target.value)}
                                disabled={status === 'ACTIVE'}
                                className="flex-1 bg-slate-950 border-b-2 border-slate-800 p-3 text-lg text-white font-mono tracking-wide focus:border-blue-500 outline-none transition-all placeholder-slate-700/50 hover:bg-slate-900/50"
                                placeholder="ENTER NAME / IDENTIFIER..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 tracking-widest flex items-center">
                                <Mic size={10} className="mr-1" /> EMAIL_VECTOR
                            </label>
                            <input 
                                type="email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                disabled={status === 'ACTIVE'}
                                className="w-full bg-slate-950/50 border border-slate-800 p-2 text-xs text-blue-300 font-mono focus:border-blue-500 outline-none transition-all"
                                placeholder="target@domain.com"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 tracking-widest flex items-center">
                                <Smartphone size={10} className="mr-1" /> PHONE_SIGNAL
                            </label>
                            <input 
                                type="text"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                disabled={status === 'ACTIVE'}
                                className="w-full bg-slate-950/50 border border-slate-800 p-2 text-xs text-blue-300 font-mono focus:border-blue-500 outline-none transition-all"
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 tracking-widest flex items-center">
                            <LinkIcon size={10} className="mr-1" /> SOCIAL_HANDLES
                        </label>
                        <input 
                            type="text"
                            value={socialsInput}
                            onChange={(e) => setSocialsInput(e.target.value)}
                            disabled={status === 'ACTIVE'}
                            className="w-full bg-slate-950/50 border border-slate-800 p-2 text-xs text-blue-300 font-mono focus:border-blue-500 outline-none transition-all"
                            placeholder="@username, @handle..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 tracking-widest flex items-center">
                            <Info size={10} className="mr-1" /> ADDITIONAL_CONTEXT
                        </label>
                        <textarea 
                            value={socialInput}
                            onChange={(e) => setSocialInput(e.target.value)}
                            disabled={status === 'ACTIVE'}
                            rows={2}
                            className="w-full bg-slate-950/50 border border-slate-800 p-2 text-xs text-slate-300 font-mono focus:border-blue-500 outline-none transition-all resize-none"
                            placeholder="Known associates, habits, recent activity..."
                        />
                    </div>
                </div>

                {/* Cyber Weapons */}
                <div>
                    <label className="text-[10px] font-bold text-purple-400 mb-3 flex items-center justify-between tracking-widest">
                       <div className="flex items-center"><Zap size={12} className="mr-1" /> ARSENAL SELECTION</div>
                       {hasHighRiskActive && <span className="animate-pulse text-red-500 font-black flex items-center gap-1 border border-red-500/50 px-2 rounded bg-red-950/50"><AlertCircle size={10} /> LETHAL FORCE AUTHORIZED</span>}
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                        {CYBER_TOOLS.map(tool => (
                            <button
                                key={tool.id}
                                onClick={() => toggleResource(tool.id)}
                                onMouseEnter={() => setHoveredTool(tool.id)}
                                onMouseLeave={() => setHoveredTool(null)}
                                disabled={status === 'ACTIVE'}
                                className={`flex items-center justify-between p-2 rounded-sm border transition-all duration-200 group relative overflow-hidden ${
                                    status === 'ACTIVE' ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                                } ${
                                    activeResources.includes(tool.id) 
                                    ? `bg-slate-900 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] ${tool.highRisk ? 'border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-[pulse_1.5s_ease-in-out_infinite]' : tool.border}`
                                    : `bg-slate-950/50 border-transparent hover:bg-slate-900 ${tool.highRisk ? 'hover:border-red-500/70 hazard-stripe' : 'hover:border-slate-700'}`
                                }`}
                            >   
                                <div className="flex items-center relative z-10 w-full">
                                    <div className={`p-1.5 rounded mr-3 transition-colors ${
                                        activeResources.includes(tool.id) 
                                            ? tool.bg + ' ' + tool.color 
                                            : tool.highRisk 
                                                ? 'bg-red-950/50 text-red-700 group-hover:text-red-500 group-hover:bg-red-900/80 border border-red-900/30' 
                                                : 'bg-slate-900 text-slate-600 group-hover:text-slate-400'
                                    }`}>
                                        <tool.icon size={14} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className={`text-[10px] font-bold tracking-wider ${
                                                activeResources.includes(tool.id) 
                                                    ? 'text-white' 
                                                    : tool.highRisk 
                                                        ? 'text-red-800 group-hover:text-red-500 transition-colors' 
                                                        : 'text-slate-500 group-hover:text-slate-300'
                                            }`}>
                                                {tool.label}
                                            </div>
                                            {tool.highRisk && (
                                                <div className="flex items-center text-[8px] font-black text-red-600 border border-red-900/50 bg-black/50 px-1.5 py-0.5 rounded ml-2 uppercase tracking-widest group-hover:bg-red-600 group-hover:text-black transition-colors">
                                                    RESTRICTED
                                                </div>
                                            )}
                                        </div>
                                        {activeResources.includes(tool.id) && (
                                            <div className="text-[8px] text-slate-400 font-mono mt-0.5">
                                                MODULE_LOADED
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {activeResources.includes(tool.id) && (
                                    <CheckCircle size={14} className={`${tool.color} relative z-10 ml-2`} />
                                )}
                                {/* Progress bar background for active items */}
                                {activeResources.includes(tool.id) && (
                                    <div className={`absolute bottom-0 left-0 h-0.5 ${tool.bg.replace('bg-', 'bg-')} w-full animate-[loading_2s_ease-in-out_infinite]`}></div>
                                )}
                            </button>
                        ))}
                    </div>
                    {/* Tool Info Panel */}
                    <div className={`mt-2 min-h-[70px] border rounded p-3 relative overflow-hidden flex flex-col transition-all duration-300 ${activeHoverData?.highRisk ? 'bg-red-950/10 border-red-900/50' : 'bg-black/40 border-slate-800'}`}>
                        {activeHoverData ? (
                            <div className="animate-fadeIn relative z-10">
                                <div className={`text-[10px] font-bold mb-1.5 flex items-center justify-between ${activeHoverData.highRisk ? 'text-red-400' : 'text-blue-400'}`}>
                                    <span className="flex items-center"><Info size={12} className="mr-1.5" /> SPECIFICATIONS</span>
                                    {activeHoverData.highRisk && <span className="text-[9px] bg-red-600 text-black px-1 font-black animate-pulse">HAZARD</span>}
                                </div>
                                <div className="text-[10px] text-slate-300 leading-snug mb-2 font-mono border-l-2 border-slate-700 pl-2">
                                    {activeHoverData.desc}
                                </div>
                                <div className={`text-[9px] font-mono font-bold uppercase flex items-center ${activeHoverData.highRisk ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {activeHoverData.highRisk ? <Siren size={10} className="mr-1.5 animate-bounce" /> : <Shield size={10} className="mr-1.5" />}
                                    RISK ASSESSMENT: {activeHoverData.risk}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-700 space-y-1">
                                <Terminal size={16} />
                                <div className="text-[9px] font-mono text-center uppercase tracking-widest">
                                    AWAITING SELECTION
                                </div>
                            </div>
                        )}
                         {/* Background scanline for the info panel */}
                         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-scanline opacity-10 pointer-events-none"></div>
                    </div>
                </div>

                {/* Context Input */}
                <div className="flex-1 flex flex-col">
                    <label className="text-[10px] font-bold text-emerald-400 mb-2 tracking-widest flex items-center">
                       <Terminal size={12} className="mr-1" /> EXPLOIT PARAMETERS
                    </label>
                    <textarea 
                        value={objectiveInput}
                        onChange={(e) => setObjectiveInput(e.target.value)}
                        disabled={status === 'ACTIVE'}
                        className="flex-1 min-h-[60px] bg-slate-950 border border-slate-800/80 rounded-sm p-3 text-xs text-slate-300 font-mono focus:border-emerald-500/50 outline-none transition-all resize-none placeholder-slate-700 focus:shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"
                        placeholder="> DEFINE MISSION OBJECTIVE..."
                    />
                </div>

                {/* Action Button */}
                <button 
                    onClick={() => {
                        audio.playClick();
                        executeOperation();
                    }}
                    disabled={status === 'ACTIVE' || !targetInput || !objectiveInput}
                    className={`w-full py-4 rounded-sm font-black tracking-[0.2em] transition-all text-sm flex items-center justify-center relative overflow-hidden group ${
                        status === 'ACTIVE'
                        ? 'bg-slate-900 border border-slate-700 text-slate-600 cursor-wait'
                        : hasHighRiskActive 
                            ? 'bg-red-950/80 hover:bg-red-900 border border-red-600 text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.2)]'
                            : 'bg-slate-900 hover:bg-emerald-950/30 border border-emerald-600/50 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                    }`}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
                    {status === 'ACTIVE' ? (
                        <span className="animate-pulse">PROCESSING...</span>
                    ) : (
                        <>
                            {hasHighRiskActive ? 'AUTHORIZE KILL CHAIN' : 'EXECUTE OPERATION'}
                        </>
                    )}
                </button>
             </div>
          </div>

          {/* Interactive Terminal Console */}
          <div className="flex-1 bg-black border border-slate-800 rounded-sm p-4 font-mono text-[10px] overflow-hidden flex flex-col relative shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] min-h-[200px]">
             <div className="absolute top-0 left-0 right-0 h-6 bg-slate-900/80 border-b border-slate-800 flex items-center px-2 justify-between">
                 <span className="text-slate-500 font-bold flex items-center"><Terminal size={10} className="mr-2"/> root@agent7:~</span>
                 <div className="flex gap-1">
                     <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                     <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                 </div>
             </div>
             <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pt-4 pb-2" onClick={() => document.getElementById('terminal-input')?.focus()}>
                {terminalHistory.length === 0 && (
                   <div className="text-slate-600 mt-2 opacity-50">
                       TYPE 'help' FOR AVAILABLE COMMANDS...
                   </div>
                )}
                {terminalHistory.map((log, i) => (
                   <div key={i} className={`flex gap-2 break-all ${
                       log.includes('CRITICAL') || log.includes('ERROR') ? 'text-red-500 font-bold' : 
                       log.includes('SUCCESS') ? 'text-emerald-400' : 
                       log.includes('WARNING') ? 'text-amber-400' :
                       log.startsWith('root@') ? 'text-slate-500' :
                       'text-slate-400'
                   }`}>
                      {!log.startsWith('root@') && !log.startsWith('AVAILABLE') && !log.startsWith('ARSENAL') && (
                          <span className="opacity-30 shrink-0">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                      )}
                      <span>{log}</span>
                   </div>
                ))}
                
                {/* Active Input Line */}
                <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 mt-2">
                    <span className="text-emerald-500 font-bold shrink-0">root@agent7:~#</span>
                    <input 
                        id="terminal-input"
                        type="text" 
                        value={commandInput}
                        onChange={(e) => setCommandInput(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-slate-200 font-mono p-0 focus:ring-0"
                        autoComplete="off"
                        autoFocus
                    />
                </form>
                <div ref={logsEndRef} />
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DISPLAY */}
        <div className="lg:col-span-8 bg-slate-900/30 border border-slate-800/60 rounded-sm flex flex-col min-h-0 relative overflow-hidden backdrop-blur-sm shadow-2xl">
            {/* Holographic Header Line */}
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 bg-black/40">
               {['INTEL', 'GEO', 'MISSION', 'IDENTITY'].map((tab) => {
                   const isActive = activeTab === tab;
                   const isDisabled = tab === 'INTEL' ? (!dossier && status !== 'ACTIVE') : tab === 'GEO' ? (status === 'IDLE') : tab === 'IDENTITY' ? (!dossier) : !missionPlan;
                   const baseColor = tab === 'INTEL' ? 'blue' : tab === 'GEO' ? 'emerald' : tab === 'IDENTITY' ? 'purple' : 'red';
                   const Icon = tab === 'INTEL' ? Globe : tab === 'GEO' ? Map : tab === 'IDENTITY' ? UserCheck : Shield;
                   
                   return (
                       <button 
                          key={tab}
                          onClick={() => {
                              audio.playClick();
                              setActiveTab(tab as any);
                          }}
                          disabled={isDisabled}
                          className={`flex-1 py-3 text-[10px] font-black tracking-[0.2em] flex items-center justify-center space-x-2 transition-all relative overflow-hidden group ${
                             isActive 
                             ? `text-${baseColor}-400 bg-${baseColor}-500/5` 
                             : isDisabled ? 'text-slate-700 cursor-not-allowed opacity-50' : 'text-slate-500 hover:bg-slate-800'
                          }`}
                       >
                          {isActive && <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-${baseColor}-500 shadow-[0_0_10px_currentColor]`}></div>}
                          <Icon size={14} />
                          <span>{tab === 'INTEL' ? 'RECONNAISSANCE' : tab === 'GEO' ? 'GEOLOCATION' : 'ATTACK VECTORS'}</span>
                       </button>
                   );
               })}
               {/* Hidden EXFIL tab that appears on completion */}
               {status === 'COMPLETE' && (
                  <button 
                      onClick={() => setActiveTab('MISSION' as any)} // For now keeps context, but we render EXFIL content below if triggered
                      className="flex-1 py-3 text-[10px] font-black tracking-[0.2em] flex items-center justify-center space-x-2 transition-all relative overflow-hidden group text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-500 animate-pulse"
                  >
                      <HardDrive size={14} />
                      <span>DATA EXFILTRATION</span>
                  </button>
               )}
            </div>

            {/* Content Display Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
               
               {/* IDLE STATE */}
               {status === 'IDLE' && !dossier && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
                     <div className="border border-slate-700 p-8 rounded-full animate-[pulse_4s_infinite]">
                        <Lock size={48} className="text-slate-500" />
                     </div>
                     <p className="mt-4 font-mono text-sm tracking-widest text-slate-500">TERMINAL LOCKED</p>
                  </div>
               )}

               {/* ACTIVE LOADING STATE (For non-GEO tabs) */}
               {status === 'ACTIVE' && activeTab !== 'GEO' && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-950/80 backdrop-blur-sm">
                       <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden relative">
                           <div className="absolute inset-0 bg-emerald-500 animate-[loading_1s_ease-in-out_infinite] w-full origin-left transform scale-x-0"></div>
                       </div>
                       <div className="mt-4 font-mono text-xs text-emerald-500 animate-pulse">
                           {terminalHistory.length > 0 && !terminalHistory[terminalHistory.length-1].startsWith('root') ? terminalHistory[terminalHistory.length-1].replace(/.*]/, '') : 'ESTABLISHING HANDSHAKE...'}
                       </div>
                       <div className="grid grid-cols-8 gap-1 mt-8 opacity-20">
                           {Array.from({length: 64}).map((_,i) => (
                               <div key={i} className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{animationDelay: `${Math.random()}s`}}></div>
                           ))}
                       </div>
                   </div>
               )}

               {/* TAB: GEO (Geolocation Visualizer) */}
               {activeTab === 'GEO' && (
                   <div className="animate-[fadeIn_0.5s_ease-out] h-full flex flex-col relative overflow-hidden rounded border border-emerald-900/30">
                        {/* Map Background Grid */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
                        
                        {/* Central Map Visualization */}
                        <div className="flex-1 relative flex items-center justify-center">
                            {/* Scanning Effect */}
                            {status === 'ACTIVE' && (
                                <div className="absolute inset-0 z-0">
                                    <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/20 radar-sweep"></div>
                                </div>
                            )}

                            {/* Triangulation Triangles */}
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                 {/* Towers */}
                                 <div className="absolute top-1/4 left-1/4 animate-bounce">
                                     <Radio className="text-emerald-700" size={24} />
                                 </div>
                                 <div className="absolute top-1/4 right-1/4 animate-bounce delay-75">
                                     <Radio className="text-emerald-700" size={24} />
                                 </div>
                                 <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 animate-bounce delay-150">
                                     <Radio className="text-emerald-700" size={24} />
                                 </div>
                                 
                                 {/* Lines to Target */}
                                 <svg className="absolute inset-0 w-full h-full opacity-30">
                                    <line x1="25%" y1="25%" x2="50%" y2="50%" stroke="#10b981" strokeWidth="1" strokeDasharray="5,5" className="animate-[pulse_1s_infinite]" />
                                    <line x1="75%" y1="25%" x2="50%" y2="50%" stroke="#10b981" strokeWidth="1" strokeDasharray="5,5" className="animate-[pulse_1s_infinite_0.2s]" />
                                    <line x1="50%" y1="75%" x2="50%" y2="50%" stroke="#10b981" strokeWidth="1" strokeDasharray="5,5" className="animate-[pulse_1s_infinite_0.4s]" />
                                 </svg>

                                 {/* Target Marker */}
                                 <div className="relative z-20">
                                     <div className={`w-4 h-4 rounded-full ${status === 'COMPLETE' ? 'bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.8)]' : 'bg-emerald-500 animate-ping'}`}></div>
                                     <div className="absolute -top-8 -left-12 w-24 text-center">
                                         <div className="text-[10px] font-mono font-bold bg-black/80 text-emerald-500 px-1 border border-emerald-900 rounded">
                                             {status === 'COMPLETE' ? 'TARGET LOCKED' : 'TRIANGULATING'}
                                         </div>
                                     </div>
                                 </div>
                            </div>
                        </div>

                        {/* Data Overlay Panel */}
                        <div className="absolute top-4 right-4 w-64 bg-black/80 backdrop-blur border border-emerald-900/50 p-4 rounded text-xs font-mono shadow-2xl z-30">
                            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-2 mb-2">
                                <span className="font-bold text-emerald-500 flex items-center"><LocateFixed size={12} className="mr-2" /> SS7 HLR DATA</span>
                                <span className="animate-pulse w-2 h-2 bg-emerald-500 rounded-full"></span>
                            </div>
                            <div className="space-y-2 text-emerald-400/80">
                                <div className="flex justify-between">
                                    <span>STATUS:</span>
                                    <span className="text-white font-bold">{status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>PROTOCOL:</span>
                                    <span>GSM / SS7</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>MCC / MNC:</span>
                                    <span>{dossier?.deviceIntel?.mcc || '310'} / {dossier?.deviceIntel?.mnc || '260'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>LAC ID:</span>
                                    <span>{dossier?.deviceIntel?.lac || '4821'}</span>
                                </div>
                                <div className="flex justify-between border-t border-emerald-900/30 pt-1 mt-1">
                                    <span>COORDINATES:</span>
                                    <span className="text-white font-bold">
                                        {dossier?.deviceIntel?.lastLocation ? dossier.deviceIntel.lastLocation : status === 'COMPLETE' ? '34.0522° N, 118.2437° W' : 'ACQUIRING...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Exploit Log Overlay */}
                         <div className="absolute bottom-4 left-4 right-4 h-32 bg-black/80 backdrop-blur border border-slate-800 rounded p-2 font-mono text-[10px] overflow-hidden flex flex-col z-30">
                             <div className="text-slate-500 font-bold mb-1 border-b border-slate-800 pb-1">REAL-TIME SIGNAL INTERCEPT LOG</div>
                             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                 {localLogs.filter(l => l.includes('[GEO]') || l.includes('[SS7]') || l.includes('[EXPLOIT]')).slice(-6).map((log, i) => (
                                     <div key={i} className="text-emerald-500/70 truncate">{log}</div>
                                 ))}
                             </div>
                         </div>
                   </div>
               )}

               {/* COMPLETED STATE: DATA EXFILTRATION VIEW */}
               {status === 'COMPLETE' && dossier && activeTab === 'MISSION' && (
                   <div className="animate-[fadeIn_0.5s_ease-out] h-full flex flex-col">
                       {/* Exfil Sub-Navigation */}
                       <div className="flex space-x-1 mb-6 border-b border-slate-800/50 pb-2">
                          <button onClick={() => setExfilTab('FILES')} className={`px-4 py-1 text-[10px] font-bold rounded flex items-center space-x-2 ${exfilTab === 'FILES' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900' : 'text-slate-500 hover:text-slate-300'}`}>
                              <Folder size={12} /> <span>FILE SYSTEM</span>
                          </button>
                          <button onClick={() => setExfilTab('NETWORK')} className={`px-4 py-1 text-[10px] font-bold rounded flex items-center space-x-2 ${exfilTab === 'NETWORK' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900' : 'text-slate-500 hover:text-slate-300'}`}>
                              <Activity size={12} /> <span>NETWORK SNIFFER</span>
                          </button>
                          <button onClick={() => setExfilTab('CREDS')} className={`px-4 py-1 text-[10px] font-bold rounded flex items-center space-x-2 ${exfilTab === 'CREDS' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900' : 'text-slate-500 hover:text-slate-300'}`}>
                              <Key size={12} /> <span>DUMPED CREDS</span>
                          </button>
                       </div>

                       {/* File Browser */}
                       {exfilTab === 'FILES' && (
                           <div className="bg-slate-950/50 border border-slate-800 rounded p-4 flex-1 overflow-y-auto custom-scrollbar">
                               <div className="grid grid-cols-1 gap-2">
                                   <div className="flex items-center text-[10px] text-slate-500 border-b border-slate-800 pb-2 mb-2 font-mono">
                                       <span className="w-8"></span>
                                       <span className="flex-1">NAME</span>
                                       <span className="w-20 text-right">SIZE</span>
                                       <span className="w-24 text-right">MODIFIED</span>
                                       <span className="w-16 text-center">ACTION</span>
                                   </div>
                                   {exfiltratedFiles.length > 0 ? exfiltratedFiles.map((file, i) => {
                                       const Icon = getFileIcon(file.category);
                                       return (
                                           <div key={i} className="flex items-center text-xs font-mono text-slate-300 hover:bg-slate-900 p-2 rounded group transition-colors cursor-pointer border border-transparent hover:border-slate-800">
                                               <span className="w-8 flex justify-center text-slate-500 group-hover:text-emerald-500">
                                                   {file.type === 'folder' ? <Folder size={14} /> : <Icon size={14} />}
                                               </span>
                                               <span className="flex-1 font-bold truncate">{file.name}</span>
                                               <span className="w-20 text-right text-slate-500">{file.size || '--'}</span>
                                               <span className="w-24 text-right text-slate-600">{file.date}</span>
                                               <span className="w-16 flex justify-center">
                                                   {file.type !== 'folder' && <Download size={14} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />}
                                               </span>
                                           </div>
                                       );
                                   }) : (
                                       <div className="flex flex-col items-center justify-center py-12 opacity-30">
                                           <HardDrive size={32} className="mb-2" />
                                           <p className="text-[10px] font-mono tracking-widest">NO DATA RECOVERED</p>
                                       </div>
                                   )}
                               </div>
                           </div>
                       )}

                       {/* Network Sniffer */}
                       {exfilTab === 'NETWORK' && (
                           <div className="bg-black border border-slate-800 rounded p-4 flex-1 font-mono text-[10px] overflow-hidden flex flex-col">
                               <div className="flex space-x-4 text-slate-500 mb-2 border-b border-slate-900 pb-2">
                                   <span className="w-16">TIME</span>
                                   <span className="w-24">SOURCE</span>
                                   <span className="w-24">DEST</span>
                                   <span className="w-12">PROTO</span>
                                   <span className="flex-1">PAYLOAD</span>
                               </div>
                               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                   {Array.from({length: 15}).map((_, i) => (
                                       <div key={i} className="flex space-x-4 text-slate-400 hover:bg-slate-900/50 p-1 cursor-crosshair">
                                           <span className="w-16 text-slate-600">{new Date().toLocaleTimeString()}</span>
                                           <span className="w-24 text-blue-400">192.168.1.{100+i}</span>
                                           <span className="w-24 text-red-400">10.0.0.{50+i}</span>
                                           <span className="w-12 text-slate-500">TCP</span>
                                           <span className="flex-1 truncate opacity-70">
                                               GET /api/v1/auth/token HTTP/1.1 [Encrypted Payload...]
                                           </span>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}
                       
                       {/* Credentials Dump */}
                        {exfilTab === 'CREDS' && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="bg-slate-950/50 border border-slate-800 rounded p-4">
                                   <div className="flex items-center text-xs font-bold text-red-400 mb-4 border-b border-red-900/30 pb-2">
                                       <Key size={14} className="mr-2" /> EXTRACTED TOKENS
                                   </div>
                                   <div className="space-y-3">
                                       {[
                                           { type: 'BEARER_TOKEN', val: 'eyJhGciO...a8j9s' },
                                           { type: 'SESSION_ID', val: 'a7b8c9d0-1234-5678' },
                                           { type: 'AWS_SECRET', val: '********************' }
                                       ].map((item, i) => (
                                           <div key={i} className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center group">
                                               <span className="text-[10px] text-slate-500 font-mono">{item.type}</span>
                                               <code className="text-[10px] text-emerald-500 bg-black/50 px-2 py-1 rounded font-mono group-hover:text-emerald-400 transition-colors">
                                                   {item.val}
                                               </code>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                               <div className="bg-slate-950/50 border border-slate-800 rounded p-4">
                                   <div className="flex items-center text-xs font-bold text-blue-400 mb-4 border-b border-blue-900/30 pb-2">
                                       <CreditCard size={14} className="mr-2" /> FINANCIAL ARTIFACTS
                                   </div>
                                   <div className="text-[10px] text-slate-400 font-mono space-y-2">
                                       <div className="flex justify-between p-2 hover:bg-slate-900 rounded">
                                           <span>VISA ENDING 4432</span>
                                           <span className="text-emerald-500">ACTIVE</span>
                                       </div>
                                       <div className="flex justify-between p-2 hover:bg-slate-900 rounded">
                                           <span>CRYPTO WALLET (BTC)</span>
                                           <span className="text-emerald-500">0.4552 BTC</span>
                                       </div>
                                       <div className="flex justify-between p-2 hover:bg-slate-900 rounded">
                                           <span>PAYPAL TOKEN</span>
                                           <span className="text-amber-500">EXPIRED</span>
                                       </div>
                                   </div>
                               </div>
                           </div>
                       )}
                   </div>
               )}

               {/* TAB: INTEL (Existing Logic) */}
               {activeTab === 'INTEL' && dossier && status !== 'ACTIVE' && (
                  <div className="animate-[fadeIn_0.5s_ease-out] space-y-8">
                     {/* Identity Header */}
                     <div className="flex justify-between items-start border-b border-slate-800 pb-6">
                        <div className="flex gap-4">
                            <div className="w-24 h-24 bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden relative">
                                {dossier.images && dossier.images.length > 0 ? (
                                    <img 
                                        src={dossier.images[0]} 
                                        alt="Target Primary" 
                                        className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <UserCheck size={32} className="text-slate-500" />
                                )}
                                <div className="absolute inset-0 border-2 border-blue-500/20 pointer-events-none"></div>
                            </div>
                           <div>
                               <div className="text-[10px] text-blue-500 font-bold mb-1 tracking-widest">TARGET IDENTITY</div>
                               <h3 className="text-2xl font-black text-white uppercase tracking-wider font-mono">
                                   <ScrambleText text={dossier.exactName || targetInput} />
                               </h3>
                               
                               {/* Grounding Sources Display */}
                               <div className="flex flex-wrap gap-2 mt-2">
                                   {dossier.sources.length > 0 ? dossier.sources.map((source, i) => (
                                       <a 
                                           key={i} 
                                           href={source.uri}
                                           target="_blank"
                                           rel="noopener noreferrer"
                                           className="px-2 py-1 bg-blue-900/30 border border-blue-500/30 text-[9px] text-blue-300 rounded hover:bg-blue-800/50 hover:text-white transition-colors flex items-center gap-1 max-w-[200px]"
                                           title={source.title}
                                       >
                                           <ExternalLink size={8} className="shrink-0" />
                                           <span className="truncate">{source.title || `SOURCE_${i+1}`}</span>
                                       </a>
                                   )) : (
                                       <span className="text-[9px] text-slate-600 italic">NO EXTERNAL SOURCES LINKED</span>
                                   )}
                               </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-[40px] font-black text-slate-800 leading-none opacity-50">CONFIDENTIAL</div>
                        </div>
                     </div>

                     {/* Visual Assets & Social Footprint */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {dossier.images && dossier.images.length > 0 && (
                              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-sm">
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 tracking-widest mb-4">
                                      <Image size={14} /> VISUAL_ASSETS_RECOVERED
                                  </div>
                                  <div className="grid grid-cols-4 gap-2">
                                      {dossier.images.map((img, i) => (
                                          <div key={i} className="aspect-square bg-black border border-slate-800 rounded-sm overflow-hidden relative group">
                                              <img 
                                                  src={img} 
                                                  alt={`Asset ${i}`} 
                                                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                  referrerPolicy="no-referrer"
                                              />
                                              <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {dossier.socialProfiles && dossier.socialProfiles.length > 0 && (
                              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-sm">
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-purple-400 tracking-widest mb-4">
                                      <Globe size={14} /> SOCIAL_FOOTPRINT_ANALYSIS
                                  </div>
                                  <div className="space-y-2">
                                      {dossier.socialProfiles.map((profile, i) => (
                                          <div key={i} className="flex items-center justify-between p-2 bg-black/30 border border-slate-800 rounded-sm hover:border-purple-500/50 transition-colors">
                                              <div className="flex items-center gap-3">
                                                  <div className="p-1.5 bg-slate-800 rounded text-slate-400">
                                                      <LinkIcon size={12} />
                                                  </div>
                                                  <div>
                                                      <div className="text-[10px] font-bold text-slate-200">{profile.platform}</div>
                                                      <div className="text-[9px] text-slate-500 font-mono">@{profile.username}</div>
                                                  </div>
                                              </div>
                                              <a 
                                                  href={profile.url} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="p-1.5 hover:text-purple-400 transition-colors"
                                              >
                                                  <ExternalLink size={12} />
                                              </a>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Device Intel Card */}
                     {dossier.deviceIntel && (
                         <div className={`relative p-5 rounded-sm border backdrop-blur-md overflow-hidden ${dossier.deviceIntel.status === 'COMPROMISED' ? 'bg-red-950/20 border-red-500/40' : 'bg-slate-900/40 border-slate-700'}`}>
                             {/* Background Watermark */}
                             <Smartphone className="absolute -right-4 -bottom-4 text-white opacity-5 w-32 h-32 transform rotate-12" />
                             
                             <div className="flex justify-between items-center mb-4 relative z-10">
                                 <div className="flex items-center gap-2 text-xs font-bold text-slate-400 tracking-widest">
                                     <Activity size={14} /> DEVICE TELEMETRY
                                 </div>
                                 <div className={`px-2 py-0.5 text-[9px] font-bold border rounded ${dossier.deviceIntel.status === 'COMPROMISED' ? 'border-red-500 text-red-500 animate-pulse' : 'border-emerald-500 text-emerald-500'}`}>
                                     {dossier.deviceIntel.status}
                                 </div>
                             </div>

                             <div className="grid grid-cols-4 gap-4 relative z-10">
                                 {[
                                     { label: 'HARDWARE', value: dossier.deviceIntel.deviceName },
                                     { label: 'FIRMWARE', value: dossier.deviceIntel.osVersion },
                                     { label: 'POWER', value: dossier.deviceIntel.batteryLevel, color: 'text-emerald-400' },
                                     { label: 'CARRIER', value: dossier.deviceIntel.provider }
                                 ].map((item, i) => (
                                     <div key={i} className="bg-black/30 p-2 rounded border border-slate-800">
                                         <div className="text-[8px] text-slate-500 mb-1">{item.label}</div>
                                         <div className={`text-xs font-mono font-bold ${item.color || 'text-slate-200'}`}>{item.value}</div>
                                     </div>
                                 ))}
                             </div>

                             {dossier.deviceIntel.compromisedApps.length > 0 && (
                                 <div className="mt-4 relative z-10">
                                     <div className="text-[9px] text-red-400 mb-2 font-bold uppercase">Vulnerable Entry Points Detected</div>
                                     <div className="flex gap-2 flex-wrap">
                                         {dossier.deviceIntel.compromisedApps.map((app, i) => (
                                             <div key={i} className="flex items-center px-2 py-1 bg-red-950/40 border border-red-900/60 rounded text-[10px] text-red-300">
                                                 <AlertCircle size={10} className="mr-1" /> {app}
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             )}
                         </div>
                     )}

                     {/* Report Content */}
                     <div className="relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-transparent"></div>
                        <div className="pl-4">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-blue-400 tracking-widest flex items-center">
                                    <FileText size={14} className="mr-2" /> INTELLIGENCE BRIEF
                                </h4>
                                <button 
                                    onClick={handlePlayBriefing}
                                    disabled={audioLoading}
                                    className={`text-[10px] flex items-center px-2 py-1 rounded border transition-all font-bold ${
                                        audioLoading 
                                        ? 'border-slate-700 text-slate-500 cursor-wait'
                                        : 'border-blue-500/50 text-blue-400 hover:bg-blue-900/20 hover:text-blue-200'
                                    }`}
                                >
                                    {audioLoading ? (
                                        <div className="flex items-center">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping mr-2"></div>
                                            SYNTHESIZING...
                                        </div>
                                    ) : (
                                        <>
                                            <Volume2 size={12} className="mr-1.5" />
                                            INITIALIZE AUDIO BRIEFING
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="prose prose-invert prose-sm max-w-none font-mono text-slate-300 leading-relaxed opacity-90">
                                <ScrambleText text={dossier.report} delay={500} />
                            </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* TAB: MISSION */}
               {activeTab === 'MISSION' && missionPlan && status !== 'ACTIVE' && (
                  <div className="animate-[fadeIn_0.5s_ease-out] space-y-6">
                      {/* Mission Header */}
                      <div className="bg-gradient-to-r from-red-950/20 to-transparent border-l-2 border-red-500 pl-4 py-2">
                          <div className="text-[10px] text-red-500 font-mono mb-1 tracking-widest">OPERATION CODENAME</div>
                          <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] glitch-text">
                              OP: <ScrambleText text={(missionPlan.approach || 'DIRECT_ASSAULT').toUpperCase().replace(/\s/g, '_')} />
                          </h3>
                      </div>

                      {/* Success Probability Meter */}
                      <div className="bg-slate-950 p-6 border border-slate-800 rounded relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                               <Radar size={80} className="animate-[spin_10s_linear_infinite]" />
                           </div>
                           <div className="flex justify-between items-end mb-2 relative z-10">
                               <span className="text-xs font-bold text-slate-400">PROBABILITY OF SUCCESS</span>
                               <span className={`text-3xl font-mono font-bold ${missionPlan.feasibility > 75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                   {missionPlan.feasibility}%
                               </span>
                           </div>
                           <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden relative z-10 border border-slate-800">
                                 <div 
                                    className={`h-full relative ${missionPlan.feasibility > 75 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                    style={{width: `${missionPlan.feasibility}%`}}
                                 >
                                     <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                 </div>
                           </div>
                      </div>

                      {/* Execution Steps */}
                      <div>
                        <h4 className="text-xs text-red-400 font-bold mb-4 uppercase tracking-widest border-b border-red-900/30 pb-2 flex items-center">
                           <ChevronRight size={14} className="mr-1" /> Tactical Execution Path
                        </h4>
                        <div className="space-y-3">
                           {missionPlan.steps.map((step, idx) => (
                                 <div key={idx} className="flex items-start group">
                                    <div className="mr-4 flex flex-col items-center">
                                        <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-[10px] flex items-center justify-center text-slate-500 font-mono group-hover:border-red-500 group-hover:text-red-500 transition-colors">
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>
                                        {idx !== missionPlan.steps.length - 1 && <div className="w-px h-full bg-slate-800 my-1"></div>}
                                    </div>
                                    <div className="flex-1 bg-slate-900/40 p-3 rounded border border-slate-800/50 text-sm text-slate-300 font-mono hover:bg-slate-900/80 transition-colors">
                                        {step}
                                    </div>
                                 </div>
                           ))}
                        </div>
                     </div>
                  </div>
               )}

               {/* 5. IDENTITY & COMPLIANCE VIEW */}
               {activeTab === 'IDENTITY' && (
                   <div className="h-full animate-fadeIn">
                       <IdentityPanel dossier={dossier} />
                   </div>
               )}
            </div>

            {/* Footer Status Bar */}
            <div className="h-8 bg-slate-950 border-t border-slate-800 flex items-center px-4 overflow-hidden shrink-0">
                <div className="flex items-center space-x-6 text-[9px] font-mono text-slate-500 w-full">
                    <div className="flex items-center"><Wifi size={10} className="mr-1 text-emerald-500" /> UPLINK_ESTABLISHED</div>
                    <div className="flex items-center"><Server size={10} className="mr-1 text-blue-500" /> PROXY_CHAIN: 4 NODES</div>
                    <div className="flex-1 overflow-hidden whitespace-nowrap relative">
                        <div className="animate-[marquee_20s_linear_infinite] inline-block">
                             /// SYSTEM INTEGRITY: 98% /// LATENCY: 24ms /// ENCRYPTION: AES-256-GCM /// PACKET LOSS: 0.001% /// THREAT LEVEL: MODERATE ///
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};