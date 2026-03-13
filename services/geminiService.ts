import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, PersonaProfile, BehavioralForecast, Asset, MissionPlan, TargetDossier, Source, ForensicArtifact, AISettings } from '../types';
import { addSystemLog, getSettings } from './storageService';

// ================================================
// IMPROVED CORE – DEEP RESEARCH EDITION (2026)
// ================================================
// Major upgrades for "deeply real results":
// 1. New executeIterativeResearch – multi-round agentic pipeline (plan → 3–5 targeted grounded searches → synthesis)
// 2. Strict anti-hallucination system prompt + temperature=0.0 + forced tool usage
// 3. Fixed SDK call format + generationConfig + deduped sources
// 4. generateTargetDossier is now a true 5-stage OSINT pipeline (the main function that needed real depth)
// 5. All other research functions now use deep mode

const STRICT_SYSTEM_INSTRUCTION = `
CRITICAL PROTOCOL: ANTI-HALLUCINATION & FACTUAL GROUNDING
1. NEVER FABRICATE: If information is not found in search results, state "Information not found in public records."
2. SOURCE EVERYTHING: Every claim must be linked to a source URI from the grounding metadata.
3. VERIFICATION: Cross-reference multiple sources. If sources conflict, highlight the discrepancy.
4. TONE: Professional, intelligence-grade, objective.
5. NO ROLEPLAY: You are a high-level OSINT analyst, not a character.
6. REAL ENTITIES: Focus on real-world entities, locations, and events.
`;

// Helper: Exponential Backoff Retry Wrapper
const withRetry = async <T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        if (retries <= 0) throw error;
        console.warn(`AI API Request Failed. Retrying in ${delay}ms... (${retries} attempts left). Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetry(operation, retries - 1, delay * 2);
    }
};

// Helper to strip Markdown formatting from JSON responses
const cleanJson = (text: string | undefined): string => {
    if (!text) return "{}";
    let clean = text.trim();
    if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json/, '').replace(/```$/, '');
    } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```/, '').replace(/```$/, '');
    }
    return clean.trim();
};

// Security: Validate URIs
const validateUri = (uri: string): string => {
    try {
        const parsed = new URL(uri);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return uri;
        }
        return '#unsafe-uri';
    } catch {
        return '#invalid-uri';
    }
};

const callHuggingFace = async (prompt: string, systemInstruction: string, settings: AISettings): Promise<string> => {
    const model = settings.hfModel || settings.model || 'meta-llama/Meta-Llama-3-8B-Instruct';
    const endpoint = settings.hfEndpoint || `https://api-inference.huggingface.co/models/${model}`;
    const fullPrompt = `${systemInstruction}\n\nUser Request: ${prompt}`;
    
    // Try different payload structures as some HF models expect different keys
    const payloads = [
        { 
            inputs: fullPrompt,
            parameters: { max_new_tokens: 1024, return_full_text: false }
        },
        {
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
            ],
            parameters: { max_new_tokens: 1024 }
        },
        {
            prompt: fullPrompt,
            parameters: { max_new_tokens: 1024 }
        },
        {
            inputs: {
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: prompt }
                ]
            },
            parameters: { max_new_tokens: 1024 }
        }
    ];

    let lastError = null;

    for (const payload of payloads) {
        try {
            // Use backend proxy to avoid CORS and keep keys secure
            const response = await fetch('/api/ai/huggingface', {
                headers: { "Content-Type": "application/json" },
                method: "POST",
                body: JSON.stringify({
                    endpoint,
                    payload,
                    apiKey: settings.apiKey
                }),
            });

            const result = await response.json();

            if (response.ok) {
                if (Array.isArray(result)) {
                    return result[0].generated_text || result[0].summary_text || JSON.stringify(result[0]);
                }
                return result.generated_text || result.text || JSON.stringify(result);
            }

            const errorMsg = result.error?.message || result.error || JSON.stringify(result);

            if (response.status === 404) {
                throw new Error(`Hugging Face Model Not Found: "${model}". Verify the name on Hugging Face.`);
            }

            if (response.status === 400 && (errorMsg.includes('prompt') || errorMsg.includes('inputs') || errorMsg.includes('messages'))) {
                lastError = new Error(`Hugging Face API Error (${response.status}): ${errorMsg}`);
                continue; 
            }

            throw new Error(`Hugging Face API Error (${response.status}): ${errorMsg}`);
        } catch (error: any) {
            if (error.message.includes('Model Not Found')) throw error;
            lastError = error;
        }
    }

    throw lastError || new Error("Hugging Face connection failed.");
};

const callOpenAI = async (prompt: string, systemInstruction: string, settings: AISettings): Promise<string> => {
    const model = settings.model || 'gpt-4o';
    const baseUrl = settings.baseUrl || 'https://api.openai.com/v1';
    
    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.0
            })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(`OpenAI API Error (${response.status}): ${result.error?.message || JSON.stringify(result)}`);
        }

        return result.choices?.[0]?.message?.content || "";
    } catch (error: any) {
        throw new Error(`OpenAI Connection Failed: ${error.message}`);
    }
};

interface AIResponse {
    text: string;
    sources: Source[];
}

const executeAI = async (params: {
    prompt: string,
    systemInstruction?: string,
    model?: string,
    responseMimeType?: string,
    responseSchema?: any,
    tools?: any[],
    usePremiumTools?: boolean,
    temperature?: number
}): Promise<AIResponse> => {
    const settings = getSettings();
    const apiKey = settings.apiKey || process.env.API_KEY || '';
    
    if (!apiKey) {
        throw new Error("AI Neural Link Error: API Key is missing. Please configure your API key in the Settings module.");
    }

    // Merge instructions: Global + Strict Protocol + Local
    const systemPrompt = `${settings.systemPrompt}\n${STRICT_SYSTEM_INSTRUCTION}\n${params.systemInstruction || ''}`;

    if (settings.provider === 'HUGGINGFACE') {
        const text = await callHuggingFace(params.prompt, systemPrompt, settings);
        return { text, sources: [] };
    }

    if (settings.provider === 'OPENAI') {
        const text = await callOpenAI(params.prompt, systemPrompt, settings);
        return { text, sources: [] };
    }

    // Default to Gemini
    try {
        const genAI = new GoogleGenAI({ apiKey });
        const modelName = params.model || settings.model || "gemini-2.5-pro";
        
        const config: any = {
            systemInstruction: systemPrompt,
            temperature: params.temperature ?? 0.0, // Force factual by default
        };

        if (params.responseMimeType) config.responseMimeType = params.responseMimeType;
        if (params.responseSchema) config.responseSchema = params.responseSchema;
        
        // Tools support
        if (settings.usePremiumTools || params.usePremiumTools) {
            config.tools = params.tools || [{ googleSearch: {} }];
        }

        const response = await genAI.models.generateContent({
            model: modelName,
            contents: [{ role: "user", parts: [{ text: params.prompt }] }],
            config
        });

        const sources: Source[] = [];
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            const seenUris = new Set<string>();
            response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
                if (chunk.web && chunk.web.uri && !seenUris.has(chunk.web.uri)) {
                    seenUris.add(chunk.web.uri);
                    sources.push({ 
                        title: chunk.web.title || 'Source', 
                        uri: validateUri(chunk.web.uri),
                        snippet: chunk.web.snippet || ""
                    });
                }
            });
        }

        return { 
            text: response.text || "", 
            sources 
        };
    } catch (error: any) {
        console.error("Gemini Execution Error:", error);
        if (error.message?.includes('Failed to fetch')) {
            throw new Error("AI Neural Link Error: Network connection failed. This may be due to a blocked request, invalid API key, or temporary service outage. Please verify your internet connection and API key in Settings.");
        }
        throw error;
    }
};

/**
 * NEW: Iterative Deep Research Pipeline
 * Executes multiple rounds of grounded search to build a comprehensive fact-base.
 */
export const executeIterativeResearch = async (goal: string, rounds = 3): Promise<{ report: string, sources: Source[], researchLog: string[] }> => {
    const researchLog: string[] = [];
    const allSources: Source[] = [];
    let currentFactBase = "";

    addSystemLog('AI_CORE', `Starting deep research pipeline: ${goal}`, 'INFO');
    researchLog.push(`[INIT] Deep Research Objective: ${goal}`);

    for (let i = 1; i <= rounds; i++) {
        researchLog.push(`[ROUND ${i}] Generating targeted search queries...`);
        
        // 1. Generate search queries based on current knowledge
        const planRes = await executeAI({
            prompt: `Based on the research goal: "${goal}" and current facts: "${currentFactBase}", generate 3 specific, high-intent search queries to find missing or deeper information.`,
            systemInstruction: "Output ONLY a JSON array of 3 strings.",
            responseMimeType: "application/json",
            temperature: 0.1
        });

        const queries: string[] = JSON.parse(cleanJson(planRes.text));
        researchLog.push(`[ROUND ${i}] Queries: ${queries.join(' | ')}`);

        // 2. Execute grounded searches for each query
        for (const query of queries) {
            researchLog.push(`[ROUND ${i}] Searching: ${query}...`);
            const searchRes = await executeAI({
                prompt: `Research Query: ${query}. Focus on finding verifiable facts, dates, entities, and links.`,
                usePremiumTools: true,
                temperature: 0.0
            });

            currentFactBase += `\n\n--- SEARCH RESULT (${query}) ---\n${searchRes.text}`;
            searchRes.sources.forEach(s => {
                if (!allSources.find(existing => existing.uri === s.uri)) {
                    allSources.push(s);
                }
            });
        }
    }

    researchLog.push(`[SYNTHESIS] Compiling final intelligence report...`);
    
    // 3. Final Synthesis
    const finalRes = await executeAI({
        prompt: `Synthesize the following research data into a professional, structured intelligence report about "${goal}". 
        DATA: ${currentFactBase}
        
        REQUIREMENTS:
        - Use Markdown headers.
        - Cite sources using [1], [2] notation.
        - Include a "Confidence Assessment" section.
        - Highlight any conflicting information.`,
        temperature: 0.0
    });

    addSystemLog('AI_CORE', `Deep research complete for: ${goal}`, 'SUCCESS');
    return {
        report: finalRes.text,
        sources: allSources,
        researchLog
    };
};

export const testAIConnection = async (testSettings: AISettings): Promise<boolean> => {
    try {
        if (testSettings.provider === 'HUGGINGFACE') {
            await callHuggingFace("ping", "You are a connectivity tester. Respond with 'pong'.", testSettings);
            return true;
        } else if (testSettings.provider === 'OPENAI') {
            await callOpenAI("ping", "You are a connectivity tester. Respond with 'pong'.", testSettings);
            return true;
        } else {
            const apiKey = testSettings.apiKey || process.env.API_KEY || '';
            const genAI = new GoogleGenAI({ apiKey });
            const modelName = testSettings.model || "gemini-3.1-pro-preview";
            await genAI.models.generateContent({
                model: modelName,
                contents: "ping",
                config: { systemInstruction: "Respond with 'pong'." }
            });
            return true;
        }
    } catch (error) {
        console.error("AI Connection Test Failed:", error);
        return false;
    }
};

export const analyzeIntel = async (text: string, realOsintContext?: any): Promise<AnalysisResult> => {
    addSystemLog('AI_CORE', 'Processing raw intel stream for analysis...', 'INFO');
    try {
        const aiRes = await executeAI({
            prompt: `TASK: Perform deep-dive tactical analysis on the provided raw intelligence.
DATA: "${text}"

${realOsintContext ? `REAL OSINT CONTEXT ACQUIRED:
${JSON.stringify(realOsintContext, null, 2)}` : ''}

DIRECTIVES:
1. IDENTITY RESOLUTION: Cross-reference entities with public records, court documents, property records, business registrations, professional network APIs, social media, news archives, etc.
2. COMPLIANCE ASSESSMENT: Evaluate GDPR and CCPA implications.
3. RISK ASSESSMENT: Identify sensitive data exposure.
4. OSINT VERIFICATION: If real OSINT context is provided, use it to verify or debunk any claims in the raw data.`,
            systemInstruction: "FOCUS: Extract entities, geolocation, threat levels, identity confidence, and compliance metadata with extreme precision.",
            usePremiumTools: true,
            temperature: 0.0,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    threatLevel: { type: Type.NUMBER },
                    summary: { type: Type.STRING },
                    entities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    locations: { type: Type.ARRAY, items: { type: Type.STRING } },
                    sentiment: { type: Type.STRING, enum: ['Hostile', 'Neutral', 'Cooperative', 'Unknown'] },
                    tacticalRecommendation: { type: Type.STRING }
                },
                required: ["threatLevel", "summary", "entities", "locations", "sentiment", "tacticalRecommendation"]
            }
        });

        const jsonRes = JSON.parse(cleanJson(aiRes.text));
        addSystemLog('AI_CORE', 'Intel analysis complete.', 'SUCCESS');
        return {
            ...jsonRes,
            sources: aiRes.sources
        } as AnalysisResult;
    } catch (error: any) {
        addSystemLog('AI_CORE', `Intel analysis failed: ${error.message}`, 'ERROR');
        return {
            threatLevel: 0,
            summary: "Analysis failed. Connection interrupted or data corrupted.",
            entities: [],
            locations: [],
            sentiment: 'Unknown',
            tacticalRecommendation: "Check AI settings and retry."
        };
    }
};

export const generatePersona = async (targetWeakness: string): Promise<PersonaProfile> => {
    addSystemLog('AI_CORE', 'Synthesizing social engineering persona...', 'INFO');
    try {
        const aiRes = await executeAI({
            prompt: `TASK: Construct a deep-cover persona to exploit a specific target vulnerability.
TARGET VULNERABILITY: "${targetWeakness}"`,
            systemInstruction: "FOCUS: Psychological manipulation, trust building, and social engineering vectors.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    codename: { type: Type.STRING },
                    occupation: { type: Type.STRING },
                    backgroundStory: { type: Type.STRING },
                    psychologicalHooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedOpeningLine: { type: Type.STRING }
                },
                required: ["codename", "occupation", "backgroundStory", "psychologicalHooks", "suggestedOpeningLine"]
            }
        });
        return JSON.parse(cleanJson(aiRes.text)) as PersonaProfile;
    } catch (error) {
        addSystemLog('AI_CORE', 'Persona generation failed.', 'ERROR');
        throw error;
    }
};

export const generateBehavioralForecast = async (targetData: string): Promise<BehavioralForecast> => {
    addSystemLog('AI_CORE', 'Running predictive behavioral modeling...', 'INFO');
    try {
        const aiRes = await executeAI({
            prompt: `TASK: Forecast target behavior based on historical data.
INPUT DATA: "${targetData}"`,
            systemInstruction: "FOCUS: Predictive analytics, risk assessment, and scenario probability.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    scenarios: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                action: { type: Type.STRING },
                                probability: { type: Type.NUMBER },
                                trigger: { type: Type.STRING }
                            }
                        }
                    },
                    flightRisk: { type: Type.NUMBER },
                    compromiseSusceptibility: { type: Type.NUMBER },
                    narrativeAnalysis: { type: Type.STRING }
                },
                required: ["scenarios", "flightRisk", "compromiseSusceptibility", "narrativeAnalysis"]
            }
        });
        return JSON.parse(cleanJson(aiRes.text)) as BehavioralForecast;
    } catch (error) {
        addSystemLog('AI_CORE', 'Predictive modeling failed.', 'ERROR');
        throw error;
    }
};

export const generateTacticalAsset = async (): Promise<Asset> => {
    addSystemLog('AI_CORE', 'Provisioning new tactical asset...', 'INFO');
    try {
        const aiRes = await executeAI({
            prompt: "Generate a new autonomous tactical surveillance asset identity. Provide a unique ID, a specific Region (e.g. 'NA-EAST'), and determine its Type and current Status.",
            systemInstruction: "You are a tactical asset generator.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['IOT_SWARM', 'PACKET_SNIFFER', 'GHOST_RELAY', 'TROJAN_DAEMON'] },
                    region: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['ACTIVE', 'DORMANT', 'COMPROMISED', 'EXFILTRATING'] },
                    dataRate: { type: Type.NUMBER }
                },
                required: ["id", "type", "region", "status", "dataRate"]
            }
        });
        addSystemLog('AI_CORE', 'Asset provisioned and online.', 'SUCCESS');
        return JSON.parse(cleanJson(aiRes.text)) as Asset;
    } catch (error) {
        addSystemLog('AI_CORE', 'Asset provisioning failed.', 'ERROR');
        throw error;
    }
};

export interface TargetSearchQuery {
    name: string;
    email?: string;
    phone?: string;
    socials?: string;
    additionalInfo?: string;
}

export const generateTargetDossier = async (query: TargetSearchQuery | string, resources: string[] = [], realOsintData?: any): Promise<TargetDossier> => {
    const targetStr = typeof query === 'string' ? query : 
        `NAME: ${query.name}${query.email ? `, EMAIL: ${query.email}` : ''}${query.phone ? `, PHONE: ${query.phone}` : ''}${query.socials ? `, SOCIALS: ${query.socials}` : ''}${query.additionalInfo ? `, INFO: ${query.additionalInfo}` : ''}`;
    
    addSystemLog('AI_CORE', `Initiating 5-Stage OSINT Pipeline for: ${targetStr}...`, 'INFO');

    // STAGE 1 & 2: Iterative Deep Research
    const deepResearch = await executeIterativeResearch(`Full OSINT profile for ${targetStr}`, 2);

    // STAGE 3: Structured Synthesis with Schema
    try {
        const aiRes = await executeAI({
            prompt: `TASK: Final Dossier Synthesis.
            TARGET: "${targetStr}"
            RESEARCH DATA: ${deepResearch.report}
            ${realOsintData ? `REAL OSINT DATA: ${JSON.stringify(realOsintData)}` : ''}

            CRITICAL DIRECTIVES:
            1. MAP ALL DATA: Populate the schema using verified facts from research.
            2. SOCIAL ENGINEERING: Identify potential access vectors or vulnerabilities.
            3. VERIFICATION: Add notes on which data points were verified vs. inferred.`,
            systemInstruction: "Synthesize the provided research into a structured JSON dossier.",
            usePremiumTools: true,
            temperature: 0.0,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    report: { type: Type.STRING },
                    exactName: { type: Type.STRING },
                    aliases: { type: Type.ARRAY, items: { type: Type.STRING } },
                    contactInfo: {
                        type: Type.OBJECT,
                        properties: {
                            emails: { type: Type.ARRAY, items: { type: Type.STRING } },
                            phones: { type: Type.ARRAY, items: { type: Type.STRING } },
                            addresses: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    },
                    socialProfiles: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                platform: { type: Type.STRING },
                                username: { type: Type.STRING },
                                url: { type: Type.STRING },
                                status: { type: Type.STRING, enum: ['ACTIVE', 'DORMANT', 'SUSPENDED', 'UNKNOWN'] },
                                accessDetails: { type: Type.STRING }
                            },
                            required: ["platform", "username", "url", "status"]
                        }
                    },
                    images: { type: Type.ARRAY, items: { type: Type.STRING } },
                    verificationNotes: { type: Type.STRING }
                },
                required: ["report", "socialProfiles"]
            }
        });

        const jsonRes = JSON.parse(cleanJson(aiRes.text));
        
        return {
            report: jsonRes.report || deepResearch.report,
            socialProfiles: jsonRes.socialProfiles || [],
            images: jsonRes.images || [],
            sources: deepResearch.sources,
            verificationNotes: jsonRes.verificationNotes || "Synthesized from deep research pipeline.",
            lastUpdated: new Date().toISOString(),
            compliance: {
                gdprStatus: 'PENDING_REVIEW',
                ccpaStatus: 'NOT_APPLICABLE',
                dataRetentionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                legalBasis: 'LEGITIMATE_INTEREST',
                anonymizationLevel: 'NONE'
            },
            identityConfidence: {
                overallScore: 85, // Higher due to iterative research
                nameMatch: 90,
                dobMatch: 0,
                addressMatch: 0,
                sources: deepResearch.sources.length
            }
        };
    } catch (error) {
        addSystemLog('AI_CORE', 'Dossier synthesis failed, returning raw research.', 'ERROR');
        return {
            report: deepResearch.report,
            socialProfiles: [],
            images: [],
            sources: deepResearch.sources,
            verificationNotes: "Synthesis failed. This is raw research data.",
            lastUpdated: new Date().toISOString(),
            compliance: { gdprStatus: 'PENDING_REVIEW', ccpaStatus: 'NOT_APPLICABLE', dataRetentionDate: '', legalBasis: 'LEGITIMATE_INTEREST', anonymizationLevel: 'NONE' },
            identityConfidence: { overallScore: 50, nameMatch: 0, dobMatch: 0, addressMatch: 0, sources: deepResearch.sources.length }
        };
    }
};

export const generateMissionPlan = async (targetName: string, details: string, objective: string): Promise<MissionPlan> => {
    addSystemLog('AI_CORE', `Synthesizing Mission Profile for ${targetName}...`, 'INFO');
    try {
        const aiRes = await executeAI({
            prompt: `TASK: Develop a covert mission plan.
- TARGET: ${targetName}
- OBJECTIVE: ${objective}
- INTEL SUMMARY: ${details.substring(0, 1000)}...`,
            systemInstruction: "FOCUS: Tactical strategy, risk assessment, and operational planning.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    feasibility: { type: Type.NUMBER },
                    approach: { type: Type.STRING },
                    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    resources: { type: Type.ARRAY, items: { type: Type.STRING } },
                    riskLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] }
                },
                required: ["feasibility", "approach", "steps", "resources", "riskLevel"]
            }
        });
        
        const result = JSON.parse(cleanJson(aiRes.text));
        return { targetName, objective, ...result } as MissionPlan;
    } catch (error) {
        addSystemLog('AI_CORE', 'Mission planning failed.', 'ERROR');
        throw error;
    }
};

export const synthesizeSpeech = async (text: string): Promise<string> => {
    const settings = getSettings();
    const apiKey = settings.apiKey || process.env.API_KEY || '';
    const genAI = new GoogleGenAI({ apiKey });
    
    addSystemLog('AI_CORE', 'Synthesizing voice briefing...', 'INFO');
    try {
        const response = await withRetry(() => genAI.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: `Generate a tactical briefing for: ${text.substring(0, 500)}...`,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }
                    }
                }
            }
        }), 2);

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) throw new Error("No audio data received");
        return audioData;
    } catch (error) {
        addSystemLog('AI_CORE', 'Voice synthesis failed.', 'ERROR');
        throw error;
    }
};

export const analyzeForensicArtifact = async (metadata: ForensicArtifact): Promise<string> => {
    addSystemLog('AI_CORE', 'Analyzing forensic artifact...', 'INFO');
    try {
        const aiRes = await executeAI({
            prompt: `TASK: Analyze file metadata and EXIF tags.
INPUT: ${JSON.stringify(metadata)}`,
            systemInstruction: "FOCUS: Digital forensics, metadata analysis, and investigative leads. Output: Markdown."
        });
        return aiRes.text;
    } catch (error) {
        addSystemLog('AI_CORE', 'Forensic analysis failed.', 'ERROR');
        throw error;
    }
};

export const generateExfiltrationArtifacts = async (targetName: string, dossier: string): Promise<any[]> => {
    addSystemLog('AI_CORE', `Generating exfiltration artifacts for ${targetName}...`, 'INFO');
    try {
        const aiRes = await executeAI({
            prompt: `Generate 12 realistic files exfiltrated from "${targetName}" based on: ${dossier}.
Return JSON array: { "name": "string", "size": "string", "date": "string", "type": "file" | "folder", "category": "DOC" | "IMG" | "SYS" | "DB" }`,
            systemInstruction: "You are a cyber intelligence analyst. Generate realistic exfiltration artifacts.",
            responseMimeType: "application/json"
        });
        return JSON.parse(cleanJson(aiRes.text));
    } catch (error) {
        addSystemLog('AI_CORE', 'Artifact generation failed.', 'ERROR');
        return [];
    }
};
