import { IntelRecord, Asset, MissionPlan, SystemLog, AISettings, Target } from '../types';

const INTEL_KEY = 'agent7_intel_db';
const ASSETS_KEY = 'agent7_assets';
const LOGS_KEY = 'agent7_system_logs';
const SETTINGS_KEY = 'agent7_ai_settings';
const TARGETS_KEY = 'agent7_targets';

const DEFAULT_SETTINGS: AISettings = {
    provider: 'GEMINI',
    model: '',
    hfModel: '',
    apiKey: '',
    systemPrompt: 'You are AGENT-7, a high-level cyber intelligence AI. Your purpose is to assist in deep-cover operations, target reconnaissance, and tactical planning. You provide precise, factual data and never compromise operational security.',
    usePremiumTools: true,
    baseUrl: 'https://api.openai.com/v1'
};

const DEFAULT_INTEL: IntelRecord[] = [
  { 
    id: 'REC-001', 
    title: 'Operation Blackbriar Summary', 
    type: 'REPORT', 
    date: '2023-10-12', 
    clearance: 'TOP SECRET',
    details: 'Surveillance indicates Subject 09 has moved assets to offshore accounts in Cayman Islands. Intercepted comms suggest a rendezvous in Berlin on 11/04. Recommended action: Deploy active tracking team.'
  },
  { 
    id: 'REC-002', 
    title: 'Target Alpha WhatsApp Intercept', 
    type: 'INTERCEPT', 
    date: '2023-11-05', 
    clearance: 'SECRET',
    details: '[14:02] T-Alpha: "The package is secure."\n[14:03] Handler: "Proceed to extraction point."\n[14:05] T-Alpha: "Negative, surveillance detected. Aborting."\nAnalysis: Target is aware of surveillance. Counter-measures active.'
  }
];

const DEFAULT_ASSETS: Asset[] = [
    { id: 'ASSET-X12', type: 'IOT_SWARM', region: 'NA-EAST', status: 'ACTIVE', dataRate: 124 },
    { id: 'ASSET-B99', type: 'GHOST_RELAY', region: 'EU-CENTRAL', status: 'EXFILTRATING', dataRate: 4050 },
];

// Helper to dispatch local storage events for cross-component updates
const dispatchUpdate = (key: string) => {
    window.dispatchEvent(new Event(`storage_${key}`));
};

export const getIntelRecords = async (): Promise<IntelRecord[]> => {
    try {
        const response = await fetch('/api/intel');
        if (!response.ok) throw new Error('Failed to fetch intel records');
        return await response.json();
    } catch (e) {
        console.error("API Error", e);
        return DEFAULT_INTEL;
    }
};

export const saveIntelRecord = async (record: IntelRecord): Promise<IntelRecord[]> => {
    try {
        const response = await fetch('/api/intel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        if (!response.ok) throw new Error('Failed to save intel record');
        dispatchUpdate(INTEL_KEY);
        return getIntelRecords();
    } catch (e) {
        console.error("API Error", e);
        return getIntelRecords();
    }
};

export const getAssets = (): Asset[] => {
    try {
        const stored = localStorage.getItem(ASSETS_KEY);
        if (!stored) {
            localStorage.setItem(ASSETS_KEY, JSON.stringify(DEFAULT_ASSETS));
            return DEFAULT_ASSETS;
        }
        return JSON.parse(stored);
    } catch (e) {
        console.error("Storage Error", e);
        return DEFAULT_ASSETS;
    }
};

export const saveAsset = (asset: Asset): Asset[] => {
    const current = getAssets();
    const updated = [...current, asset];
    localStorage.setItem(ASSETS_KEY, JSON.stringify(updated));
    dispatchUpdate(ASSETS_KEY);
    return updated;
};

export const saveMission = async (plan: MissionPlan): Promise<void> => {
    const missionRecord: IntelRecord = {
        id: `OP-${Math.floor(Math.random() * 9000) + 1000}`,
        title: `OP: ${(plan.approach || 'DIRECT_ASSAULT').toUpperCase()} // ${plan.targetName}`,
        type: 'MISSION',
        date: new Date().toISOString().split('T')[0],
        clearance: 'TOP SECRET',
        details: `TARGET: ${plan.targetName}\nOBJECTIVE: ${plan.objective}\nRISK: ${plan.riskLevel}\nFEASIBILITY: ${plan.feasibility}%\nSTEPS:\n${plan.steps.join('\n')}`
    };
    await saveIntelRecord(missionRecord);
    addSystemLog('USER_OPS', `Mission Plan '${plan.approach || 'DIRECT_ASSAULT'}' archived for target ${plan.targetName}`, 'SUCCESS');
};

// System Logs
export const getSystemLogs = (): SystemLog[] => {
    try {
        const stored = localStorage.getItem(LOGS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

export const addSystemLog = (source: SystemLog['source'], message: string, status: SystemLog['status'] = 'INFO') => {
    const logs = getSystemLogs();
    const newLog: SystemLog = {
        id: Math.random().toString(36).substring(2, 11),
        timestamp: new Date().toISOString(),
        source,
        message,
        status
    };
    const updatedLogs = [newLog, ...logs].slice(0, 100); // Keep last 100
    localStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));
    dispatchUpdate(LOGS_KEY);
};

export const getSettings = (): AISettings => {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
};

export const saveSettings = (settings: AISettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    dispatchUpdate(SETTINGS_KEY);
};

export const getTargets = (): Target[] => {
    try {
        const stored = localStorage.getItem(TARGETS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

export const saveTarget = (target: Target): Target[] => {
    const current = getTargets();
    const index = current.findIndex(t => t.id === target.id || t.name === target.name);
    let updated;
    if (index >= 0) {
        updated = [...current];
        updated[index] = { ...updated[index], ...target };
    } else {
        updated = [target, ...current];
    }
    localStorage.setItem(TARGETS_KEY, JSON.stringify(updated));
    dispatchUpdate(TARGETS_KEY);
    return updated;
};
