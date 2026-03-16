import { IntelRecord, Asset, MissionPlan, SystemLog, AISettings, Target } from '../types.js';
import { authService } from './authService.js';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers = { ...authService.getAuthHeaders(), ...options.headers };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    // Session expired
    await authService.logout();
    window.location.reload();
    throw new Error('Session expired');
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
