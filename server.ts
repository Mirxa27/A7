/**
 * Agent7 Intelligence Interface — Production Server
 * Fully refactored: modular routes, SSE broadcast, circuit breaker,
 * cache integration, Gemini proxy, secure key handling, typed internals.
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";
import { createServer as createViteServer } from "vite";
import compression from "compression";
import { randomUUID } from "crypto";
import { createServer as createHttpServer } from "http";
import { prisma } from "./lib/prisma.js";
import "dotenv/config";
import dns from "dns";
import { promisify } from "util";
import whois from "whois-json";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import fetch, { type Response as FetchResponse } from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

import {
  apiLimiter,
  osintLimiter,
  aiLimiter,
  securityMiddleware,
  validate,
  validators,
  auditLogger,
} from "./lib/security.js";
import {
  geolocateIP,
  checkEmailBreaches,
  enumerateSubdomains,
  getSSLInfo,
} from "./lib/osintEnhanced.js";
import { CacheService } from "./lib/cache.js";
import { jobQueue } from "./lib/jobQueue.js";
import {
  logger,
  requestLogger,
  logOsintOperation,
  logAIOperation,
} from "./lib/logger.js";
import { exportService } from "./lib/exportService.js";

// ─── Path helpers ─────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── DNS helpers ──────────────────────────────────────────────────────────────
const resolveAny = promisify(dns.resolveAny);
const reverse    = promisify(dns.reverse);
const resolveMx  = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolveNs  = promisify(dns.resolveNs);

// ─── Custom error class ───────────────────────────────────────────────────────
class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ─── Typed request extensions ─────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

// ─── SSE Broadcast Infrastructure ─────────────────────────────────────────────
interface SseClient {
  id: string;
  res: Response;
  connectedAt: Date;
}

const sseClients = new Map<string, SseClient>();

function broadcastEvent(event: string, data: unknown): void {
  if (sseClients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients.values()) {
    try {
      client.res.write(payload);
    } catch {
      sseClients.delete(client.id);
    }
  }
}

// ─── Circuit Breaker ──────────────────────────────────────────────────────────
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly name: string,
    private readonly threshold = 5,
    private readonly resetTimeoutMs = 30_000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed < this.resetTimeoutMs) {
        throw new AppError(503, `Circuit breaker OPEN for ${this.name}`, "CIRCUIT_OPEN");
      }
      this.state = "HALF_OPEN";
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
      logger.warn(`Circuit breaker OPEN for ${this.name}`, { failures: this.failureCount });
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

const breakers = {
  gemini:      new CircuitBreaker("gemini"),
  openai:      new CircuitBreaker("openai"),
  huggingface: new CircuitBreaker("huggingface"),
  whois:       new CircuitBreaker("whois"),
  geolocation: new CircuitBreaker("geolocation"),
};

// ─── Utility: timed fetch with abort ──────────────────────────────────────────
async function timedFetch(
  url: string,
  options: Parameters<typeof fetch>[1] = {},
  timeoutMs = 10_000,
): Promise<FetchResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal as AbortSignal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Utility: async route wrapper (eliminates try/catch boilerplate) ───────────
const asyncRoute =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) =>
    fn(req, res, next).catch(next);

// ─── Admin auth guard ──────────────────────────────────────────────────────────
const requireAdminToken: RequestHandler = (req, res, next) => {
  const token = req.headers["x-admin-token"];
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) {
    return res.status(403).json({ error: "Forbidden", code: "ADMIN_REQUIRED" });
  }
  next();
};

// ─── Request ID middleware ─────────────────────────────────────────────────────
const requestIdMiddleware: RequestHandler = (req, _res, next) => {
  req.requestId = (req.headers["x-request-id"] as string) || randomUUID();
  next();
};

// ══════════════════════════════════════════════════════════════════════════════
// SERVER BOOTSTRAP
// ══════════════════════════════════════════════════════════════════════════════

async function startServer(): Promise<void> {
  const app = express();
  const httpServer = createHttpServer(app);
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // ─── Core middleware ─────────────────────────────────────────────────────────
  app.use(...securityMiddleware);
  app.use(compression());
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(requestLogger);
  app.use("/api", auditLogger);
  app.use("/api/", apiLimiter);
  app.use("/api/osint/", osintLimiter);
  app.use("/api/ai/", aiLimiter);

  // Propagate request ID to all responses
  app.use((req, res, next) => {
    res.setHeader("X-Request-ID", req.requestId);
    next();
  });

  logger.info("Starting Agent7 Intelligence Interface…");

  // ════════════════════════════════════════════════════════════════════════════
  // HEALTH & STATUS
  // ════════════════════════════════════════════════════════════════════════════

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "operational",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "1.0.0",
      environment: process.env.NODE_ENV ?? "development",
    });
  });

  app.get(
    "/api/status",
    asyncRoute(async (_req, res) => {
      const [dbResult, cacheStats] = await Promise.allSettled([
        prisma.intelRecord.count(),
        Promise.resolve(CacheService.getStats()),
      ]);

      const circuitStates = Object.fromEntries(
        Object.entries(breakers).map(([k, v]) => [k, v.getState()]),
      );

      res.json({
        database: dbResult.status === "fulfilled" ? "connected" : "disconnected",
        aiProxy: "ready",
        osintTools: "ready",
        cache: cacheStats.status === "fulfilled" ? cacheStats.value : null,
        circuits: circuitStates,
        jobs: {
          active: jobQueue.getActiveJobs().length,
          total: jobQueue.getAllJobs().length,
        },
        sseClients: sseClients.size,
        timestamp: new Date().toISOString(),
      });
    }),
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SERVER-SENT EVENTS (Real-time broadcast)
  // ════════════════════════════════════════════════════════════════════════════

  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const clientId = randomUUID();
    sseClients.set(clientId, { id: clientId, res, connectedAt: new Date() });

    // Heartbeat to keep connection alive through proxies
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 25_000);

    // Send initial connection acknowledgement
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.delete(clientId);
      logger.debug("SSE client disconnected", { clientId });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS (protected)
  // ════════════════════════════════════════════════════════════════════════════

  app.get("/api/admin/cache/stats", requireAdminToken, (_req, res) => {
    res.json(CacheService.getStats());
  });

  app.post(
    "/api/admin/cache/clear/:type",
    requireAdminToken,
    (req, res) => {
      const { type } = req.params;
      if (type === "osint") {
        CacheService.flushOsint();
        logger.info("OSINT cache cleared");
      }
      res.json({ success: true, message: `Cache '${type}' cleared` });
    },
  );

  app.get("/api/admin/jobs", requireAdminToken, (_req, res) => {
    res.json({
      active: jobQueue.getActiveJobs(),
      all: jobQueue.getAllJobs(),
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // INTEL RECORDS
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/intel",
    asyncRoute(async (req, res) => {
      const {
        type,
        clearance,
        limit = "100",
        search,
        offset = "0",
      } = req.query as Record<string, string>;

      const take = Math.min(parseInt(limit), 500);
      const skip = parseInt(offset);

      const where: Parameters<typeof prisma.intelRecord.findMany>[0]["where"] = {};
      if (type) where.type = type;
      if (clearance) where.clearance = clearance;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { details: { contains: search, mode: "insensitive" } },
          { source: { contains: search, mode: "insensitive" } },
        ];
      }

      const [records, total] = await Promise.all([
        prisma.intelRecord.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          skip,
        }),
        prisma.intelRecord.count({ where }),
      ]);

      res.json({
        records,
        pagination: { total, limit: take, offset: skip, hasMore: total > skip + take },
      });
    }),
  );

  app.get(
    "/api/intel/:id",
    asyncRoute(async (req, res) => {
      const record = await prisma.intelRecord.findUnique({ where: { id: req.params.id } });
      if (!record) throw new AppError(404, "Intel record not found", "NOT_FOUND");
      res.json(record);
    }),
  );

  app.post(
    "/api/intel",
    validate(validators.intelRecord),
    asyncRoute(async (req, res) => {
      const { title, type, date, clearance, details, tags, source } = req.body;
      const record = await prisma.intelRecord.create({
        data: {
          title,
          type,
          date,
          clearance,
          details: details ?? null,
          tags: tags ?? [],
          source: source ?? null,
        },
      });
      logger.info("Intel record created", { id: record.id, type });
      broadcastEvent("intel:created", record);
      res.status(201).json(record);
    }),
  );

  app.patch(
    "/api/intel/:id",
    asyncRoute(async (req, res) => {
      const { title, type, date, clearance, details, tags, source } = req.body;
      const data: Record<string, unknown> = {};
      if (title !== undefined) data.title = title;
      if (type !== undefined) data.type = type;
      if (date !== undefined) data.date = date;
      if (clearance !== undefined) data.clearance = clearance;
      if (details !== undefined) data.details = details;
      if (tags !== undefined) data.tags = tags;
      if (source !== undefined) data.source = source;

      const record = await prisma.intelRecord.update({
        where: { id: req.params.id },
        data,
      });
      logger.info("Intel record updated", { id: req.params.id });
      broadcastEvent("intel:updated", record);
      res.json(record);
    }),
  );

  app.delete(
    "/api/intel/:id",
    asyncRoute(async (req, res) => {
      await prisma.intelRecord.delete({ where: { id: req.params.id } });
      logger.info("Intel record deleted", { id: req.params.id });
      broadcastEvent("intel:deleted", { id: req.params.id });
      res.json({ success: true });
    }),
  );

  // Export intel records
  app.get(
    "/api/intel/export/:format",
    asyncRoute(async (req, res) => {
      const { format } = req.params;
      if (!["json", "csv"].includes(format)) {
        throw new AppError(400, "Unsupported export format. Use 'json' or 'csv'.", "INVALID_FORMAT");
      }
      const records = await prisma.intelRecord.findMany({ orderBy: { createdAt: "desc" } });
      const result = await exportService.export(records, format as "json" | "csv");
      res.setHeader("Content-Disposition", `attachment; filename="intel-export.${format}"`);
      res.setHeader("Content-Type", format === "csv" ? "text/csv" : "application/json");
      res.send(result);
    }),
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ASSETS
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/assets",
    asyncRoute(async (_req, res) => {
      const assets = await prisma.asset.findMany({ orderBy: { createdAt: "desc" } });
      res.json(assets);
    }),
  );

  app.post(
    "/api/assets",
    asyncRoute(async (req, res) => {
      const { type, region, status, dataRate } = req.body;
      const asset = await prisma.asset.create({
        data: { type, region, status: status ?? "ACTIVE", dataRate: dataRate ?? 0 },
      });
      logger.info("Asset created", { id: asset.id, type });
      broadcastEvent("asset:created", asset);
      res.status(201).json(asset);
    }),
  );

  app.patch(
    "/api/assets/:id",
    asyncRoute(async (req, res) => {
      const asset = await prisma.asset.update({
        where: { id: req.params.id },
        data: req.body,
      });
      logger.info("Asset updated", { id: req.params.id });
      broadcastEvent("asset:updated", asset);
      res.json(asset);
    }),
  );

  app.delete(
    "/api/assets/:id",
    asyncRoute(async (req, res) => {
      await prisma.asset.delete({ where: { id: req.params.id } });
      logger.info("Asset deleted", { id: req.params.id });
      broadcastEvent("asset:deleted", { id: req.params.id });
      res.json({ success: true });
    }),
  );

  // ════════════════════════════════════════════════════════════════════════════
  // TARGETS
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/targets",
    asyncRoute(async (_req, res) => {
      const targets = await prisma.target.findMany({ orderBy: { createdAt: "desc" } });
      res.json(targets);
    }),
  );

  app.post(
    "/api/targets",
    asyncRoute(async (req, res) => {
      const { name, status, lastSeen, location, activityLevel, metadata } = req.body;
      const target = await prisma.target.create({
        data: {
          name,
          status: status ?? "TRACKING",
          lastSeen: lastSeen ?? new Date().toISOString(),
          location,
          activityLevel: activityLevel ?? 0,
          metadata,
        },
      });
      logger.info("Target created", { id: target.id, name });
      broadcastEvent("target:created", target);
      res.status(201).json(target);
    }),
  );

  app.patch(
    "/api/targets/:id",
    asyncRoute(async (req, res) => {
      const target = await prisma.target.update({
        where: { id: req.params.id },
        data: req.body,
      });
      logger.info("Target updated", { id: req.params.id });
      broadcastEvent("target:updated", target);
      res.json(target);
    }),
  );

  app.delete(
    "/api/targets/:id",
    asyncRoute(async (req, res) => {
      await prisma.target.delete({ where: { id: req.params.id } });
      logger.info("Target deleted", { id: req.params.id });
      broadcastEvent("target:deleted", { id: req.params.id });
      res.json({ success: true });
    }),
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SYSTEM LOGS
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/logs",
    asyncRoute(async (req, res) => {
      const { source, status, limit = "200" } = req.query as Record<string, string>;
      const where: Record<string, string> = {};
      if (source) where.source = source;
      if (status) where.status = status;

      const logs = await prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(parseInt(limit), 1000),
      });
      res.json(logs);
    }),
  );

  app.post(
    "/api/logs",
    asyncRoute(async (req, res) => {
      const { source, message, status } = req.body;
      const log = await prisma.systemLog.create({
        data: { source: source ?? "SYSTEM", message, status: status ?? "INFO" },
      });
      broadcastEvent("log:created", log);
      res.status(201).json(log);
    }),
  );

  app.delete(
    "/api/logs/clear",
    asyncRoute(async (_req, res) => {
      // Retain the most recent 500 entries
      const keep = await prisma.systemLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
        select: { id: true },
      });
      const keepIds = keep.map((l) => l.id);
      const { count } = await prisma.systemLog.deleteMany({
        where: { id: { notIn: keepIds } },
      });
      logger.info("Old logs cleared", { deleted: count });
      res.json({ success: true, deleted: count });
    }),
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/settings",
    asyncRoute(async (_req, res) => {
      const settings = await prisma.appSettings.upsert({
        where: { id: "default" },
        update: {},
        create: {
          id: "default",
          provider: "GEMINI",
          model: "gemini-2.0-flash",
          systemPrompt: "You are AGENT-7, a high-level cyber intelligence AI.",
          usePremiumTools: true,
          baseUrl: "https://api.openai.com/v1",
        },
      });
      res.json(settings);
    }),
  );

  app.put(
    "/api/settings",
    asyncRoute(async (req, res) => {
      const { id: _omit, ...data } = req.body;
      const settings = await prisma.appSettings.upsert({
        where: { id: "default" },
        update: data,
        create: { id: "default", ...data },
      });
      logger.info("Settings updated");
      res.json(settings);
    }),
  );

  // ════════════════════════════════════════════════════════════════════════════
  // OSINT ENDPOINTS  (all results are cache-aware)
  // ════════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/osint/dns/:domain",
    validate([validators.domain]),
    asyncRoute(async (req, res) => {
      const { domain } = req.params;
      const cacheKey = `osint:dns:${domain}`;
      const cached = CacheService.get<object>(cacheKey);
      if (cached) return res.json(cached);

      const [records, mxRecords, txtRecords, nsRecords] = await Promise.allSettled([
        resolveAny(domain),
        resolveMx(domain),
        resolveTxt(domain),
        resolveNs(domain),
      ]);

      const result: Record<string, unknown> = { domain, timestamp: new Date().toISOString() };
      if (records.status === "fulfilled") result.records = records.value;
      if (mxRecords.status === "fulfilled") result.mx = mxRecords.value;
      if (txtRecords.status === "fulfilled") result.txt = txtRecords.value;
      if (nsRecords.status === "fulfilled") result.ns = nsRecords.value;

      CacheService.set(cacheKey, result, 300); // 5-minute TTL
      logOsintOperation("dns_lookup", domain, true);
      res.json(result);
    }),
  );

  app.get(
    "/api/osint/subdomains/:domain",
    asyncRoute(async (req, res) => {
      const { domain } = req.params;
      const cacheKey = `osint:subdomains:${domain}`;
      const cached = CacheService.get<object>(cacheKey);
      if (cached) return res.json(cached);

      const result = await enumerateSubdomains(domain);
      CacheService.set(cacheKey, result, 600);
      logOsintOperation("subdomain_enum", domain, true, { count: result.count });
      res.json(result);
    }),
  );

  app.get(
    "/api/osint/ssl/:domain",
    asyncRoute(async (req, res) => {
      const { domain } = req.params;
      const cacheKey = `osint:ssl:${domain}`;
      const cached = CacheService.get<object>(cacheKey);
      if (cached) return res.json(cached);

      const result = await getSSLInfo(domain);
      CacheService.set(cacheKey, result, 3600); // 1-hour TTL for cert data
      logOsintOperation("ssl_info", domain, !result.error);
      res.json(result);
    }),
  );

  app.get(
    "/api/osint/reverse/:ip",
    validate([validators.ip]),
    asyncRoute(async (req, res) => {
      const { ip } = req.params;
      const cacheKey = `osint:reverse:${ip}`;
      const cached = CacheService.get<object>(cacheKey);
      if (cached) return res.json(cached);

      const hostnames = await reverse(ip);
      const result = { ip, hostnames, timestamp: new Date().toISOString() };
      CacheService.set(cacheKey, result, 300);
      logOsintOperation("reverse_dns", ip, true);
      res.json(result);
    }),
  );

  app.get(
    "/api/osint/geolocation/:ip",
    validate([validators.ip]),
    asyncRoute(async (req, res) => {
      const { ip } = req.params;
      const cacheKey = `osint:geo:${ip}`;
      const cached = CacheService.get<object>(cacheKey);
      if (cached) return res.json(cached);

      const result = await breakers.geolocation.execute(() => geolocateIP(ip));
      CacheService.set(cacheKey, result, 3600);
      logOsintOperation("ip_geolocation", ip, true);
      res.json(result);
    }),
  );

  app.get(
    "/api/osint/whois/:domain",
    asyncRoute(async (req, res) => {
      const { domain } = req.params;
      const cacheKey = `osint:whois:${domain}`;
      const cached = CacheService.get<object>(cacheKey);
      if (cached) return res.json(cached);

      const data = await breakers.whois.execute(() => whois(domain));
      const result = { domain, timestamp: new Date().toISOString(), data };
      CacheService.set(cacheKey, result, 3600);
      logOsintOperation("whois", domain, true);
      res.json(result);
    }),
  );

  app.get(
    "/api/osint/phone/:phone",
    asyncRoute(async (req, res) => {
      const clean = decodeURIComponent(req.params.phone).replace(/\s+/g, "");
      const parsed = parsePhoneNumberFromString(clean);
      if (!parsed) throw new AppError(400, "Invalid phone number format", "INVALID_PHONE");

      const result = {
        valid: parsed.isValid(),
        possible: parsed.isPossible(),
        type: parsed.getType(),
        country: parsed.country,
        countryCallingCode: parsed.countryCallingCode,
        nationalNumber: parsed.nationalNumber,
        formatInternational: parsed.formatInternational(),
        formatNational: parsed.formatNational(),
        formatE164: parsed.format("E.164"),
        uri: parsed.getURI(),
      };
      logOsintOperation("phone_lookup", clean, true);
      res.json(result);
    }),
  );

  app.get(
    "/api/osint/username/:username",
    validate([validators.username]),
    asyncRoute(async (req, res) => {
      const { username } = req.params;
      const cacheKey = `osint:username:${username}`;
      const cached = CacheService.get<object>(cacheKey);
      if (cached) return res.json(cached);

      const platforms = [
        { name: "GitHub",    url: `https://github.com/${username}` },
        { name: "Twitter",   url: `https://twitter.com/${username}` },
        { name: "Instagram", url: `https://instagram.com/${username}` },
        { name: "Reddit",    url: `https://reddit.com/user/${username}` },
        { name: "LinkedIn",  url: `https://linkedin.com/in/${username}` },
        { name: "TikTok",    url: `https://tiktok.com/@${username}` },
        { name: "YouTube",   url: `https://youtube.com/@${username}` },
      ];

      const results = await Promise.all(
        platforms.map(async (site) => {
          try {
            const r = await timedFetch(site.url, { method: "HEAD" }, 5_000);
            return { platform: site.name, url: site.url, found: r.status === 200 };
          } catch {
            return { platform: site.name, url: site.url, found: false, error: "timeout" };
          }
        }),
      );

      const payload = { username, results, timestamp: new Date().toISOString() };
      CacheService.set(cacheKey, payload, 300);
      logOsintOperation("username_lookup", username, true, {
        found: results.filter((r) => r.found).length,
      });
      res.json(payload);
    }),
  );

  app.get(
    "/api/osint/email/:email",
    validate([validators.email]),
    asyncRoute(async (req, res) => {
      const email = decodeURIComponent(req.params.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AppError(400, "Invalid email address format", "INVALID_EMAIL");
      }

      const domain = email.split("@")[1];
      const cacheKey = `osint:email:${email}`;
      const cached = CacheService.get<object>(cacheKey);
      if (cached) return res.json(cached);

      const [mxResult, breachResult] = await Promise.allSettled([
        resolveMx(domain),
        process.env.HIBP_API_KEY
          ? checkEmailBreaches(email, process.env.HIBP_API_KEY)
          : Promise.resolve(null),
      ]);

      const mxRecords = mxResult.status === "fulfilled" ? mxResult.value : [];
      const breaches = breachResult.status === "fulfilled" ? breachResult.value : null;

      const result = {
        email,
        valid: true,
        domain,
        hasMxRecords: mxRecords.length > 0,
        mxRecords,
        breaches,
        timestamp: new Date().toISOString(),
      };

      CacheService.set(cacheKey, result, 600);
      logOsintOperation("email_lookup", email, true);
      res.json(result);
    }),
  );

  // ════════════════════════════════════════════════════════════════════════════
  // AI PROXY ENDPOINTS
  // API keys resolved from env (preferred) or request body (fallback).
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Gemini proxy — supports both generateContent and streamGenerateContent.
   * API key resolved from GEMINI_API_KEY env; never transmitted in response.
   */
  app.post(
    "/api/ai/gemini",
    asyncRoute(async (req, res) => {
      const startTime = Date.now();
      const { model = "gemini-2.0-flash", payload, apiKey: bodyKey } = req.body;
      const apiKey = process.env.GEMINI_API_KEY ?? bodyKey;

      if (!apiKey) throw new AppError(400, "Gemini API key not configured", "MISSING_KEY");
      if (!payload) throw new AppError(400, "Request payload is required", "MISSING_PAYLOAD");

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await breakers.gemini.execute(() =>
        timedFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );

      const data = await response.json();
      if (!response.ok) {
        logAIOperation("gemini", model, false, Date.now() - startTime);
        return res.status(response.status).json(data);
      }

      logAIOperation("gemini", model, true, Date.now() - startTime);
      res.json(data);
    }),
  );

  /**
   * OpenAI-compatible proxy.
   * API key resolved from OPENAI_API_KEY env; never transmitted in response.
   */
  app.post(
    "/api/ai/openai",
    asyncRoute(async (req, res) => {
      const startTime = Date.now();
      const { baseUrl, payload, apiKey: bodyKey } = req.body;
      const apiKey = process.env.OPENAI_API_KEY ?? bodyKey;

      if (!apiKey) throw new AppError(400, "OpenAI API key not configured", "MISSING_KEY");
      if (!payload) throw new AppError(400, "Request payload is required", "MISSING_PAYLOAD");

      const base = (baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
      const response = await breakers.openai.execute(() =>
        timedFetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      );

      const data = await response.json();
      if (!response.ok) {
        logAIOperation("openai", payload?.model ?? "unknown", false, Date.now() - startTime);
        return res.status(response.status).json(data);
      }

      logAIOperation("openai", payload?.model ?? "unknown", true, Date.now() - startTime);
      res.json(data);
    }),
  );

  /**
   * HuggingFace Inference API proxy.
   * API key resolved from HF_API_KEY env; never transmitted in response.
   */
  app.post(
    "/api/ai/huggingface",
    asyncRoute(async (req, res) => {
      const startTime = Date.now();
      const { endpoint, payload, apiKey: bodyKey } = req.body;
      const apiKey = process.env.HF_API_KEY ?? bodyKey;

      if (!endpoint || !payload) {
        throw new AppError(400, "endpoint and payload are required", "MISSING_PARAMS");
      }
      if (!apiKey) throw new AppError(400, "HuggingFace API key not configured", "MISSING_KEY");

      const response = await breakers.huggingface.execute(() =>
        timedFetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      );

      const ct = response.headers.get("content-type") ?? "";
      const data = ct.includes("application/json")
        ? await response.json()
        : { raw: await response.text() };

      if (!response.ok) {
        logAIOperation("huggingface", payload?.model ?? "unknown", false, Date.now() - startTime);
        return res.status(response.status).json(data);
      }

      logAIOperation("huggingface", payload?.model ?? "unknown", true, Date.now() - startTime);
      res.json(data);
    }),
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MODEL DISCOVERY
  // ════════════════════════════════════════════════════════════════════════════

  app.post(
    "/api/models/gemini",
    asyncRoute(async (req, res) => {
      const apiKey = process.env.GEMINI_API_KEY ?? req.body.apiKey;
      if (!apiKey) throw new AppError(400, "apiKey is required", "MISSING_KEY");

      const r = await timedFetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`,
      );
      const data: any = await r.json();
      if (!r.ok) throw new AppError(r.status, data?.error?.message ?? "Failed to fetch models");

      const models = (data.models ?? [])
        .filter(
          (m: any) =>
            m.supportedGenerationMethods?.includes("generateContent") &&
            !m.name.includes("embedding") &&
            !m.name.includes("aqa"),
        )
        .map((m: any) => ({
          id: m.name.replace("models/", ""),
          name: m.displayName ?? m.name.replace("models/", ""),
          desc: m.description?.split(".")[0] ?? "",
        }));

      res.json(models);
    }),
  );

  app.post(
    "/api/models/openai",
    asyncRoute(async (req, res) => {
      const apiKey = process.env.OPENAI_API_KEY ?? req.body.apiKey;
      const baseUrl = (req.body.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
      if (!apiKey) throw new AppError(400, "apiKey is required", "MISSING_KEY");

      const r = await timedFetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data: any = await r.json();
      if (!r.ok) throw new AppError(r.status, data?.error?.message ?? "Failed to fetch models");

      const KNOWN = ["gpt", "o1", "o3", "claude", "gemini"];
      let models = (data.data ?? [])
        .filter((m: any) => KNOWN.some((k) => m.id.includes(k)))
        .sort((a: any, b: any) => (b.created ?? 0) - (a.created ?? 0))
        .map((m: any) => ({
          id: m.id,
          name: m.id,
          desc: m.created ? `Created ${new Date(m.created * 1000).toLocaleDateString()}` : "",
        }));

      // Custom endpoints may not contain known model identifiers — return all
      if (models.length === 0) {
        models = (data.data ?? []).map((m: any) => ({ id: m.id, name: m.id, desc: "" }));
      }
      res.json(models);
    }),
  );

  app.get(
    "/api/models/huggingface",
    asyncRoute(async (_req, res) => {
      try {
        const r = await timedFetch(
          "https://huggingface.co/api/models?filter=text-generation&inference=warm&sort=downloads&direction=-1&limit=30",
          {},
          8_000,
        );
        if (!r.ok) throw new Error("HuggingFace API error");
        const data: any[] = await r.json();
        res.json(
          data.slice(0, 25).map((m) => ({
            id: m.id,
            name: m.id.includes("/") ? m.id.split("/").pop() : m.id,
            desc: m.downloads ? `${Math.round(m.downloads / 1000)}k downloads` : "",
          })),
        );
      } catch {
        // Curated fallback when HuggingFace API is unreachable
        res.json([
          { id: "meta-llama/Llama-3.1-70B-Instruct",     name: "Llama 3.1 70B",  desc: "Meta – state-of-the-art reasoning" },
          { id: "meta-llama/Meta-Llama-3-8B-Instruct",   name: "Llama 3 8B",     desc: "Meta – fast & efficient" },
          { id: "mistralai/Mistral-7B-Instruct-v0.3",    name: "Mistral 7B v0.3", desc: "Mistral AI" },
          { id: "Qwen/Qwen2.5-72B-Instruct",             name: "Qwen 2.5 72B",   desc: "Alibaba – multilingual" },
          { id: "NousResearch/Hermes-3-Llama-3.1-8B",    name: "Hermes 3 8B",    desc: "Nous Research" },
        ]);
      }
    }),
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 404 CATCH-ALL for /api/*
  // ════════════════════════════════════════════════════════════════════════════

  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // FRONTEND SERVING
  // ════════════════════════════════════════════════════════════════════════════

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GLOBAL ERROR HANDLER
  // ════════════════════════════════════════════════════════════════════════════

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
        requestId: req.requestId,
      });
    }

    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Unhandled error", {
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
      path: req.path,
      method: req.method,
      requestId: req.requestId,
    });

    res.status(500).json({
      error: process.env.NODE_ENV === "production" ? "Internal server error" : message,
      requestId: req.requestId,
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // START LISTENING
  // ════════════════════════════════════════════════════════════════════════════

  httpServer.listen(PORT, "0.0.0.0", () => {
    logger.info("Agent7 Intelligence Interface started", {
      port: PORT,
      environment: process.env.NODE_ENV ?? "development",
      database: "Prisma Accelerate",
    });
    console.log(`✔ Server running at http://localhost:${PORT}`);
  });

  return new Promise<void>((resolve) => {
    httpServer.on("close", resolve);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ══════════════════════════════════════════════════════════════════════════════

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully`);
  try {
    await prisma.$disconnect();
    logger.info("Database connection closed");
  } catch (err) {
    logger.error("Error disconnecting database", { err });
  }
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
startServer().catch((error) => {
  logger.error("Failed to start server", { error: (error as Error).message });
  process.exit(1);
});