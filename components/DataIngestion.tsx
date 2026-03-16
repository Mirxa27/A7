import React, { useState, useRef } from 'react';
import { HardDrive, Globe, Server, Database, ShieldCheck, Download, Code, Upload, Terminal, Eye, Layers, Lock, Cpu, RotateCw, MapPin, FileSearch, ExternalLink, Image, Search, User, Link as LinkIcon, Archive, AlertTriangle, Fingerprint, Check, X, RefreshCw } from 'lucide-react';
import exifr from 'exifr';
import { analyzeForensicArtifact, generateTargetDossier } from '../services/geminiService';
import { addSystemLog } from '../services/storageService';
import { audio } from '../services/audioService';
import { ForensicArtifact } from '../types';

export const DataIngestion: React.FC = () => {
    // Recon State
    const [reconTarget, setReconTarget] = useState('');
    const [extractedUser, setExtractedUser] = useState('');
    const [reconRunning, setReconRunning] = useState(false);
    const [reconResult, setReconResult] = useState<any>(null);
    
    // Sherlock / Username Enumeration State
    const [usernameQuery, setUsernameQuery] = useState('');
    const [sherlockRunning, setSherlockRunning] = useState(false);
    const [sherlockLogs, setSherlockLogs] = useState<string[]>([]);
    const [sherlockResults, setSherlockResults] = useState<any[]>([]);
    
    // Forensics State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [fileData, setFileData] = useState<ForensicArtifact | null>(null);
    const [analysisReport, setAnalysisReport] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Hidden Form Refs for Reverse Search
    const googleFormRef = useRef<HTMLFormElement>(null);
    const googleInputRef = useRef<HTMLInputElement>(null);
    const tineyeFormRef = useRef<HTMLFormElement>(null);
    const tineyeInputRef = useRef<HTMLInputElement>(null);

    // Helper: Parse Username from URL
    const parseIdentity = (input: string) => {
        setReconTarget(input);
        if (!input) {
            setExtractedUser('');
            return;
        }
        
        try {
            // Check if URL
            if (input.includes('.') && (input.includes('http') || input.includes('www'))) {
                const urlObj = new URL(input.startsWith('http') ? input : `https://${input}`);
                const pathParts = urlObj.pathname.split('/').filter(p => p);
                if (pathParts.length > 0) {
                    setExtractedUser(pathParts[0]); // e.g., facebook.com/omgitsnk -> omgitsnk
                    if (!usernameQuery) setUsernameQuery(pathParts[0]); // Auto-fill sherlock if empty
                } else {
                    setExtractedUser(''); 
                }
            } else {
                // Assume direct username input
                setExtractedUser(input);
                if (!usernameQuery) setUsernameQuery(input);
            }
        } catch (e) {
            // Fallback for simple string
            setExtractedUser(input.split('/')[0]);
        }
    };

    // Live Recon Function
    const executeOSINT = (url: string, type: string) => {
        if (!url) return;
        audio.playClick();
        addSystemLog('USER_OPS', `Executing OSINT Vector [${type}] on target...`, 'INFO').catch(() => {});
        window.open(url, '_blank');
    };

    const runRecon = async () => {
        if (!reconTarget) return;
        audio.playClick();
        setReconRunning(true);
        setReconResult(null);
        addSystemLog('USER_OPS', `Initiating deep reconnaissance on ${reconTarget}...`, 'INFO').catch(() => {});

        try {
            const result = await generateTargetDossier(reconTarget, ['OSINT', 'WHOIS', 'DNS']);
            setReconResult(result);
            audio.playSuccess();
            addSystemLog('USER_OPS', `Reconnaissance completed for ${reconTarget}.`, 'SUCCESS').catch(() => {});
        } catch (e) {
            console.error("Recon failed", e);
            audio.playError();
            addSystemLog('USER_OPS', `Reconnaissance failed for ${reconTarget}.`, 'ERROR').catch(() => {});
        } finally {
            setReconRunning(false);
        }
    };

    // Helper for Wayback Machine URL construction
    const getWaybackUrl = (target: string) => {
        if (!target) return '';
        const hasProtocol = target.startsWith('http');
        const url = hasProtocol ? target : `https://${target}`;
        return `https://web.archive.org/web/*/${url}`;
    };

    // Sherlock Scan Logic
    const runSherlockScan = async () => {
        if (!usernameQuery) return;
        audio.playClick();
        setSherlockRunning(true);
        setSherlockLogs([
            `[*] INITIALIZING SHERLOCK PROTOCOL v3.9...`,
            `[*] TARGET USER: ${usernameQuery}`,
            `[*] LOADING MODULES: SOCIAL, DEV, CREATIVE...`
        ]);
        setSherlockResults([]);

        const sites = ['Instagram', 'Twitter', 'TikTok', 'Facebook', 'Snapchat', 'Reddit', 'GitHub', 'GitLab', 'Pinterest', 'Spotify', 'SoundCloud', 'DeviantArt', 'Behance', 'Flickr', 'Steam', 'Discord', 'Telegram', 'Medium', 'WordPress', 'Tumblr'];
        let checkIndex = 0;
        
        const logInterval = setInterval(() => {
            if (checkIndex < sites.length) {
                setSherlockLogs(prev => {
                    const newLogs = [...prev];
                    if (newLogs.length > 5) newLogs.shift();
                    return [...newLogs, `[?] CHECKING: ${sites[checkIndex]}...`];
                });
                checkIndex++;
            }
        }, 150);

        try {
            // Real username lookup via our OSINT API
            const response = await fetch(`/api/osint/username/${encodeURIComponent(usernameQuery)}`);
            const result = await response.json();
            
            clearInterval(logInterval);
            
            const foundProfiles = result.filter((r: any) => r.available === false);
            
            setSherlockLogs(prev => [
                `[+] SCAN COMPLETE.`,
                `[+] ${foundProfiles.length} POSITIVE MATCHES FOUND.`
            ]);
            setSherlockResults(foundProfiles.map((p: any) => ({
                platform: p.platform,
                url: p.url
            })));
            
            audio.playSuccess();
            addSystemLog('USER_OPS', `Sherlock Scan completed for ${usernameQuery}. ${foundProfiles.length} profiles found.`, 'SUCCESS').catch(() => {});

        } catch (e) {
            clearInterval(logInterval);
            setSherlockLogs(prev => [`[!] SCAN ERROR: CONNECTION LOST.`]);
            audio.playError();
        } finally {
            setSherlockRunning(false);
        }
    };

    // Real File Forensics
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setSelectedFile(file); // Store for reverse search tools

        audio.playTyping();
        setIsAnalyzing(true);
        setFileData(null);
        setAnalysisReport('');
        addSystemLog('FORENSICS', `Ingesting file artifact: ${file.name}`, 'INFO').catch(() => {});

        try {
            // Real Metadata Extraction using exifr
            // Passing true enables all parsers (TIFF, XMP, ICC, IPTC, JFIF, etc)
            const exifData = await exifr.parse(file, true); 
            const gps = await exifr.gps(file);
            
            const artifact: ForensicArtifact = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: new Date(file.lastModified).toISOString(),
                exif: exifData || { error: "No EXIF data found" },
                gps: gps || null
            };

            setFileData(artifact);
            addSystemLog('FORENSICS', `Metadata extraction complete. ${Object.keys(artifact.exif).length} tags found.`, 'SUCCESS').catch(() => {});

            // AI Analysis
            const report = await analyzeForensicArtifact(artifact);
            setAnalysisReport(report);
            audio.playSuccess();

        } catch (error) {
            console.error("Forensics Error", error);
            addSystemLog('FORENSICS', 'Extraction failed. Corrupt or unsupported file.', 'ERROR').catch(() => {});
            audio.playError();
        } finally {
            setIsAnalyzing(false);
        }
    };

    const triggerUpload = () => fileInputRef.current?.click();

    const handleReverseSearch = (service: 'GOOGLE' | 'TINEYE') => {
        if (!selectedFile) return;
        audio.playClick();
        addSystemLog('USER_OPS', `Initiating Reverse Image Search via ${service}...`, 'INFO').catch(() => {});

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(selectedFile);

        if (service === 'GOOGLE' && googleFormRef.current && googleInputRef.current) {
            googleInputRef.current.files = dataTransfer.files;
            googleFormRef.current.submit();
        } else if (service === 'TINEYE' && tineyeFormRef.current && tineyeInputRef.current) {
            tineyeInputRef.current.files = dataTransfer.files;
            tineyeFormRef.current.submit();
        }
    };

    return (
        <div className="p-6 h-full flex flex-col overflow-hidden bg-slate-950 font-mono">
            {/* Hidden Forms for Reverse Image Search Logic */}
            <form 
                ref={googleFormRef} 
                action="https://images.google.com/searchbyimage/upload" 
                method="POST" 
                encType="multipart/form-data" 
                target="_blank" 
                className="hidden"
            >
                <input ref={googleInputRef} type="file" name="encoded_image" />
            </form>
            <form 
                ref={tineyeFormRef} 
                action="https://tineye.com/search" 
                method="POST" 
                encType="multipart/form-data" 
                target="_blank" 
                className="hidden"
            >
                <input ref={tineyeInputRef} type="file" name="image" />
            </form>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

            <header className="mb-6 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
                        <HardDrive className="text-purple-500" />
                        DATA INGESTION
                    </h2>
                    <p className="text-slate-400 font-mono text-sm mt-1">
                        OSINT RECONNAISSANCE & FORENSIC ANALYSIS
                    </p>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0">
                
                {/* COL 1: RECONNAISSANCE */}
                <div className="bg-slate-900/40 border border-slate-800 rounded flex flex-col min-h-0">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                        <div className="flex items-center text-purple-400 font-bold text-xs tracking-widest">
                            <Globe size={14} className="mr-2" />
                            TARGET RECON
                        </div>
                        <div className="text-[10px] text-slate-500">LIVE LOOKUP</div>
                    </div>
                    
                    <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="relative flex gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    value={reconTarget}
                                    onChange={(e) => parseIdentity(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 pl-10 text-white font-mono text-xs focus:border-purple-500 outline-none"
                                    placeholder="ENTER DOMAIN, IP, OR SOCIAL URL..."
                                    onKeyDown={(e) => { if (e.key === 'Enter') runRecon(); }}
                                />
                                <Search size={14} className="absolute left-3 top-3.5 text-slate-500" />
                            </div>
                            <button 
                                onClick={runRecon}
                                disabled={reconRunning || !reconTarget}
                                className={`px-4 rounded border font-bold text-xs flex items-center transition-all ${reconRunning ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-wait' : 'bg-purple-900/30 border-purple-600 text-purple-400 hover:bg-purple-900/50'}`}
                            >
                                {reconRunning ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                            </button>
                        </div>

                        {extractedUser && (
                            <div className="bg-purple-900/20 border border-purple-500/30 rounded p-2 flex items-center justify-between animate-fadeIn">
                                <span className="text-[10px] text-purple-300 font-bold">EXTRACTED ID: {(extractedUser || '').toUpperCase()}</span>
                                <button 
                                    onClick={() => setUsernameQuery(extractedUser)}
                                    className="text-[10px] bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 px-2 py-1 rounded transition-colors"
                                >
                                    USE IN SHERLOCK
                                </button>
                            </div>
                        )}

                        {reconResult ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 animate-fadeIn">
                                <div className="bg-slate-950 border border-slate-800 rounded p-3">
                                    <h4 className="text-purple-400 font-bold text-[10px] uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">Primary Identity</h4>
                                    <div className="text-white font-mono text-sm">{reconResult.exactName || 'UNKNOWN'}</div>
                                    {reconResult.aliases && reconResult.aliases.length > 0 && (
                                        <div className="mt-1 text-[10px] text-slate-400 font-mono">
                                            <span className="text-slate-500">ALIASES: </span>
                                            {reconResult.aliases.join(', ')}
                                        </div>
                                    )}
                                </div>

                                {(reconResult.contactInfo?.emails?.length > 0 || reconResult.contactInfo?.phones?.length > 0) && (
                                    <div className="bg-slate-950 border border-slate-800 rounded p-3">
                                        <h4 className="text-purple-400 font-bold text-[10px] uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">Contact Vectors</h4>
                                        <div className="space-y-1 font-mono text-[10px]">
                                            {reconResult.contactInfo.emails?.map((email: string, i: number) => (
                                                <div key={i} className="flex items-center text-slate-300">
                                                    <span className="text-purple-500 mr-2">✉</span> {email}
                                                </div>
                                            ))}
                                            {reconResult.contactInfo.phones?.map((phone: string, i: number) => (
                                                <div key={i} className="flex items-center text-slate-300">
                                                    <span className="text-purple-500 mr-2">☎</span> {phone}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-950 border border-slate-800 rounded p-3">
                                    <h4 className="text-purple-400 font-bold text-[10px] uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">Intelligence Report</h4>
                                    <div className="prose prose-invert prose-purple max-w-none font-mono text-[10px] leading-relaxed">
                                        <div className="whitespace-pre-wrap text-slate-300">{reconResult.report}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Domain Intelligence</label>
                                <button onClick={() => executeOSINT(`https://who.is/whois/${reconTarget}`, 'WHOIS')} className="w-full text-left p-3 bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:text-purple-400 text-slate-400 text-xs rounded transition-all flex items-center justify-between group">
                                    <span className="flex items-center"><Server size={14} className="mr-2 opacity-50" /> WHOIS Lookup</span>
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                                <button onClick={() => executeOSINT(`https://dnslytics.com/domain/${reconTarget}`, 'DNS')} className="w-full text-left p-3 bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:text-purple-400 text-slate-400 text-xs rounded transition-all flex items-center justify-between group">
                                    <span className="flex items-center"><Globe size={14} className="mr-2 opacity-50" /> DNS Propagation</span>
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                                <button onClick={() => executeOSINT(`https://urlscan.io/search/#${reconTarget}`, 'URLSCAN')} className="w-full text-left p-3 bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:text-purple-400 text-slate-400 text-xs rounded transition-all flex items-center justify-between group">
                                    <span className="flex items-center"><ShieldCheck size={14} className="mr-2 opacity-50" /> Reputation Scan</span>
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                                <button onClick={() => executeOSINT(getWaybackUrl(reconTarget), 'WAYBACK')} className="w-full text-left p-3 bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:text-purple-400 text-slate-400 text-xs rounded transition-all flex items-center justify-between group">
                                    <span className="flex items-center"><RotateCw size={14} className="mr-2 opacity-50" /> Wayback Machine</span>
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* COL 2: IDENTITY RESOLUTION */}
                <div className="bg-slate-900/40 border border-slate-800 rounded flex flex-col min-h-0">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                        <div className="flex items-center text-blue-400 font-bold text-xs tracking-widest">
                            <User size={14} className="mr-2" />
                            IDENTITY RESOLUTION
                        </div>
                        <div className="text-[10px] text-slate-500">SHERLOCK v3.9</div>
                    </div>

                    <div className="p-4 flex flex-col gap-4 flex-1 min-h-0">
                        <div className="flex gap-2">
                             <input 
                                type="text" 
                                value={usernameQuery}
                                onChange={(e) => setUsernameQuery(e.target.value)}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded p-3 text-white font-mono text-xs focus:border-blue-500 outline-none"
                                placeholder="ENTER USERNAME..."
                            />
                            <button 
                                onClick={runSherlockScan}
                                disabled={sherlockRunning || !usernameQuery}
                                className={`px-4 rounded border font-bold text-xs flex items-center transition-all ${sherlockRunning ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-wait' : 'bg-blue-900/30 border-blue-600 text-blue-400 hover:bg-blue-900/50'}`}
                            >
                                {sherlockRunning ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                            </button>
                        </div>

                        {/* Terminal Output */}
                        <div className="flex-1 bg-black border border-slate-800 rounded p-3 font-mono text-[10px] overflow-hidden flex flex-col shadow-inner">
                            <div className="border-b border-slate-900 pb-2 mb-2 flex justify-between">
                                <span className="text-slate-500">TERMINAL OUTPUT</span>
                                {sherlockRunning && <span className="text-blue-500 animate-pulse">SCANNING...</span>}
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                {sherlockLogs.map((log, i) => (
                                    <div key={i} className={`${log.includes('[+]') ? 'text-emerald-500' : log.includes('[!]') ? 'text-red-500' : 'text-slate-400'}`}>
                                        {log}
                                    </div>
                                ))}
                                {sherlockRunning && <div className="animate-pulse text-blue-500">_</div>}
                            </div>
                        </div>

                        {/* Results List */}
                        {sherlockResults.length > 0 && (
                            <div className="h-1/3 border-t border-slate-800 pt-2 overflow-y-auto custom-scrollbar">
                                <div className="text-[10px] font-bold text-emerald-500 mb-2">POSITIVE HITS ({sherlockResults.length})</div>
                                <div className="space-y-1">
                                    {sherlockResults.map((res, i) => (
                                        <a key={i} href={res.url} target="_blank" rel="noreferrer" className="block bg-slate-900/50 hover:bg-blue-900/20 px-2 py-1.5 rounded border border-transparent hover:border-blue-500/30 text-[10px] text-slate-300 truncate flex justify-between items-center group transition-all">
                                            <span>{res.platform}</span>
                                            <ExternalLink size={10} className="opacity-0 group-hover:opacity-100" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* COL 3: FORENSIC LAB */}
                <div className="bg-slate-900/40 border border-slate-800 rounded flex flex-col min-h-0">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                        <div className="flex items-center text-red-400 font-bold text-xs tracking-widest">
                            <Fingerprint size={14} className="mr-2" />
                            FORENSIC LAB
                        </div>
                        <div className="text-[10px] text-slate-500">METADATA EXTRACTION</div>
                    </div>

                    <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
                         {/* Drop Zone */}
                         <div 
                            onClick={triggerUpload}
                            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer group ${isAnalyzing ? 'border-emerald-500 bg-emerald-900/10' : 'border-slate-800 hover:border-red-500/50 hover:bg-slate-900'}`}
                         >
                             {isAnalyzing ? (
                                 <div className="flex flex-col items-center">
                                     <Cpu size={32} className="text-emerald-500 animate-pulse mb-2" />
                                     <span className="text-xs text-emerald-400 font-mono animate-pulse">EXTRACTING ARTIFACTS...</span>
                                 </div>
                             ) : (
                                 <div className="flex flex-col items-center">
                                     <FileSearch size={32} className="text-slate-600 group-hover:text-red-400 transition-colors mb-2" />
                                     <span className="text-xs text-slate-400 group-hover:text-red-300 font-mono">DROP EVIDENCE FILE</span>
                                     <span className="text-[10px] text-slate-600 mt-1">SUPPORTED: IMG, PDF, DOCX</span>
                                 </div>
                             )}
                         </div>

                         {fileData && (
                             <div className="space-y-4 animate-fadeIn">
                                 {/* File Info */}
                                 <div className="bg-slate-950 border border-slate-800 rounded p-3 text-[10px] font-mono space-y-2">
                                     <div className="flex justify-between">
                                         <span className="text-slate-500">FILENAME:</span>
                                         <span className="text-white truncate max-w-[150px]">{fileData.name}</span>
                                     </div>
                                     <div className="flex justify-between">
                                         <span className="text-slate-500">SIZE:</span>
                                         <span className="text-white">{(fileData.size / 1024).toFixed(2)} KB</span>
                                     </div>
                                     <div className="flex justify-between">
                                         <span className="text-slate-500">TYPE:</span>
                                         <span className="text-white">{fileData.type}</span>
                                     </div>
                                 </div>

                                 {/* Reverse Image Tools */}
                                 {fileData.type.startsWith('image/') && (
                                     <div className="grid grid-cols-2 gap-2">
                                         <button onClick={() => handleReverseSearch('GOOGLE')} className="bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:text-red-400 text-slate-400 text-[10px] py-2 rounded transition-all flex items-center justify-center">
                                             <Image size={12} className="mr-1" /> GOOGLE LENS
                                         </button>
                                         <button onClick={() => handleReverseSearch('TINEYE')} className="bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:text-red-400 text-slate-400 text-[10px] py-2 rounded transition-all flex items-center justify-center">
                                             <Eye size={12} className="mr-1" /> TINEYE SEARCH
                                         </button>
                                     </div>
                                 )}

                                 {/* GPS Data */}
                                 {fileData.gps && (
                                     <div className="bg-red-900/10 border border-red-900/40 rounded p-3">
                                         <div className="text-[10px] font-bold text-red-500 mb-2 flex items-center">
                                             <MapPin size={12} className="mr-1" /> GEOLOCATION EXTRACTED
                                         </div>
                                         <div className="text-[10px] font-mono text-red-200">
                                             <div>LAT: {fileData.gps.latitude}</div>
                                             <div>LON: {fileData.gps.longitude}</div>
                                             <a 
                                                 href={`https://www.google.com/maps?q=${fileData.gps.latitude},${fileData.gps.longitude}`} 
                                                 target="_blank" 
                                                 rel="noreferrer"
                                                 className="text-red-400 underline mt-1 block hover:text-red-300"
                                             >
                                                 VIEW ON SATELLITE MAP
                                             </a>
                                         </div>
                                     </div>
                                 )}

                                 {/* Analysis Report */}
                                 {analysisReport && (
                                     <div className="bg-slate-950 border border-slate-800 rounded p-3">
                                         <div className="text-[10px] font-bold text-slate-500 mb-2 flex items-center border-b border-slate-800 pb-1">
                                             <Code size={12} className="mr-1" /> AI FORENSIC ANALYSIS
                                         </div>
                                         <div className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                                             {analysisReport}
                                         </div>
                                     </div>
                                 )}
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};