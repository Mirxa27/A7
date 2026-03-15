import express from "express";
import { createServer as createViteServer } from "vite";
import { supabase } from "./lib/supabase.js";
import "dotenv/config";
import dns from "dns";
import { promisify } from "util";
import whois from "whois-json";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { apiLimiter, osintLimiter, aiLimiter, securityMiddleware, validate, validators, auditLogger } from "./lib/security.js";
import { geolocateIP, searchUsernameEnhanced, checkEmailBreaches, enumerateSubdomains, getSSLInfo } from "./lib/osintEnhanced.js";
import { CacheService } from "./lib/cache.js";
import { jobQueue } from "./lib/jobQueue.js";
import { logger, requestLogger, logOsintOperation, logAIOperation } from "./lib/logger.js";
import { exportService } from "./lib/exportService.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resolveAny = promisify(dns.resolveAny);
const reverse = promisify(dns.reverse);
const resolve4 = promisify(dns.resolve4);
const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolveNs = promisify(dns.resolveNs);
async function startServer() {
    const app = express();
    const PORT = process.env.PORT || 3000;
    app.use(...securityMiddleware);
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(requestLogger);
    app.use('/api', auditLogger);
    app.use('/api/', apiLimiter);
    app.use('/api/osint/', osintLimiter);
    app.use('/api/ai/', aiLimiter);
    logger.info('Starting Agent7 Intelligence Interface...');
    // ============================================
    // HEALTH & STATUS ENDPOINTS
    // ============================================
    app.get("/api/health", (req, res) => {
        res.json({
            status: "operational",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
            environment: process.env.NODE_ENV || 'development'
        });
    });
    app.get("/api/status", async (req, res) => {
        try {
            const { error: dbError } = await supabase.from('intel_records').select('count').limit(1);
            const cacheStats = CacheService.getStats();
            res.json({
                database: dbError ? "disconnected" : "connected",
                aiProxy: "ready",
                osintTools: "ready",
                cache: cacheStats,
                jobs: {
                    active: jobQueue.getActiveJobs().length,
                    total: jobQueue.getAllJobs().length
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger.error('Status check failed', { error });
            res.status(500).json({
                database: "disconnected",
                aiProxy: "ready",
                osintTools: "ready",
                error: "Database connection failed"
            });
        }
    });
    // ============================================
    // CACHE MANAGEMENT
    // ============================================
    app.get("/api/admin/cache/stats", (req, res) => {
        res.json(CacheService.getStats());
    });
    app.post("/api/admin/cache/clear/:type", (req, res) => {
        const { type } = req.params;
        if (type === 'osint') {
            CacheService.flushOsint();
            logger.info('OSINT cache cleared');
        }
        else if (type === 'ai') {
            logger.info('AI cache cleared');
        }
        res.json({ success: true, message: `Cache ${type} cleared` });
    });
    // ============================================
    // INTEL RECORDS API
    // ============================================
    app.get("/api/intel", async (req, res) => {
        try {
            const { type, clearance, limit = '100', search, offset = '0' } = req.query;
            let query = supabase.from('intel_records').select('*', { count: 'exact' });
            if (type)
                query = query.eq('type', type);
            if (clearance)
                query = query.eq('clearance', clearance);
            if (search) {
                query = query.or(`title.ilike.%${search}%,details.ilike.%${search}%,source.ilike.%${search}%`);
            }
            query = query
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
            const { data: records, count, error } = await query;
            if (error)
                throw error;
            res.json({
                records: records || [],
                pagination: {
                    total: count || 0,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: (count || 0) > (parseInt(offset) + parseInt(limit))
                }
            });
        }
        catch (error) {
            logger.error('Error fetching intel records', { error });
            res.status(500).json({ error: "Failed to fetch intel records" });
        }
    });
    app.get("/api/intel/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const { data: record, error } = await supabase
                .from('intel_records')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error)
                throw error;
            if (!record) {
                return res.status(404).json({ error: "Intel record not found" });
            }
            res.json(record);
        }
        catch (error) {
            logger.error('Error fetching intel record', { error, id: req.params.id });
            res.status(500).json({ error: "Failed to fetch intel record" });
        }
    });
    app.post("/api/intel", validate(validators.intelRecord), async (req, res) => {
        try {
            const { title, type, date, clearance, details, tags, source } = req.body;
            const { data: record, error } = await supabase
                .from('intel_records')
                .insert({
                title,
                type,
                date,
                clearance,
                details: details || null,
                tags: tags || [],
                source: source || null
            })
                .select()
                .single();
            if (error)
                throw error;
            logger.info('Intel record created', { id: record.id, title, type });
            res.status(201).json(record);
        }
        catch (error) {
            logger.error('Error creating intel record', { error });
            res.status(500).json({ error: "Failed to create intel record" });
        }
    });
    app.patch("/api/intel/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const { title, type, date, clearance, details, tags, source } = req.body;
            const updateData = {};
            if (title)
                updateData.title = title;
            if (type)
                updateData.type = type;
            if (date)
                updateData.date = date;
            if (clearance)
                updateData.clearance = clearance;
            if (details !== undefined)
                updateData.details = details;
            if (tags)
                updateData.tags = tags;
            if (source !== undefined)
                updateData.source = source;
            const { data: record, error } = await supabase
                .from('intel_records')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            logger.info('Intel record updated', { id });
            res.json(record);
        }
        catch (error) {
            logger.error('Error updating intel record', { error, id: req.params.id });
            res.status(500).json({ error: "Failed to update intel record" });
        }
    });
    app.delete("/api/intel/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabase
                .from('intel_records')
                .delete()
                .eq('id', id);
            if (error)
                throw error;
            logger.info('Intel record deleted', { id });
            res.json({ success: true, message: "Intel record deleted" });
        }
        catch (error) {
            logger.error('Error deleting intel record', { error, id: req.params.id });
            res.status(500).json({ error: "Failed to delete intel record" });
        }
    });
    // ============================================
    // OSINT ENDPOINTS
    // ============================================
    app.get("/api/osint/dns/:domain", validate([validators.domain]), async (req, res) => {
        try {
            const { domain } = req.params;
            const [records, mxRecords, txtRecords, nsRecords] = await Promise.allSettled([
                resolveAny(domain),
                resolveMx(domain),
                resolveTxt(domain),
                resolveNs(domain)
            ]);
            const result = {
                domain,
                timestamp: new Date().toISOString()
            };
            if (records.status === 'fulfilled')
                result.records = records.value;
            if (mxRecords.status === 'fulfilled')
                result.mx = mxRecords.value;
            if (txtRecords.status === 'fulfilled')
                result.txt = txtRecords.value;
            if (nsRecords.status === 'fulfilled')
                result.ns = nsRecords.value;
            logOsintOperation('dns_lookup', domain, true);
            res.json(result);
        }
        catch (error) {
            logOsintOperation('dns_lookup', req.params.domain, false, { error: error.message });
            res.status(500).json({
                error: "DNS lookup failed",
                details: error.message,
                domain: req.params.domain
            });
        }
    });
    app.get("/api/osint/subdomains/:domain", async (req, res) => {
        try {
            const { domain } = req.params;
            const result = await enumerateSubdomains(domain);
            logOsintOperation('subdomain_enum', domain, true, { count: result.count });
            res.json(result);
        }
        catch (error) {
            logOsintOperation('subdomain_enum', req.params.domain, false, { error: error.message });
            res.status(500).json({ error: "Subdomain enumeration failed", details: error.message });
        }
    });
    app.get("/api/osint/ssl/:domain", async (req, res) => {
        try {
            const { domain } = req.params;
            const result = await getSSLInfo(domain);
            logOsintOperation('ssl_info', domain, !result.error);
            res.json(result);
        }
        catch (error) {
            logOsintOperation('ssl_info', req.params.domain, false, { error: error.message });
            res.status(500).json({ error: "SSL info lookup failed", details: error.message });
        }
    });
    app.get("/api/osint/reverse/:ip", validate([validators.ip]), async (req, res) => {
        try {
            const { ip } = req.params;
            const hostnames = await reverse(ip);
            logOsintOperation('reverse_dns', ip, true);
            res.json({ ip, hostnames, timestamp: new Date().toISOString() });
        }
        catch (error) {
            logOsintOperation('reverse_dns', req.params.ip, false, { error: error.message });
            res.status(500).json({ error: "Reverse lookup failed", details: error.message });
        }
    });
    app.get("/api/osint/geolocation/:ip", validate([validators.ip]), async (req, res) => {
        try {
            const { ip } = req.params;
            const result = await geolocateIP(ip);
            logOsintOperation('ip_geolocation', ip, true);
            res.json(result);
        }
        catch (error) {
            logOsintOperation('ip_geolocation', req.params.ip, false, { error: error.message });
            res.status(500).json({ error: "IP geolocation failed", details: error.message });
        }
    });
    app.get("/api/osint/whois/:domain", async (req, res) => {
        try {
            const { domain } = req.params;
            const results = await whois(domain);
            logOsintOperation('whois', domain, true);
            res.json({
                domain,
                timestamp: new Date().toISOString(),
                data: results
            });
        }
        catch (error) {
            logOsintOperation('whois', req.params.domain, false, { error: error.message });
            res.status(500).json({
                error: "WHOIS lookup failed",
                details: error.message,
                domain: req.params.domain
            });
        }
    });
    app.get("/api/osint/phone/:phone", async (req, res) => {
        try {
            const { phone } = req.params;
            const cleanPhone = decodeURIComponent(phone).replace(/\s+/g, '');
            const phoneNumber = parsePhoneNumberFromString(cleanPhone);
            if (phoneNumber) {
                logOsintOperation('phone_lookup', cleanPhone, true);
                res.json({
                    valid: phoneNumber.isValid(),
                    possible: phoneNumber.isPossible(),
                    type: phoneNumber.getType(),
                    country: phoneNumber.country,
                    countryCallingCode: phoneNumber.countryCallingCode,
                    nationalNumber: phoneNumber.nationalNumber,
                    formatInternational: phoneNumber.formatInternational(),
                    formatNational: phoneNumber.formatNational(),
                    formatE164: phoneNumber.format('E.164'),
                    uri: phoneNumber.getURI(),
                });
            }
            else {
                res.status(400).json({
                    error: "Invalid phone number format",
                    input: cleanPhone
                });
            }
        }
        catch (error) {
            logOsintOperation('phone_lookup', req.params.phone, false, { error: error.message });
            res.status(500).json({ error: "Phone lookup failed", details: error.message });
        }
    });
    app.get("/api/osint/username/:username", validate([validators.username]), async (req, res) => {
        try {
            const { username } = req.params;
            const result = await searchUsernameEnhanced(username);
            logOsintOperation('username_search', username, true, {
                found: result.summary.found,
                total: result.summary.total
            });
            res.json(result);
        }
        catch (error) {
            logOsintOperation('username_search', req.params.username, false, { error: error.message });
            res.status(500).json({ error: "Username search failed", details: error.message });
        }
    });
    app.get("/api/osint/email/:email", validate([validators.email]), async (req, res) => {
        try {
            const { email } = req.params;
            const decodedEmail = decodeURIComponent(email);
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isValid = emailRegex.test(decodedEmail);
            const domain = decodedEmail.split('@')[1];
            let mxRecords = [];
            try {
                mxRecords = await resolveMx(domain);
            }
            catch (e) {
                // Domain might not have MX records
            }
            let breachData = null;
            if (process.env.HIBP_API_KEY) {
                breachData = await checkEmailBreaches(decodedEmail, process.env.HIBP_API_KEY);
            }
            logOsintOperation('email_lookup', decodedEmail, true);
            res.json({
                email: decodedEmail,
                valid: isValid,
                domain,
                hasMxRecords: mxRecords.length > 0,
                mxRecords,
                breaches: breachData,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logOsintOperation('email_lookup', req.params.email, false, { error: error.message });
            res.status(500).json({ error: "Email verification failed", details: error.message });
        }
    });
    // ============================================
    // AI PROXY ENDPOINTS
    // ============================================
    app.post("/api/ai/huggingface", async (req, res) => {
        const startTime = Date.now();
        try {
            const { endpoint, payload, apiKey } = req.body;
            if (!endpoint || !payload || !apiKey) {
                return res.status(400).json({
                    error: "Missing required parameters",
                    required: ['endpoint', 'payload', 'apiKey']
                });
            }
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            const contentType = response.headers.get("content-type");
            let data;
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            }
            else {
                data = { raw: await response.text() };
            }
            if (!response.ok) {
                logAIOperation('huggingface', req.body?.model || 'unknown', false, Date.now() - startTime);
                return res.status(response.status).json(data);
            }
            logAIOperation('huggingface', req.body?.model || 'unknown', true, Date.now() - startTime);
            res.json(data);
        }
        catch (error) {
            logAIOperation('huggingface', req.body?.model || 'unknown', false, Date.now() - startTime);
            logger.error('Hugging Face Proxy Error', { error: error.message });
            res.status(500).json({
                error: "Failed to connect to Hugging Face",
                details: error.message
            });
        }
    });
    app.post("/api/ai/openai", async (req, res) => {
        const startTime = Date.now();
        try {
            const { baseUrl, payload, apiKey } = req.body;
            if (!payload || !apiKey) {
                return res.status(400).json({
                    error: "Missing required parameters",
                    required: ['payload', 'apiKey']
                });
            }
            const url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            const contentType = response.headers.get("content-type");
            let data;
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            }
            else {
                data = { raw: await response.text() };
            }
            if (!response.ok) {
                logAIOperation('openai', payload?.model || 'unknown', false, Date.now() - startTime);
                return res.status(response.status).json(data);
            }
            logAIOperation('openai', payload?.model || 'unknown', true, Date.now() - startTime);
            res.json(data);
        }
        catch (error) {
            logAIOperation('openai', req.body?.payload?.model || 'unknown', false, Date.now() - startTime);
            logger.error('OpenAI Proxy Error', { error: error.message });
            res.status(500).json({
                error: "Failed to connect to OpenAI",
                details: error.message
            });
        }
    });
    app.post("/api/ai/gemini", async (req, res) => {
        const startTime = Date.now();
        try {
            const { model, contents, config, apiKey } = req.body;
            if (!contents || !apiKey) {
                return res.status(400).json({
                    error: "Missing required parameters",
                    required: ['contents', 'apiKey']
                });
            }
            const modelName = model || 'gemini-2.0-flash';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents,
                    ...(config && { generationConfig: config })
                })
            });
            const data = await response.json();
            if (!response.ok) {
                logAIOperation('gemini', modelName, false, Date.now() - startTime);
                return res.status(response.status).json(data);
            }
            logAIOperation('gemini', modelName, true, Date.now() - startTime);
            res.json(data);
        }
        catch (error) {
            logAIOperation('gemini', req.body?.model || 'unknown', false, Date.now() - startTime);
            logger.error('Gemini Proxy Error', { error: error.message });
            res.status(500).json({
                error: "Failed to connect to Gemini",
                details: error.message
            });
        }
    });
    // ============================================
    // JOB QUEUE API
    // ============================================
    app.post("/api/jobs", (req, res) => {
        const { type, data } = req.body;
        if (!type || !data) {
            return res.status(400).json({ error: "Missing type or data" });
        }
        const jobId = jobQueue.addJob(type, data);
        logger.info('Job created', { jobId, type });
        res.status(201).json({
            jobId,
            status: 'pending',
            message: 'Job queued successfully'
        });
    });
    app.get("/api/jobs", (req, res) => {
        const jobs = jobQueue.getAllJobs();
        res.json(jobs);
    });
    app.get("/api/jobs/active", (req, res) => {
        const jobs = jobQueue.getActiveJobs();
        res.json(jobs);
    });
    app.get("/api/jobs/:id", (req, res) => {
        const { id } = req.params;
        const job = jobQueue.getJob(id);
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }
        res.json(job);
    });
    app.delete("/api/jobs/:id", (req, res) => {
        const { id } = req.params;
        const cancelled = jobQueue.cancelJob(id);
        if (cancelled) {
            logger.info('Job cancelled', { jobId: id });
            res.json({ success: true, message: "Job cancelled" });
        }
        else {
            res.status(400).json({ error: "Job cannot be cancelled (may already be running or completed)" });
        }
    });
    // ============================================
    // EXPORT API
    // ============================================
    app.post("/api/export/dossier", async (req, res) => {
        try {
            const { data, format = 'pdf', classification = 'CONFIDENTIAL' } = req.body;
            if (!data) {
                return res.status(400).json({ error: "Missing dossier data" });
            }
            let filepath;
            switch (format) {
                case 'pdf':
                    filepath = await exportService.generatePDFDossier(data, { format, classification });
                    break;
                case 'json':
                    filepath = await exportService.generateJSON(data, { format, classification });
                    break;
                default:
                    return res.status(400).json({ error: "Invalid format. Use 'pdf' or 'json'" });
            }
            const info = exportService.getExportInfo(filepath);
            logger.info('Dossier exported', { format, filename: info?.filename });
            res.json({
                success: true,
                downloadUrl: `/api/export/download/${path.basename(filepath)}`,
                info
            });
        }
        catch (error) {
            logger.error('Export failed', { error: error.message });
            res.status(500).json({ error: "Export failed", details: error.message });
        }
    });
    app.post("/api/export/mission", async (req, res) => {
        try {
            const { data, classification = 'TOP SECRET' } = req.body;
            if (!data) {
                return res.status(400).json({ error: "Missing mission data" });
            }
            const filepath = await exportService.generatePDFMission(data, { format: 'pdf', classification });
            const info = exportService.getExportInfo(filepath);
            logger.info('Mission exported', { filename: info?.filename });
            res.json({
                success: true,
                downloadUrl: `/api/export/download/${path.basename(filepath)}`,
                info
            });
        }
        catch (error) {
            logger.error('Mission export failed', { error: error.message });
            res.status(500).json({ error: "Export failed", details: error.message });
        }
    });
    app.get("/api/export/download/:filename", (req, res) => {
        const { filename } = req.params;
        const filepath = path.join(process.cwd(), 'exports', filename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: "File not found" });
        }
        res.download(filepath);
    });
    app.get("/api/exports", (req, res) => {
        const exports = exportService.listExports();
        res.json(exports);
    });
    app.delete("/api/admin/exports/cleanup", (req, res) => {
        const { hours = 24 } = req.query;
        const deleted = exportService.cleanupOldExports(parseInt(hours));
        logger.info('Export cleanup completed', { deleted });
        res.json({ success: true, deleted });
    });
    // ============================================
    // STATIC FILES & SPA FALLBACK
    // ============================================
    app.use('/api', (req, res) => {
        res.status(404).json({
            error: `API route not found: ${req.method} ${req.path}`,
            available: [
                'GET /api/health',
                'GET /api/status',
                'GET /api/admin/cache/stats',
                'POST /api/admin/cache/clear/:type',
                'GET/POST /api/intel',
                'GET /api/intel/:id',
                'PATCH /api/intel/:id',
                'DELETE /api/intel/:id',
                'GET /api/osint/dns/:domain',
                'GET /api/osint/subdomains/:domain',
                'GET /api/osint/ssl/:domain',
                'GET /api/osint/whois/:domain',
                'GET /api/osint/phone/:phone',
                'GET /api/osint/username/:username',
                'GET /api/osint/email/:email',
                'GET /api/osint/geolocation/:ip',
                'GET /api/osint/reverse/:ip',
                'POST /api/jobs',
                'GET /api/jobs',
                'GET /api/jobs/:id',
                'DELETE /api/jobs/:id',
                'POST /api/export/dossier',
                'POST /api/export/mission',
                'GET /api/exports',
                'POST /api/ai/huggingface',
                'POST /api/ai/openai',
                'POST /api/ai/gemini'
            ]
        });
    });
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: {
                middlewareMode: true,
                hmr: { host: '0.0.0.0' }
            },
            appType: "spa",
        });
        app.use(vite.middlewares);
    }
    else {
        app.use(express.static(path.join(__dirname, 'dist')));
        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        });
    }
    app.use((err, req, res, next) => {
        logger.error('Unhandled error', {
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method
        });
        res.status(err.status || 500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : err.message
        });
    });
    app.listen(PORT, "0.0.0.0", () => {
        logger.info(`Agent7 Intelligence Interface started`, {
            port: PORT,
            environment: process.env.NODE_ENV || 'development',
            database: 'Supabase'
        });
        console.log(`
╔════════════════════════════════════════════════════════════╗
║         AGENT7 INTELLIGENCE INTERFACE v1.0.0               ║
╠════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                            ║
║  Environment: ${process.env.NODE_ENV || 'development'}                            ║
║  Database: Supabase                                        ║
║  Cache: Enabled                                            ║
║  Rate Limiting: Enabled                                    ║
║  Security: Enabled                                         ║
╚════════════════════════════════════════════════════════════╝
    `);
    });
}
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason });
});
startServer().catch((error) => {
    logger.error('Failed to start server', { error: error.message });
    console.error("Failed to start server:", error);
    process.exit(1);
});
