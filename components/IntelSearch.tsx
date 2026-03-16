import React, { useState, useEffect } from 'react';
import { Search, Upload, FileText, Database, Plus, X, FolderOpen, Save, ChevronDown, ChevronUp, Lock, Eye, Filter, Calendar, ListFilter, RotateCcw, Activity, User, History } from 'lucide-react';
import { IntelRecord, Target } from '../types';
import { getIntelRecords, saveIntelRecord, addSystemLog, getTargets, saveTarget } from '../services/storageService';
import { generateTargetDossier } from '../services/geminiService';
import { performOsintLookup } from '../services/osintService';

export const IntelSearch: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SEARCH' | 'UPLOAD' | 'LIVE_SCAN'>('SEARCH');
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<IntelRecord[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Filter State
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [clearanceFilter, setClearanceFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Upload State
  const [uploadText, setUploadText] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Live Scan State
  const [scanTarget, setScanTarget] = useState('');
  const [scanEmail, setScanEmail] = useState('');
  const [scanPhone, setScanPhone] = useState('');
  const [scanSocials, setScanSocials] = useState('');
  const [scanAdditional, setScanAdditional] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => {
    // Load initial data from persistent storage
    getIntelRecords().then(setRecords);
    getTargets().then(setTargets).catch(() => {});
    
    // Listen for updates
    const handleUpdate = () => {
        getIntelRecords().then(setRecords);
        getTargets().then(setTargets).catch(() => {});
    };
    window.addEventListener('storage_agent7_intel_db', handleUpdate);
    window.addEventListener('storage_agent7_targets', handleUpdate);
    return () => {
        window.removeEventListener('storage_agent7_intel_db', handleUpdate);
        window.removeEventListener('storage_agent7_targets', handleUpdate);
    };
  }, []);

  const filteredRecords = records.filter(rec => {
    const matchesSearch = rec.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (rec.details && rec.details.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === 'ALL' || rec.type === typeFilter;
    const matchesClearance = clearanceFilter === 'ALL' || rec.clearance === clearanceFilter;
    const matchesSource = !sourceFilter || (rec.source && rec.source.toLowerCase().includes(sourceFilter.toLowerCase()));
    const matchesTags = !tagFilter || (rec.tags && rec.tags.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase())));
    
    let matchesDate = true;
    if (dateStart) matchesDate = matchesDate && rec.date >= dateStart;
    if (dateEnd) matchesDate = matchesDate && rec.date <= dateEnd;

    return matchesSearch && matchesType && matchesClearance && matchesSource && matchesTags && matchesDate;
  });

  const resetFilters = () => {
    setTypeFilter('ALL');
    setClearanceFilter('ALL');
    setSourceFilter('');
    setTagFilter('');
    setDateStart('');
    setDateEnd('');
    setSearchQuery('');
  };

  const hasActiveFilters = typeFilter !== 'ALL' || clearanceFilter !== 'ALL' || sourceFilter !== '' || tagFilter !== '' || dateStart !== '' || dateEnd !== '' || searchQuery !== '';

  const handleUpload = async () => {
    if (!uploadTitle || !uploadText) return;
    setIsUploading(true);
    
    // Create new record
    const newRecord: IntelRecord = {
      id: `REC-${Math.floor(Math.random() * 10000) + 1000}`,
      title: uploadTitle,
      type: 'REPORT', 
      date: new Date().toISOString().split('T')[0],
      clearance: 'SECRET', 
      details: uploadText
    };

    // Execute instant save
    try {
        const updatedList = await saveIntelRecord(newRecord);
        addSystemLog('USER_OPS', `New intel ingested: ${newRecord.id} - ${uploadTitle}`, 'SUCCESS').catch(() => {});
        
        setRecords(updatedList);
        setUploadSuccess(true);
        
        // Reset form after short success indication UI
        setTimeout(() => {
            setUploadSuccess(false);
            setUploadTitle('');
            setUploadText('');
            setActiveTab('SEARCH');
        }, 1500);
    } catch (e) {
        addSystemLog('USER_OPS', 'Intel ingestion failed.', 'ERROR').catch(() => {});
        console.error("Upload failed", e);
    } finally {
        setIsUploading(false);
    }
  };

  const handleLiveScan = async () => {
    if (!scanTarget.trim()) return;
    setIsScanning(true);
    setScanResult(null);
    
    try {
      // 1. Perform real OSINT lookup for phone if provided
      let realOsintData = null;
      if (scanPhone) {
        realOsintData = await performOsintLookup(scanPhone);
      } else if (scanEmail) {
        realOsintData = await performOsintLookup(scanEmail);
      } else if (scanTarget) {
        realOsintData = await performOsintLookup(scanTarget);
      }

      const dossier = await generateTargetDossier({
        name: scanTarget,
        email: scanEmail,
        phone: scanPhone,
        socials: scanSocials,
        additionalInfo: scanAdditional
      }, ['OSINT', 'SOCIAL_GRAPH', 'IMAGE_RECON'], realOsintData);
      
      setScanResult(dossier);
      
      // Auto-save the live scan result to Intel Database
      let fullDetails = dossier.report;
      if (dossier.exactName || (dossier.aliases && dossier.aliases.length > 0) || dossier.contactInfo) {
        fullDetails = `## Identity & Contact Info\n\n` +
          (dossier.exactName ? `**Exact Name:** ${dossier.exactName}\n` : '') +
          (dossier.aliases && dossier.aliases.length > 0 ? `**Aliases:** ${dossier.aliases.join(', ')}\n` : '') +
          (dossier.contactInfo?.emails && dossier.contactInfo.emails.length > 0 ? `**Emails:** ${dossier.contactInfo.emails.join(', ')}\n` : '') +
          (dossier.contactInfo?.phones && dossier.contactInfo.phones.length > 0 ? `**Phones:** ${dossier.contactInfo.phones.join(', ')}\n` : '') +
          `\n---\n\n` + fullDetails;
      }

      const newRecord: IntelRecord = {
        id: `SCAN-${Math.floor(Math.random() * 10000) + 1000}`,
        title: `Live Scan: ${scanTarget}`,
        type: 'PROFILE', 
        date: new Date().toISOString().split('T')[0],
        clearance: 'TOP SECRET', 
        details: fullDetails,
        tags: ['LIVE_SCAN', 'OSINT', 'IMAGE_RECON'],
        source: 'Gemini Intelligence'
      };
      
      const updatedList = await saveIntelRecord(newRecord);
      setRecords(updatedList);
      
      // Save to Target Database as well
      const newTarget: Target = {
        id: `TGT-${Math.floor(Math.random() * 1000) + 100}`,
        name: scanTarget,
        status: 'TRACKING',
        lastSeen: new Date().toISOString(),
        activityLevel: 75,
        images: dossier.images || [],
        socialFootprint: {
            visibility: 85,
            accessLevel: 'PARTIAL',
            accounts: dossier.socialProfiles || []
        }
      };
      saveTarget(newTarget).catch(() => {});

      addSystemLog('USER_OPS', `Live scan completed and saved for: ${scanTarget}`, 'SUCCESS').catch(() => {});
    } catch (e) {
      console.error("Live scan failed", e);
      addSystemLog('USER_OPS', 'Live scan failed.', 'ERROR').catch(() => {});
    } finally {
      setIsScanning(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
              <Database className="text-emerald-500" />
              INTEL DATABASE
          </h2>
          <p className="text-slate-400 font-mono text-sm mt-1">
            CENTRALIZED DATA REPOSITORY & INGESTION
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('SEARCH')}
          className={`px-6 py-3 font-mono text-sm font-bold tracking-wider flex items-center space-x-2 border-t border-l border-r rounded-t-lg transition-all ${
            activeTab === 'SEARCH' 
              ? 'bg-slate-900/60 border-slate-700 text-emerald-400' 
              : 'bg-transparent border-transparent text-slate-500 hover:text-emerald-300'
          }`}
        >
          <Search size={16} />
          <span>QUERY DATABASE</span>
        </button>
        <button
          onClick={() => setActiveTab('UPLOAD')}
          className={`px-6 py-3 font-mono text-sm font-bold tracking-wider flex items-center space-x-2 border-t border-l border-r rounded-t-lg transition-all ${
            activeTab === 'UPLOAD' 
              ? 'bg-slate-900/60 border-slate-700 text-emerald-400' 
              : 'bg-transparent border-transparent text-slate-500 hover:text-emerald-300'
          }`}
        >
          <Upload size={16} />
          <span>INGEST NEW INTEL</span>
        </button>
        <button
          onClick={() => setActiveTab('LIVE_SCAN')}
          className={`px-6 py-3 font-mono text-sm font-bold tracking-wider flex items-center space-x-2 border-t border-l border-r rounded-t-lg transition-all ${
            activeTab === 'LIVE_SCAN' 
              ? 'bg-slate-900/60 border-slate-700 text-emerald-400' 
              : 'bg-transparent border-transparent text-slate-500 hover:text-emerald-300'
          }`}
        >
          <Eye size={16} />
          <span>LIVE TARGET SCAN</span>
        </button>
      </div>

      <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-lg p-6 relative overflow-hidden flex flex-col min-h-0">
        
        {/* Search View */}
        {activeTab === 'SEARCH' && (
          <div className="h-full flex gap-6 animate-fadeIn min-h-0">
            {/* Main Search Area */}
            <div className="flex-1 flex flex-col min-h-0">
                {/* Search Bar */}
                <div className="relative mb-4 shrink-0">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SEARCH INTELLIGENCE BY KEYWORD, ID, OR CONTENT..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-4 pl-12 pr-4 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder-slate-600"
                  />
                </div>

                {/* Filter Toolbar */}
                <div className={`flex flex-wrap gap-4 mb-4 bg-slate-950/50 p-3 rounded border items-center transition-colors ${hasActiveFilters ? 'border-emerald-500/30' : 'border-slate-800'}`}>
                    <div className="flex items-center text-slate-500 text-xs font-mono font-bold uppercase tracking-wider">
                        <Filter size={14} className="mr-2 text-emerald-500" /> Active Filters
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <ListFilter size={14} className={typeFilter !== 'ALL' ? "text-emerald-400" : "text-slate-600"} />
                        <select 
                            value={typeFilter} 
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className={`bg-slate-900 border text-xs rounded px-2 py-1 font-mono outline-none focus:border-emerald-500 transition-colors ${
                                typeFilter !== 'ALL' ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700 text-slate-300'
                            }`}
                        >
                            <option value="ALL">ALL TYPES</option>
                            <option value="REPORT">REPORT</option>
                            <option value="INTERCEPT">INTERCEPT</option>
                            <option value="MISSION">MISSION</option>
                            <option value="PROFILE">PROFILE</option>
                            <option value="ASSET">ASSET</option>
                            <option value="BREACH">BREACH</option>
                            <option value="SURVEILLANCE">SURVEILLANCE</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
                        <select 
                            value={clearanceFilter} 
                            onChange={(e) => setClearanceFilter(e.target.value)}
                            className={`bg-slate-900 border text-xs rounded px-2 py-1 font-mono outline-none focus:border-emerald-500 transition-colors ${
                                clearanceFilter !== 'ALL' ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700 text-slate-300'
                            }`}
                        >
                            <option value="ALL">ALL CLEARANCES</option>
                            <option value="TOP SECRET">TOP SECRET</option>
                            <option value="SECRET">SECRET</option>
                            <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
                        <input 
                            type="text" 
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            placeholder="SOURCE..."
                            className={`bg-slate-900 border text-xs rounded px-2 py-1 font-mono outline-none focus:border-emerald-500 transition-colors w-24 ${
                                sourceFilter ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700 text-slate-300'
                            }`}
                        />
                    </div>

                    <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
                        <input 
                            type="text" 
                            value={tagFilter}
                            onChange={(e) => setTagFilter(e.target.value)}
                            placeholder="TAG..."
                            className={`bg-slate-900 border text-xs rounded px-2 py-1 font-mono outline-none focus:border-emerald-500 transition-colors w-24 ${
                                tagFilter ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700 text-slate-300'
                            }`}
                        />
                    </div>

                    <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
                        <Calendar size={14} className={(dateStart || dateEnd) ? "text-emerald-400" : "text-slate-600"} />
                        <input 
                            type="date" 
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className={`bg-slate-900 border text-xs rounded px-2 py-1 font-mono outline-none focus:border-emerald-500 transition-colors ${
                                dateStart ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700 text-slate-300'
                            }`}
                        />
                        <span className="text-slate-600">-</span>
                        <input 
                            type="date" 
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            className={`bg-slate-900 border text-xs rounded px-2 py-1 font-mono outline-none focus:border-emerald-500 transition-colors ${
                                dateEnd ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700 text-slate-300'
                            }`}
                        />
                    </div>

                    {hasActiveFilters && (
                        <button 
                            onClick={resetFilters}
                            className="flex items-center space-x-1 text-[10px] bg-red-900/20 hover:bg-red-900/40 text-red-400 px-2 py-1 rounded border border-red-900/50 transition-colors ml-2"
                        >
                            <RotateCcw size={10} />
                            <span>RESET</span>
                        </button>
                    )}
                    
                    <div className="ml-auto text-xs font-mono flex items-center space-x-2">
                        <span className="text-slate-500">RESULTS:</span>
                        <span className="bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/50 font-bold">
                            {filteredRecords.length}
                        </span>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <div className="space-y-3">
                    {filteredRecords.map((rec) => (
                      <div key={rec.id} className={`bg-slate-950/50 border rounded transition-all flex flex-col group ${expandedId === rec.id ? 'border-emerald-500/50 bg-slate-900' : 'border-slate-800 hover:border-emerald-500/30'}`}>
                        <div 
                          className="p-4 flex justify-between items-center cursor-pointer"
                          onClick={() => toggleExpand(rec.id)}
                        >
                            <div className="flex items-center space-x-4">
                            <div className={`p-3 rounded transition-colors ${expandedId === rec.id ? 'bg-emerald-900/20 text-emerald-400' : 'bg-slate-900 text-slate-400 group-hover:text-emerald-500'}`}>
                                {rec.type === 'BREACH' ? <Lock size={20} /> :
                                 rec.type === 'SURVEILLANCE' ? <Eye size={20} /> :
                                 <FileText size={20} />}
                            </div>
                            <div>
                                <div className={`font-bold font-mono transition-colors ${expandedId === rec.id ? 'text-emerald-400' : 'text-white group-hover:text-emerald-400'}`}>{rec.title}</div>
                                <div className="text-xs text-slate-500 font-mono flex items-center space-x-2 mt-1">
                                <span>{rec.id}</span>
                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                <span>{rec.date}</span>
                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                <span className="text-slate-400">{rec.type}</span>
                                </div>
                            </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className={`px-2 py-1 rounded text-[10px] font-mono font-bold border ${
                                rec.clearance === 'TOP SECRET' ? 'border-red-900 text-red-500 bg-red-900/10' :
                                rec.clearance === 'SECRET' ? 'border-amber-900 text-amber-500 bg-amber-900/10' :
                                'border-blue-900 text-blue-500 bg-blue-900/10'
                                }`}>
                                {rec.clearance}
                                </div>
                                <div className="text-slate-500">
                                    {expandedId === rec.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                        </div>
                        
                        {/* Expanded Details */}
                        {expandedId === rec.id && (
                            <div className="px-4 pb-4 animate-fadeIn">
                                 <div className="p-4 bg-slate-950 border border-slate-800 rounded text-sm font-mono text-slate-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                                      <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Decrypted Content</div>
                                      {rec.source && (
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                          SOURCE: <span className="text-emerald-500">{rec.source}</span>
                                        </div>
                                      )}
                                    </div>
                                    {rec.details || <span className="text-slate-600 italic">No additional details available in archive.</span>}
                                    {rec.tags && rec.tags.length > 0 && (
                                      <div className="mt-4 pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                                        {rec.tags.map(tag => (
                                          <span key={tag} className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] text-slate-400 font-bold tracking-widest">
                                            #{tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                 </div>
                            </div>
                        )}
                      </div>
                    ))}
                    {filteredRecords.length === 0 && (
                      <div className="text-center text-slate-600 py-10 font-mono flex flex-col items-center">
                        <Filter size={32} className="mb-3 opacity-20" />
                        <span>NO RECORDS FOUND MATCHING ACTIVE FILTERS</span>
                        {(hasActiveFilters) && (
                            <button onClick={resetFilters} className="mt-2 text-xs text-emerald-500 hover:text-emerald-400 underline">
                                RESET CRITERIA
                            </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
            </div>

            {/* Recent Targets Sidebar */}
            <div className="w-72 bg-slate-950/50 border-l border-slate-800 p-4 flex flex-col shrink-0">
                <div className="flex items-center space-x-2 text-emerald-500 font-mono text-xs font-bold mb-4 uppercase tracking-widest">
                    <History size={14} />
                    <span>TARGET HISTORY</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    {targets.length > 0 ? targets.map(target => (
                        <div 
                            key={target.id} 
                            className="p-3 bg-slate-900/50 border border-slate-800 rounded hover:border-emerald-500/50 transition-all cursor-pointer group"
                            onClick={() => setSearchQuery(target.name)}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate pr-2">{target.name}</div>
                                <div className={`w-1.5 h-1.5 rounded-full ${target.status === 'TRACKING' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-slate-500">{target.id}</span>
                                <span className="text-slate-600 italic">{new Date(target.lastSeen).toLocaleDateString()}</span>
                            </div>
                            <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${target.activityLevel}%` }}></div>
                            </div>
                        </div>
                    )) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-700 text-center px-4">
                            <User size={32} className="mb-2 opacity-20" />
                            <p className="text-[10px] font-mono">NO TARGETS IN DATABASE</p>
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="text-[10px] text-slate-500 font-mono flex justify-between">
                        <span>TOTAL TRACKED:</span>
                        <span className="text-emerald-500 font-bold">{targets.length}</span>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Upload View */}
        {activeTab === 'UPLOAD' && (
          <div className="h-full flex flex-col animate-fadeIn max-w-3xl mx-auto overflow-y-auto custom-scrollbar">
            {!uploadSuccess ? (
              <>
                <div className="mb-6 bg-emerald-900/10 border border-emerald-900/30 p-4 rounded flex items-start space-x-3 shrink-0">
                  <div className="p-1 bg-emerald-900/20 rounded-full text-emerald-500 mt-1">
                    <Plus size={16} />
                  </div>
                  <div>
                    <h4 className="text-emerald-400 font-bold text-sm font-mono mb-1">SECURE UPLOAD PROTOCOL</h4>
                    <p className="text-emerald-200/60 text-xs">All data uploaded here is automatically encrypted (AES-256), indexed, and cross-referenced with the predictive engine.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-mono font-bold mb-2">INTEL TITLE / SUBJECT</label>
                    <input 
                      type="text" 
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-200 font-mono focus:border-emerald-500 outline-none transition-all"
                      placeholder="e.g. Project Gemini Field Report"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-slate-400 text-xs font-mono font-bold mb-2">DETAILS / RAW DATA</label>
                    <textarea 
                      value={uploadText}
                      onChange={(e) => setUploadText(e.target.value)}
                      className="w-full h-48 bg-slate-950 border border-slate-700 rounded p-3 text-slate-200 font-mono focus:border-emerald-500 outline-none transition-all resize-none"
                      placeholder="Enter raw intelligence data here..."
                    ></textarea>
                  </div>

                  <div className="border-2 border-dashed border-slate-800 rounded-lg p-8 text-center hover:border-emerald-500/30 transition-all cursor-pointer bg-slate-950/30">
                     <FolderOpen className="mx-auto text-slate-600 mb-2" />
                     <p className="text-slate-500 text-xs font-mono">DRAG & DROP FILES OR CLICK TO BROWSE</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end shrink-0 pb-4">
                   <button 
                    onClick={handleUpload}
                    disabled={isUploading || !uploadTitle || !uploadText}
                    className={`flex items-center space-x-2 px-6 py-3 rounded font-bold tracking-widest transition-all ${
                      isUploading || !uploadTitle || !uploadText
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                   >
                     {isUploading ? (
                        <span className="animate-pulse">ENCRYPTING...</span>
                     ) : (
                        <>
                          <Save size={16} />
                          <span>COMMIT TO DATABASE</span>
                        </>
                     )}
                   </button>
                </div>
              </>
            ) : (
               <div className="h-full flex flex-col items-center justify-center animate-fadeIn">
                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-slate-900 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                     <Upload size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 tracking-tighter">UPLOAD SUCCESSFUL</h3>
                  <p className="text-slate-400 font-mono text-sm">DATA INDEXED AND SECURED</p>
               </div>
            )}
          </div>
        )}

        {/* Live Scan View */}
        {activeTab === 'LIVE_SCAN' && (
          <div className="h-full flex flex-col animate-fadeIn max-w-4xl mx-auto w-full">
            <div className="mb-6 bg-emerald-900/10 border border-emerald-900/30 p-4 rounded flex items-start space-x-3 shrink-0">
              <div className="p-1 bg-emerald-900/20 rounded-full text-emerald-500 mt-1">
                <Activity size={16} />
              </div>
              <div>
                <h4 className="text-emerald-400 font-bold text-sm font-mono mb-1">LIVE TARGET SCAN</h4>
                <p className="text-emerald-200/60 text-xs">Execute real-time intelligence gathering using Gemini AI. Scans OSINT, public records, and active cyber assets to generate a comprehensive target dossier.</p>
              </div>
            </div>

            <div className="space-y-4 mb-6 shrink-0">
              <div className="flex space-x-4">
                <input 
                  type="text" 
                  value={scanTarget}
                  onChange={(e) => setScanTarget(e.target.value)}
                  placeholder="TARGET NAME / ALIAS..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                />
                <input 
                  type="email" 
                  value={scanEmail}
                  onChange={(e) => setScanEmail(e.target.value)}
                  placeholder="EMAIL (OPTIONAL)..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                />
              </div>
              <div className="flex space-x-4">
                <input 
                  type="text" 
                  value={scanPhone}
                  onChange={(e) => setScanPhone(e.target.value)}
                  placeholder="PHONE (OPTIONAL)..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                />
                <input 
                  type="text" 
                  value={scanSocials}
                  onChange={(e) => setScanSocials(e.target.value)}
                  placeholder="SOCIAL HANDLES (OPTIONAL)..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                />
              </div>
              <div className="flex space-x-4">
                <textarea 
                  value={scanAdditional}
                  onChange={(e) => setScanAdditional(e.target.value)}
                  placeholder="ADDITIONAL INTEL / CONTEXT..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600 h-20 resize-none"
                />
                <button 
                  onClick={handleLiveScan}
                  disabled={isScanning || !scanTarget.trim()}
                  className={`flex items-center justify-center space-x-2 px-8 py-4 rounded font-bold tracking-widest transition-all w-64 ${
                    isScanning || !scanTarget.trim()
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  {isScanning ? (
                    <span className="animate-pulse flex items-center"><Activity size={16} className="mr-2 animate-spin" /> SCANNING...</span>
                  ) : (
                    <>
                      <Search size={16} />
                      <span>EXECUTE SCAN</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {scanResult && (
              <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-lg p-6 animate-fadeIn overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
                  <h3 className="text-xl font-bold text-emerald-400 font-mono flex items-center">
                    <Database size={20} className="mr-2" />
                    DOSSIER: {(scanTarget || '').toUpperCase()}
                  </h3>
                  <span className="px-3 py-1 bg-emerald-900/30 text-emerald-500 border border-emerald-900/50 rounded text-xs font-bold tracking-widest">
                    SAVED TO DATABASE
                  </span>
                </div>

                {/* Identity & Contact Info */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-700 rounded p-4">
                    <h4 className="text-slate-500 font-bold text-xs font-mono mb-2 uppercase tracking-widest">Primary Identity</h4>
                    <div className="text-white font-mono text-lg">{scanResult.exactName || 'UNKNOWN'}</div>
                    {scanResult.aliases && scanResult.aliases.length > 0 && (
                      <div className="mt-2 text-xs text-slate-400 font-mono">
                        <span className="text-slate-500">ALIASES: </span>
                        {scanResult.aliases.join(', ')}
                      </div>
                    )}
                  </div>
                  
                  {(scanResult.contactInfo?.emails?.length > 0 || scanResult.contactInfo?.phones?.length > 0) && (
                    <div className="bg-slate-900 border border-slate-700 rounded p-4">
                      <h4 className="text-slate-500 font-bold text-xs font-mono mb-2 uppercase tracking-widest">Contact Vectors</h4>
                      <div className="space-y-2 font-mono text-sm">
                        {scanResult.contactInfo.emails?.map((email: string, i: number) => (
                          <div key={i} className="flex items-center text-slate-300">
                            <span className="text-emerald-500 mr-2">✉</span> {email}
                          </div>
                        ))}
                        {scanResult.contactInfo.phones?.map((phone: string, i: number) => (
                          <div key={i} className="flex items-center text-slate-300">
                            <span className="text-emerald-500 mr-2">☎</span> {phone}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.images && scanResult.images.length > 0 && (
                    <div className="bg-slate-900 border border-slate-700 rounded p-4">
                      <h4 className="text-slate-500 font-bold text-xs font-mono mb-2 uppercase tracking-widest">Visual Assets</h4>
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {scanResult.images.map((img: string, i: number) => (
                          <img 
                            key={i} 
                            src={img} 
                            alt={`Target visual ${i}`} 
                            className="h-16 w-16 object-cover rounded border border-slate-700 hover:border-emerald-500 transition-all cursor-zoom-in"
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="prose prose-invert prose-emerald max-w-none font-mono text-sm leading-relaxed">
                  <div className="whitespace-pre-wrap text-slate-300">{scanResult.report}</div>
                </div>

                {scanResult.socialProfiles && scanResult.socialProfiles.length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-emerald-500 font-bold text-sm font-mono mb-4 border-b border-slate-800 pb-2">DETECTED PROFILES</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {scanResult.socialProfiles.map((profile: any, idx: number) => (
                        <div key={idx} className="bg-slate-900 border border-slate-700 rounded p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-emerald-400 font-bold">{profile.platform}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${
                              profile.status === 'ACTIVE' ? 'bg-emerald-900/20 border-emerald-900 text-emerald-500' :
                              profile.status === 'DORMANT' ? 'bg-amber-900/20 border-amber-900 text-amber-500' :
                              'bg-slate-800 border-slate-700 text-slate-400'
                            }`}>{profile.status}</span>
                          </div>
                          <div className="text-slate-300 text-sm mb-1">@{profile.username}</div>
                          <a href={profile.url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline break-all">{profile.url}</a>
                          {profile.notes && <div className="mt-2 text-xs text-slate-500 italic">{profile.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
