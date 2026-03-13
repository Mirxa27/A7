
export interface AnalysisResult {
  threatLevel: number; // 1-100
  summary: string;
  entities: string[];
  locations: string[];
  sentiment: 'Hostile' | 'Neutral' | 'Cooperative' | 'Unknown';
  tacticalRecommendation: string;
  compliance?: ComplianceMetadata;
  identityConfidence?: IdentityConfidence;
  riskAssessment?: {
    sensitiveDataExposed: boolean;
    riskIndicators: string[];
  };
  sources?: Source[];
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  SEARCH = 'SEARCH',
  ANALYSIS = 'ANALYSIS',
  SURVEILLANCE = 'SURVEILLANCE',
  SOCIAL_ENG = 'SOCIAL_ENG',
  PREDICTIVE = 'PREDICTIVE',
  LOGS = 'LOGS',
  NETWORK = 'NETWORK',
  TARGET_OPS = 'TARGET_OPS',
  DATA_INGESTION = 'DATA_INGESTION',
  SETTINGS = 'SETTINGS'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'CRIT';
  message: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  source: 'SYSTEM' | 'NETWORK' | 'AI_CORE' | 'USER_OPS' | 'FORENSICS';
  message: string;
  status: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface PersonaProfile {
  codename: string;
  occupation: string;
  backgroundStory: string;
  psychologicalHooks: string[];
  suggestedOpeningLine: string;
}

export interface BehavioralForecast {
  scenarios: {
    action: string;
    probability: number; // 0-100
    trigger: string;
  }[];
  flightRisk: number;
  compromiseSusceptibility: number;
  narrativeAnalysis: string;
}

export interface IntelRecord {
  id: string;
  title: string;
  type: 'REPORT' | 'INTERCEPT' | 'PROFILE' | 'ASSET' | 'BREACH' | 'SURVEILLANCE' | 'MISSION';
  date: string;
  clearance: 'TOP SECRET' | 'SECRET' | 'CONFIDENTIAL';
  details?: string;
  tags?: string[];
  source?: string;
}

export interface Asset {
  id: string;
  type: 'IOT_SWARM' | 'PACKET_SNIFFER' | 'GHOST_RELAY' | 'TROJAN_DAEMON';
  region: string;
  status: 'ACTIVE' | 'DORMANT' | 'COMPROMISED' | 'EXFILTRATING';
  dataRate: number; // kb/s
}

export interface Source {
  title: string;
  uri: string;
  snippet?: string;
}

export interface SocialProfile {
  platform: string;
  username: string;
  url: string;
  status: 'ACTIVE' | 'DORMANT' | 'SUSPENDED' | 'UNKNOWN';
  notes?: string;
  accessDetails?: string;
}

export interface DeviceIntel {
  deviceName: string;
  osVersion: string;
  batteryLevel: string;
  ipAddress: string;
  lastLocation: string;
  provider: string;
  status: 'ONLINE' | 'OFFLINE' | 'ACTIVE_CALL' | 'COMPROMISED';
  compromisedApps: string[];
  mcc?: string;
  mnc?: string;
  lac?: string;
}

export interface ComplianceMetadata {
  gdprStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  ccpaStatus: 'OPT_OUT' | 'OPT_IN' | 'NOT_APPLICABLE';
  dataRetentionDate: string;
  legalBasis: 'CONSENT' | 'LEGITIMATE_INTEREST' | 'CONTRACT';
  anonymizationLevel: 'NONE' | 'PSEUDONYMIZED' | 'K_ANONYMITY';
}

export interface IdentityConfidence {
  overallScore: number; // 0-100
  nameMatch: number;
  dobMatch: number;
  addressMatch: number;
  sources: number;
}

export interface TargetDossier {
  report: string;
  exactName?: string;
  aliases?: string[];
  contactInfo?: {
    emails?: string[];
    phones?: string[];
    addresses?: string[];
  };
  socialProfiles: SocialProfile[];
  sources: Source[];
  images?: string[];
  deviceIntel?: DeviceIntel;
  compliance?: ComplianceMetadata;
  identityConfidence?: IdentityConfidence;
  verificationNotes?: string;
  lastUpdated?: string;
}

export interface MissionPlan {
  targetName: string;
  objective: string;
  feasibility: number; // 0-100
  approach: string;
  steps: string[];
  resources: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export interface ForensicData {
  fileName: string;
  timestamp: string;
  fileSize: number;
  metadata: Record<string, any>;
  analysisReport: string;
  gpsCoordinates?: { lat: number; lng: number };
}

// --- NEW TYPES FOR STABILITY ---

export interface ForensicArtifact {
  name: string;
  size: number;
  type: string;
  lastModified: string;
  exif: Record<string, any>;
  gps: { latitude: number; longitude: number } | null;
}

export interface RadarMetric {
  subject: string;
  A: number;
  fullMark: number;
}

export interface ChartDataPoint {
  name: string;
  uv: number;
  pv: number;
  amt: number;
}

export interface Target {
  id: string;
  name: string;
  status: 'TRACKING' | 'LOST' | 'COMPROMISED' | 'IDLE';
  lastSeen: string;
  location?: string;
  activityLevel: number; // 0-100
  images?: string[];
  socialFootprint?: {
    visibility: number; // 0-100
    accessLevel: 'NONE' | 'PARTIAL' | 'FULL';
    accounts: SocialProfile[];
  };
}

export interface AISettings {
  provider: 'GEMINI' | 'HUGGINGFACE' | 'OPENAI';
  model: string;
  hfModel?: string;
  apiKey: string;
  systemPrompt: string;
  hfEndpoint?: string;
  baseUrl?: string;
  usePremiumTools: boolean;
}
