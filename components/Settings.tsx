import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Save, Shield, Cpu, Zap, Globe, Key, Terminal, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { AISettings } from '../types';
import { getSettings, saveSettings, addSystemLog } from '../services/storageService';
import { useNotification } from '../context/NotificationContext';
import { testAIConnection } from '../services/geminiService';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AISettings>(getSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'IDLE' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [showKey, setShowKey] = useState(false);
  const { notify } = useNotification();

  const PRESETS = {
    GEMINI: [
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Maximum reasoning & intelligence' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'High-speed tactical response' },
      { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Image', desc: 'Visual intelligence & generation' }
    ],
    HUGGINGFACE: [
      { id: 'meta-llama/Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B', desc: 'State-of-the-art open reasoning' },
      { id: 'meta-llama/Meta-Llama-3-8B-Instruct', name: 'Llama 3 8B', desc: 'Fast & efficient open reasoning' },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B', desc: 'Efficient & sharp instructions' },
      { id: 'NousResearch/Hermes-3-Llama-3.1-8B', name: 'Hermes 3 (Uncensored)', desc: 'High-fidelity uncensored intelligence' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', desc: 'Advanced multilingual performance' }
    ],
    OPENAI: [
      { id: 'gpt-4o', name: 'GPT-4o', desc: 'Most advanced multimodal model' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', desc: 'High-intelligence reasoning' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: 'Fast & cost-effective' }
    ]
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await testAIConnection(settings);
    
    if (success) {
      saveSettings(settings);
      setTestStatus('SUCCESS');
      addSystemLog('SYSTEM', 'AI Configuration verified and synchronized.', 'SUCCESS');
      notify('AI Configuration updated successfully', 'success');
    } else {
      setTestStatus('FAILED');
      addSystemLog('SYSTEM', 'AI Configuration failed verification. Save aborted.', 'ERROR');
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
      saveSettings(currentSettings); // Auto-sync on success
      notify('AI Connection established and synchronized', 'success');
      addSystemLog('SYSTEM', 'AI Neural link verified and stable. System synchronized.', 'SUCCESS');
    } else {
      setTestStatus('FAILED');
      notify('AI Connection failed. Check your API key and model identifier.', 'error');
      addSystemLog('SYSTEM', 'AI Neural link failed to initialize.', 'ERROR');
    }
  };

  // Auto-fetch logic: Extract model from endpoint URL ONLY when the endpoint itself changes
  useEffect(() => {
    if (settings.provider === 'HUGGINGFACE' && settings.hfEndpoint) {
      const hfUrlPattern = /(?:huggingface\.co\/models\/|endpoints\.huggingface\.cloud\/[^\/]+\/)([^\/]+\/[^\/]+|[^\/]+)/;
      const match = settings.hfEndpoint.match(hfUrlPattern);
      if (match && match[1] && settings.hfModel !== match[1]) {
        setSettings(prev => ({ ...prev, hfModel: match[1] }));
      }
    }
  }, [settings.hfEndpoint]);

  // Debounced auto-test when critical settings change
  useEffect(() => {
    const currentModel = settings.provider === 'GEMINI' ? settings.model : settings.hfModel;
    if (settings.apiKey && (currentModel || settings.hfEndpoint)) {
      const timer = setTimeout(() => {
        if (testStatus === 'IDLE' || testStatus === 'FAILED') {
          handleTestConnection(settings);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [settings.apiKey, settings.model, settings.hfModel, settings.provider]);

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
              <button
                onClick={() => setSettings({ 
                  ...settings, 
                  provider: 'GEMINI'
                })}
                className={`p-4 rounded-xl border transition-all text-left space-y-2 ${
                  settings.provider === 'GEMINI' 
                    ? 'bg-blue-500/10 border-blue-500' 
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                }`}
              >
                <div className="font-bold">Google Gemini</div>
                <div className="text-xs text-white/50">High-speed multimodal intelligence</div>
              </button>
              <button
                onClick={() => setSettings({ 
                  ...settings, 
                  provider: 'HUGGINGFACE',
                  hfModel: settings.hfModel || 'meta-llama/Llama-3.1-70B-Instruct'
                })}
                className={`p-4 rounded-xl border transition-all text-left space-y-2 ${
                  settings.provider === 'HUGGINGFACE' 
                    ? 'bg-orange-500/10 border-orange-500' 
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                }`}
              >
                <div className="font-bold">Hugging Face</div>
                <div className="text-xs text-white/50">Open-source inference endpoints</div>
              </button>
              <button
                onClick={() => setSettings({ 
                  ...settings, 
                  provider: 'OPENAI',
                  model: settings.model || 'gpt-4o'
                })}
                className={`p-4 rounded-xl border transition-all text-left space-y-2 ${
                  settings.provider === 'OPENAI' 
                    ? 'bg-green-500/10 border-green-500' 
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                }`}
              >
                <div className="font-bold">OpenAI / Compatible</div>
                <div className="text-xs text-white/50">GPT-4o or custom endpoints</div>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-white/50 uppercase mb-2 tracking-wider">
                  {settings.provider === 'GEMINI' ? 'Gemini Model ID' : settings.provider === 'OPENAI' ? 'OpenAI Model ID' : 'Hugging Face Model Name'}
                </label>
                <input
                  type="text"
                  value={settings.provider === 'GEMINI' || settings.provider === 'OPENAI' ? settings.model : (settings.hfModel || '')}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    [settings.provider === 'GEMINI' || settings.provider === 'OPENAI' ? 'model' : 'hfModel']: e.target.value 
                  })}
                  placeholder={settings.provider === 'GEMINI' ? 'gemini-3.1-pro-preview' : settings.provider === 'OPENAI' ? 'gpt-4o' : 'meta-llama/Llama-3-70b-instruct'}
                  className={`w-full bg-black/50 border rounded-lg px-4 py-3 font-mono text-sm outline-none transition-all duration-300 ${
                    testStatus === 'FAILED' 
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' 
                      : 'border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                  } hover:bg-white/5 focus:bg-black/80`}
                />
                
                <div className="mt-4 space-y-2">
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Tactical Presets</span>
                  <div className="grid grid-cols-1 gap-2">
                    {settings.provider && PRESETS[settings.provider as keyof typeof PRESETS]?.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => setSettings({ 
                          ...settings, 
                          [settings.provider === 'GEMINI' || settings.provider === 'OPENAI' ? 'model' : 'hfModel']: preset.id 
                        })}
                        className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all group ${
                          (settings.provider === 'GEMINI' || settings.provider === 'OPENAI' ? settings.model : settings.hfModel) === preset.id 
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                            : 'bg-white/5 border-white/5 hover:border-white/20 text-white/70'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold">{preset.name}</div>
                          <div className="text-[10px] opacity-50">{preset.desc}</div>
                        </div>
                        <div className="text-[10px] font-mono opacity-30 group-hover:opacity-100 transition-opacity">
                          {preset.id}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

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

              <div>
                <label className="block text-xs font-mono text-white/50 uppercase mb-2 tracking-wider flex justify-between">
                  Authentication Key
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="text-emerald-500 hover:underline lowercase"
                  >
                    {showKey ? 'hide' : 'show'}
                  </button>
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    placeholder="Enter API Key..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-12 pr-4 py-3 font-mono text-sm outline-none transition-all duration-300 hover:bg-white/5 focus:bg-black/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
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
                className={`w-14 h-8 rounded-full transition-all relative ${
                  settings.usePremiumTools ? 'bg-emerald-500' : 'bg-white/10'
                }`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                  settings.usePremiumTools ? 'left-7' : 'left-1'
                }`} />
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
