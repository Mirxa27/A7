import React, { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { generateMissionPlan, generateTargetDossier, generateExfiltrationArtifacts, testAIConnection } from '../services/geminiService';
import { performOsintLookup } from '../services/osintService';
import { saveMission, addSystemLog, getSettings, saveTarget } from '../services/storageService';
import { MissionPlan, TargetDossier, Target } from '../types';

interface OperationsContextType {
  targetInput: string;
  setTargetInput: (val: string) => void;
  emailInput: string;
  setEmailInput: (val: string) => void;
  phoneInput: string;
  setPhoneInput: (val: string) => void;
  socialsInput: string;
  setSocialsInput: (val: string) => void;
  socialInput: string;
  setSocialInput: (val: string) => void;
  objectiveInput: string;
  setObjectiveInput: (val: string) => void;
  activeResources: string[];
  setActiveResources: (resources: string[]) => void;
  status: 'IDLE' | 'ACTIVE' | 'COMPLETE' | 'FAILED';
  localLogs: string[];
  dossier: TargetDossier | null;
  missionPlan: MissionPlan | null;
  exfiltratedFiles: any[];
  activeTab: 'INTEL' | 'MISSION' | 'GEO' | 'IDENTITY';
  setActiveTab: (tab: 'INTEL' | 'MISSION' | 'GEO' | 'IDENTITY') => void;
  executeOperation: () => Promise<void>;
  resetOperation: () => void;
  aiStatus: 'IDLE' | 'READY' | 'OFFLINE';
  checkAIStatus: () => Promise<void>;
}

const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

interface OperationsProviderProps {
  children: ReactNode;
}

export const OperationsProvider: React.FC<OperationsProviderProps> = ({ children }) => {
  // Input State
  const [targetInput, setTargetInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [socialsInput, setSocialsInput] = useState('');
  const [socialInput, setSocialInput] = useState('');
  const [objectiveInput, setObjectiveInput] = useState('');
  const [activeResources, setActiveResources] = useState<string[]>([]);
  
  // Execution State
  const [status, setStatus] = useState<'IDLE' | 'ACTIVE' | 'COMPLETE' | 'FAILED'>('IDLE');
  const [localLogs, setLocalLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'INTEL' | 'MISSION' | 'GEO' | 'IDENTITY'>('INTEL');
  
  // Results State
  const [dossier, setDossier] = useState<TargetDossier | null>(null);
  const [missionPlan, setMissionPlan] = useState<MissionPlan | null>(null);
  const [exfiltratedFiles, setExfiltratedFiles] = useState<any[]>([]);
  const [aiStatus, setAiStatus] = useState<'IDLE' | 'READY' | 'OFFLINE'>('IDLE');

  const checkAIStatus = async () => {
    const settings = await getSettings();
    if (!settings.apiKey) {
      setAiStatus('OFFLINE');
      return;
    }
    const isReady = await testAIConnection(settings);
    setAiStatus(isReady ? 'READY' : 'OFFLINE');
  };

  useEffect(() => {
    checkAIStatus();
  }, []);

  const addLocalLog = (message: string) => {
    setLocalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const resetOperation = () => {
    setTargetInput('');
    setEmailInput('');
    setPhoneInput('');
    setSocialsInput('');
    setSocialInput('');
    setObjectiveInput('');
    setActiveResources([]);
    setStatus('IDLE');
    setDossier(null);
    setMissionPlan(null);
    setExfiltratedFiles([]);
    setLocalLogs([]);
    setActiveTab('INTEL');
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const executeOperation = async () => {
    if (!targetInput || !objectiveInput) return;
    if (status === 'ACTIVE') return; // Prevent double execution
    
    // Reset for new run
    setStatus('ACTIVE');
    setLocalLogs([]);
    setDossier(null);
    setMissionPlan(null);
    setActiveTab('INTEL');

    try {
      // Step 1: Surveillance
      addLocalLog(`>> INITIALIZING SURVEILLANCE PROTOCOLS...`);
      await sleep(600);
      
      // Resource Injection Logs
      if (activeResources.length > 0) {
        addLocalLog(`>> ACTIVATING OFFENSIVE CYBER ASSETS...`);
        for (const resource of activeResources) {
            await sleep(400);
            if (resource === 'PEGASUS_LITE') addLocalLog(`>> [PEGASUS] INJECTING ZERO-CLICK KERNEL BRIDGE...`);
            if (resource === 'ZERO_DAY') addLocalLog(`>> [0-DAY] EXPLOITING UNPATCHED CVE-2024-XXXX...`);
            if (resource === 'SS7_INTERCEPT') addLocalLog(`>> [SS7] REROUTING SMS GATEWAY PACKETS...`);
            if (resource === 'ROOTKIT') addLocalLog(`>> [ROOTKIT] ESTABLISHING PERSISTENT RING-0 ACCESS...`);
            if (resource === 'BRUTE_FORCE') addLocalLog(`>> [DECRYPT] QUANTUM TUNNELING ENCRYPTION KEYS...`);
        }
        await sleep(800);
        addLocalLog(`>> PERIMETER BREACHED. ADMIN PRIVILEGES ACQUIRED.`);
      }

      const isPhone = targetInput.match(/^[+\d\s()-]+$/) && targetInput.length > 5;
      const isUrl = targetInput.includes('http') || targetInput.includes('www') || targetInput.includes('.');

      addLocalLog(`>> EXECUTING REAL-TIME OSINT VECTORS...`);
      const realOsintData = await performOsintLookup(targetInput);

      if (realOsintData.phone) {
          addLocalLog(`>> DETECTED MOBILE SIGNAL: ${targetInput}`);
          setActiveTab('GEO');
          addLocalLog(`>> [GEO] SIGNAL VERIFIED: ${realOsintData.phone.country} [${realOsintData.phone.type || 'MOBILE'}]`);
          addLocalLog(`>> [SS7] INITIATING HLR LOOKUP (sendRoutingInfoForSM)...`);
          addLocalLog(`>> [SS7] TARGET CELLID ACQUIRED: MCC:310 MNC:260 LAC:4821`);
          addLocalLog(`>> [GEO] TRIANGULATING TOWER SIGNAL STRENGTH...`);
          addLocalLog(`>> [GEO] TRIANGULATION PRECISION < 800m. INITIATING ACTIVE PING.`);
          addLocalLog(`>> [EXPLOIT] DEPLOYING TYPE-0 SILENT SMS PAYLOAD...`);
          addLocalLog(`>> [GEO] HANDSET GPS DATA EXFILTRATED.`);
      } else if (isUrl) {
          addLocalLog(`>> TARGET DOMAIN IDENTIFIED`);
          if (realOsintData.dns) addLocalLog(`>> [DNS] ${realOsintData.dns.length} RECORDS FOUND.`);
          if (realOsintData.whois) addLocalLog(`>> [WHOIS] REGISTRANT: ${realOsintData.whois.registrantOrganization || 'REDACTED'}`);
          addLocalLog(`>> SCRAPING DOM NODE STRUCTURE...`);
      } else {
          addLocalLog(`>> TARGET IDENTITY: ${targetInput.toUpperCase()}`);
          if (realOsintData.username && realOsintData.username.length > 0) {
              const found = realOsintData.username.map((s: any) => s.platform);
              addLocalLog(`>> [OSINT] MATCHES FOUND: ${found.join(', ')}`);
          }
      }
      
      addLocalLog(`>> CONNECTING TO GLOBAL INFORMATION GRID...`);
      addSystemLog('USER_OPS', `Surveillance operation initiated on ${targetInput} with [${activeResources.length}] active vectors`, 'INFO').catch(() => {});
      
      // Combine inputs for the AI query with specific instructions based on type
      let specificInstructions = "";
      if (isPhone) specificInstructions = "(INPUT IS A PHONE NUMBER. REQUIRED: Carrier Check, Region, Line Type, Associated Apps/Breaches).";
      if (isUrl) specificInstructions = "(INPUT IS A URL. REQUIRED: Deep scrap, technology stack, owner info, vulnerability check).";

      const fullQuery = {
        name: targetInput,
        email: emailInput,
        phone: phoneInput,
        socials: socialsInput,
        additionalInfo: socialInput,
        realOsint: realOsintData // Pass real OSINT data to AI
      };

      // Pass active resources to the AI service
      const intelResult = await generateTargetDossier(fullQuery, activeResources);
      setDossier(intelResult);
      addLocalLog(`>> INTEL ACQUIRED. ${intelResult.sources.length} VERIFIED VECTORS.`);
      if (intelResult.deviceIntel) {
          addLocalLog(`>> DEVICE TELEMETRY: ONLINE [${intelResult.deviceIntel.batteryLevel}]`);
      }

      // Persist target to surveillance grid and social engineering module
      const newTarget: Target = {
          id: `TGT-${Math.floor(Math.random() * 9000) + 1000}`,
          name: intelResult.exactName || targetInput,
          status: 'TRACKING',
          lastSeen: new Date().toISOString(),
          activityLevel: Math.floor(Math.random() * 40) + 60,
          images: intelResult.images || [],
          socialFootprint: {
              visibility: intelResult.socialProfiles.length > 0
                  ? Math.min(95, intelResult.socialProfiles.length * 15 + 20)
                  : 15,
              accessLevel: activeResources.length > 0
                  ? 'FULL'
                  : intelResult.socialProfiles.length > 2 ? 'PARTIAL' : 'NONE',
              accounts: intelResult.socialProfiles || []
          }
      };
      saveTarget(newTarget);
      addLocalLog(`>> TARGET PROFILE SAVED TO SURVEILLANCE GRID.`);
      
      // Step 2: Analysis & Planning
      await sleep(500);
      addLocalLog(`>> INITIATING TACTICAL ANALYSIS ENGINE...`);
      addLocalLog(`>> OBJECTIVE PARSING: "${objectiveInput.substring(0, 25)}..."`);
      
      const planResult = await generateMissionPlan(targetInput, intelResult.report, objectiveInput);
      setMissionPlan(planResult);
      addLocalLog(`>> STRATEGY COMPUTED: OP ${planResult.approach.toUpperCase()}`);
      addLocalLog(`>> RISK ASSESSMENT: ${planResult.riskLevel}`);

      // Step 3: Exfiltration
      if (activeResources.length > 0) {
          addLocalLog(`>> INITIATING DATA EXFILTRATION...`);
          const artifacts = await generateExfiltrationArtifacts(targetInput, intelResult.report);
          setExfiltratedFiles(artifacts);
          addLocalLog(`>> EXFIL COMPLETE. ${artifacts.length} ARTIFACTS RECOVERED.`);
      }

      // Step 4: Archival
      addLocalLog(`>> ENCRYPTING MISSION PROFILE...`);
      await saveMission(planResult);
      addLocalLog(`>> MISSION LOGGED TO SECURE ARCHIVE.`);
      
      setStatus('COMPLETE');
      if (isPhone) setActiveTab('GEO'); // Keep focusing on GEO for phones

    } catch (error) {
      console.error(error);
      addLocalLog(`!! CRITICAL FAILURE: OPERATION ABORTED !!`);
      addLocalLog(`!! CHECK SYSTEM LOGS FOR TRACE !!`);
      addSystemLog('USER_OPS', `Operation failed for target ${targetInput}`, 'ERROR').catch(() => {});
      setStatus('FAILED');
    }
  };

  return (
    <OperationsContext.Provider value={{
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
      executeOperation, resetOperation,
      aiStatus, checkAIStatus
    }}>
      {children}
    </OperationsContext.Provider>
  );
};

export const useOperations = () => {
    const context = useContext(OperationsContext);
    if (!context) throw new Error("useOperations must be used within OperationsProvider");
    return context;
};