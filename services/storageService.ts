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
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res;
};

// Intel Records
export const getIntelRecords = async (): Promise<IntelRecord[]> => {
  const res = await fetchWithAuth('/api/intel');
  const data = await res.json();
  return data.records || [];
};

export const saveIntelRecord = async (record: IntelRecord): Promise<IntelRecord[]> => {
  await fetchWithAuth('/api/intel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });
  return getIntelRecords();
};

// Assets
export const getAssets = async (): Promise<Asset[]> => {
  const res = await fetchWithAuth('/api/assets');
  return res.json();
};

export const saveAsset = async (asset: Asset): Promise<Asset[]> => {
  await fetchWithAuth('/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asset)
  });
  return getAssets();
};

// Targets
export const getTargets = async (): Promise<Target[]> => {
  const res = await fetchWithAuth('/api/targets');
  return res.json();
};

export const saveTarget = async (target: Target): Promise<Target[]> => {
  await fetchWithAuth('/api/targets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(target)
  });
  return getTargets();
};

// System Logs
export const getSystemLogs = async (): Promise<SystemLog[]> => {
  const res = await fetchWithAuth('/api/logs');
  return res.json();
};

export const addSystemLog = async (source: SystemLog['source'], message: string, status: SystemLog['status'] = 'INFO'): Promise<void> => {
  await fetchWithAuth('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, message, status })
  });
};

// Settings
export const getSettings = async (): Promise<AISettings> => {
  const res = await fetchWithAuth('/api/settings');
  return res.json();
};

export const saveSettings = async (settings: AISettings): Promise<void> => {
  await fetchWithAuth('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
};

// Mission
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
  await addSystemLog('USER_OPS', `Mission Plan '${plan.approach || 'DIRECT_ASSAULT'}' archived for target ${plan.targetName}`, 'SUCCESS');
};
