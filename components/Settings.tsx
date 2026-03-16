import React, { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Save, Shield, Cpu, Zap, Globe, Key, Terminal, CheckCircle2, AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { AISettings } from '../types';
import { getSettings, saveSettings, addSystemLog } from '../services/storageService';
import { useNotification } from '../context/NotificationContext';
import { testAIConnection } from '../services/geminiService';

interface ModelOption {
  id: string;
  name: string;
  desc: string;
}

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then(s => { setSettings(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'IDLE' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [showKey, setShowKey] = useState(false);
  const { notify } = useNotification();

  // Dynamic model list state
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [modelsFetched, setModelsFetched] = useState(false);

  const fetchModels = useCallback(async (currentSettings: AISettings) => {
    // For HuggingFace, we can fetch without a key. For others, require key.
    if (!currentSettings.apiKey && currentSettings.provider !== 'HUGGINGFACE') return;
    setIsFetchingModels(true);
    setModelFetchError(null);
    setModelsFetched(false);
    try {
      let models: ModelOption[] = [];
      if (currentSettings.provider === 'GEMINI') {
        const res = await fetch('/api/models/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: currentSettings.apiKey }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch Gemini models');
        models = data;
      } else if (currentSettings.provider === 'OPENAI') {
        const res = await fetch('/api/models/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: currentSettings.apiKey, baseUrl: currentSettings.baseUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch OpenAI models');
        models = data;
      } else if (currentSettings.provider === 'HUGGINGFACE') {
        const res = await fetch('/api/models/huggingface');
        const data = await res.json();
        if (!res.ok) throw new Error('Failed to fetch HuggingFace models');
        models = data;
      }
      setAvailableModels(models);
      setModelsFetched(true);
    } catch (e: any) {
      setModelFetchError(e.message || 'Could not load models');
      setAvailableModels([]);
    } finally {
      setIsFetchingModels(false);
    }
  }, []);

  // Auto-fetch HuggingFace models on mount (no key required)
  useEffect(() => {
    if (settings.provider === 'HUGGINGFACE') {
      fetchModels(settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fetch models when API key is entered (debounced 1.5s) or provider changes
  useEffect(() => {
    setAvailableModels([]);
    setModelsFetched(false);
    setModelFetchError(null);
    if (settings.apiKey || settings.provider === 'HUGGINGFACE') {
      const timer = setTimeout(() => fetchModels(settings), 1500);
      return () => clearTimeout(timer);
    }
  // We intentionally only watch key + provider + baseUrl here (not fetchModels ref)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.apiKey, settings.provider, settings.baseUrl]);

  // Auto-extract model from HuggingFace endpoint URL
  useEffect(() => {
    if (settings.provider === 'HUGGINGFACE' && settings.hfEndpoint) {
      const hfUrlPattern = /(?:huggingface\.co\/models\/|endpoints\.huggingface\.cloud\/[^/]+\/)([^/]+\/[^/]+|[^/]+)/;
      const match = settings.hfEndpoint.match(hfUrlPattern);
      if (match && match[1] && settings.hfModel !== match[1]) {
        setSettings(prev => ({ ...prev, hfModel: match[1] }));
      }
    }
  }, [settings.hfEndpoint]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await testAIConnection(settings);
    if (success) {
      await saveSettings(settings);
      setTestStatus('SUCCESS');
      addSystemLog('SYSTEM', 'AI Configuration verified and synchronized.', 'SUCCESS').catch(() => {});
      notify('AI Configuration updated successfully', 'success');
    } else {
      setTestStatus('FAILED');
      addSystemLog('SYSTEM', 'AI Configuration failed verification. Save aborted.', 'ERROR').catch(() => {});
      notify('AI Configuration failed. Check your credentials.', 'error');
    }
    setIsSaving(false);
  };

  const handleTestConnection = async (currentSettings: AISettings = settings) => {
    setIsTesting(true);
    setTestStatus('IDLE');
    addSystemLog('SYSTEM', `Initiating connection test for ${currentSettings.provider}...`, 'INFO');
    const success = await testAIConnection(currentSettings);
    setIsTesting(false);
    if (success) {
      setTestStatus('SUCCESS');
      saveSettings(currentSettings);
      notify('AI Connection established and synchronized', 'success');
      addSystemLog('SYSTEM', 'AI Neural link verified and stable. System synchronized.', 'SUCCESS');
      // Also fetch models after a successful connection test
      fetchModels(currentSettings);
    } else {
      setTestStatus('FAILED');
      notify('AI Connection failed. Check your API key.', 'error');
      addSystemLog('SYSTEM', 'AI Neural link failed to initialize.', 'ERROR');
    }
  };

  const modelKey = settings.provider === 'HUGGINGFACE' ? 'hfModel' : 'model';
  const currentModel = settings.provider === 'HUGGINGFACE' ? (settings.hfModel || '') : (settings.model || '');

  const selectModel = (id: string) => {
    setSettings(prev => ({ ...prev, [modelKey]: id }));
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 bg-[#050505] text-white font-sans">
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter flex items-center gap-3">
            <SettingsIcon className="w-10 h-10 text-emerald-500" />
            AI_CONFIG_CORE
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-white/50 font-mono text-sm uppercase tracking-widest">
              System Intelligence & Neural Link Management
            </p>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold font-mono tracking-tighter ${
              testStatus === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' :
              testStatus === 'FAILED' ? 'bg-red-500/10 border-red-500/50 text-red-500' :
              'bg-white/5 border-white/10 text-white/30'
            }`}>
              {testStatus === 'SUCCESS' ? <CheckCircle2 size={10} /> : testStatus === 'FAILED' ? <AlertCircle size={10} /> : <Zap size={10} />}
              {testStatus === 'SUCCESS' ? 'SYSTEM_READY' : testStatus === 'FAILED' ? 'LINK_OFFLINE' : 'AWAITING_SYNC'}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => handleTestConnection()}
            disabled={isTesting}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all border ${
              isTesting ? 'bg-blue-500/20 text-blue-500 border-blue-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
            }`}
          >
            {isTesting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />}
            {isTesting ? 'TESTING...' : 'TEST CONNECTION'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${
              isSaving ? 'bg-emerald-500/20 text-emerald-500' : 'bg-emerald-500 text-black hover:scale-105 active:scale-95'
            }`}
          >
            {isSaving ? <Zap className="w-5 h-5 animate-pulse" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'SYNCHRONIZING...' : 'SAVE CONFIGURATION'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Provider Selection */}
        <section className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Cpu className="w-6 h-6 text-blue-400" />
              NEURAL_PROVIDER
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {([
                { id: 'GEMINI', label: 'Google Gemini', sub: 'High-speed multimodal intelligence', activeClass: 'bg-blue-500/10 border-blue-500' },
                { id: 'HUGGINGFACE', label: 'Hugging Face', sub: 'Open-source inference endpoints', activeClass: 'bg-orange-500/10 border-orange-500' },
                { id: 'OPENAI', label: 'OpenAI / Compatible', sub: 'GPT or custom endpoints', activeClass: 'bg-green-500/10 border-green-500' },
              ] as const).map(p => (
                <button
                  key={p.id}
                  onClick={() => setSettings(prev => ({ ...prev, provider: p.id }))}
                  className={`p-4 rounded-xl border transition-all text-left space-y-2 ${
                    settings.provider === p.id ? p.activeClass : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="font-bold">{p.label}</div>
                  <div className="text-xs text-white/50">{p.sub}</div>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {/* Authentication Key */}
              <div>
                <label className="block text-xs font-mono text-white/50 uppercase mb-2 tracking-wider flex justify-between">
                  Authentication Key
                  <button onClick={() => setShowKey(!showKey)} className="text-emerald-500 hover:underline lowercase">
                    {showKey ? 'hide' : 'show'}
                  </button>
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    placeholder={`Enter ${settings.provider === 'GEMINI' ? 'Google AI' : settings.provider === 'OPENAI' ? 'OpenAI' : 'HuggingFace'} API Key...`}
                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-12 pr-4 py-3 font-mono text-sm outline-none transition-all duration-300 hover:bg-white/5 focus:bg-black/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
                {settings.provider !== 'HUGGINGFACE' && !settings.apiKey && (
                  <p className="text-[10px] text-amber-500/70 font-mono mt-1">Enter your API key to load available models.</p>
                )}
              </div>

              {/* Optional endpoint fields */}
              {settings.provider === 'HUGGINGFACE' && (
                <div>
                  <label className="block text-xs font-mono text-white/50 uppercase mb-2 tracking-wider">Inference Endpoint (Optional)</label>
                  <input
                    type="text"
                    value={settings.hfEndpoint || ''}
                    onChange={(e) => setSettings({ ...settings, hfEndpoint: e.target.value })}
                    placeholder="https://api-inference.huggingface.co/models/..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 font-mono text-sm outline-none transition-all duration-300 hover:bg-white/5 focus:bg-black/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              )}
              {settings.provider === 'OPENAI' && (
                <div>
                  <label className="block text-xs font-mono text-white/50 uppercase mb-2 tracking-wider">Base URL (Optional)</label>
                  <input
                    type="text"
                    value={settings.baseUrl || ''}
                    onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 font-mono text-sm outline-none transition-all duration-300 hover:bg-white/5 focus:bg-black/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              )}

              {/* Model Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-white/50 uppercase tracking-wider">
                    {settings.provider === 'GEMINI' ? 'Gemini Model' : settings.provider === 'OPENAI' ? 'OpenAI Model' : 'HuggingFace Model'}
                  </label>
                  <button
                    onClick={() => fetchModels(settings)}
                    disabled={isFetchingModels || (!settings.apiKey && settings.provider !== 'HUGGINGFACE')}
                    className="flex items-center gap-1 text-[10px] font-mono text-emerald-500 hover:text-emerald-300 disabled:text-white/20 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw size={10} className={isFetchingModels ? 'animate-spin' : ''} />
                    {isFetchingModels ? 'LOADING...' : 'REFRESH MODELS'}
                  </button>
                </div>

                {/* Manual model input */}
                <input
                  type="text"
                  value={currentModel}
                  onChange={(e) => setSettings({ ...settings, [modelKey]: e.target.value })}
                  placeholder={isFetchingModels ? 'Fetching models...' : modelsFetched ? 'Select below or type a model ID' : 'Model ID will load after key is entered'}
                  className={`w-full bg-black/50 border rounded-lg px-4 py-3 font-mono text-sm outline-none transition-all duration-300 hover:bg-white/5 focus:bg-black/80 ${
                    testStatus === 'FAILED'
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                  }`}
                />

                {/* Dynamic model list */}
                <div className="mt-3">
                  {isFetchingModels && (
                    <div className="flex items-center gap-2 py-4 text-white/40 font-mono text-xs">
                      <RefreshCw size={12} className="animate-spin" />
                      Fetching available models from {settings.provider}...
                    </div>
                  )}

                  {modelFetchError && !isFetchingModels && (
                    <div className="flex items-center gap-2 py-2 text-red-400 font-mono text-[10px]">
                      <AlertCircle size={12} />
                      {modelFetchError}
                    </div>
                  )}

                  {!isFetchingModels && availableModels.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                          {availableModels.length} models available
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                        {availableModels.map(model => (
                          <button
                            key={model.id}
                            onClick={() => selectModel(model.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all group ${
                              currentModel === model.id
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                : 'bg-white/5 border-white/5 hover:border-white/20 text-white/70'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate">{model.name}</div>
                              {model.desc && <div className="text-[10px] opacity-50 truncate">{model.desc}</div>}
                            </div>
                            <div className="text-[10px] font-mono opacity-0 group-hover:opacity-60 transition-opacity ml-2 shrink-0 max-w-[120px] truncate text-right">
                              {model.id !== model.name ? model.id : ''}
                            </div>
                            {currentModel === model.id && <CheckCircle2 size={14} className="ml-2 shrink-0 text-emerald-500" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {!isFetchingModels && !modelFetchError && availableModels.length === 0 && !modelsFetched && settings.provider !== 'HUGGINGFACE' && !settings.apiKey && (
                    <p className="text-[10px] font-mono text-white/25 py-2">
                      Models will appear here once you enter your API key above.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-400" />
              OPERATIONAL_PARAMETERS
            </h2>
            <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
              <div>
                <div className="font-bold">Premium Research Tools</div>
                <div className="text-xs text-white/50">Enable Google Search & Deep Web Grounding</div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, usePremiumTools: !settings.usePremiumTools })}
                className={`w-14 h-8 rounded-full transition-all relative ${settings.usePremiumTools ? 'bg-emerald-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.usePremiumTools ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* System Prompt */}
        <section className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full flex flex-col">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
              <Terminal className="w-6 h-6 text-emerald-400" />
              SYSTEM_INSTRUCTION_OVERRIDE
            </h2>
            <div className="flex-1 relative">
              <textarea
                value={settings.systemPrompt}
                onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                className="w-full h-full min-h-[400px] bg-black/50 border border-white/10 rounded-xl p-6 font-mono text-sm focus:border-emerald-500 outline-none transition-colors resize-none leading-relaxed"
                placeholder="Define the core behavior of Agent7..."
              />
              <div className="absolute bottom-4 right-4 text-[10px] font-mono text-white/20 uppercase">
                Neural Override Active
              </div>
            </div>
            <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <p className="text-xs text-emerald-500/70 font-mono leading-tight">
                CAUTION: Modifying system instructions may alter Agent7's tactical decision-making and operational fidelity. Ensure directives align with mission objectives.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
