import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import "dotenv/config";
import dns from "dns";
import { promisify } from "util";
import whois from "whois-json";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveAny = promisify(dns.resolveAny);
const reverse = promisify(dns.reverse);
const resolve4 = promisify(dns.resolve4);
const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolveNs = promisify(dns.resolveNs);

// Initialize Prisma with Accelerate extension
const prisma = process.env.DATABASE_URL?.includes('accelerate')
  ? new PrismaClient({
      accelerateUrl: process.env.DATABASE_URL,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    }).$extends(withAccelerate())
  : new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    
    // Log API requests
    if (req.path.startsWith('/api')) {
      console.log(`[API_REQUEST] ${req.method} ${req.path} - IP: ${req.ip}`);
    }
    next();
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
      error: "Internal server error", 
      message: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  });

  // ============================================
  // HEALTH & STATUS ENDPOINTS
  // ============================================
  
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "operational", 
      timestamp: new Date().toISOString(),
      version: "0.0.1",
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.get("/api/status", async (req, res) => {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        database: "connected",
        aiProxy: "ready",
        osintTools: "ready",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        database: "disconnected",
        aiProxy: "ready",
        osintTools: "ready",
        error: "Database connection failed"
      });
    }
  });

  // ============================================
  // INTEL RECORDS API
  // ============================================
  
  app.get("/api/intel", async (req, res) => {
    try {
      const { type, clearance, limit = '100', search } = req.query;
      
      const where: any = {};
      if (type) where.type = type;
      if (clearance) where.clearance = clearance;
      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { details: { contains: search as string, mode: 'insensitive' } },
          { source: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const records = await prisma.intelRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string)
      });
      
      res.json(records);
    } catch (error) {
      console.error("Error fetching intel records:", error);
      res.status(500).json({ error: "Failed to fetch intel records" });
    }
  });

  app.get("/api/intel/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const record = await prisma.intelRecord.findUnique({
        where: { id }
      });
      
      if (!record) {
        return res.status(404).json({ error: "Intel record not found" });
      }
      
      res.json(record);
    } catch (error) {
      console.error("Error fetching intel record:", error);
      res.status(500).json({ error: "Failed to fetch intel record" });
    }
  });

  app.post("/api/intel", async (req, res) => {
    try {
      const { title, type, date, clearance, details, tags, source } = req.body;
      
      if (!title || !type || !date || !clearance) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const record = await prisma.intelRecord.create({
        data: {
          title,
          type,
          date,
          clearance,
          details: details || null,
          tags: tags || [],
          source: source || null
        }
      });
      
      console.log(`[INTEL] Created record: ${record.id}`);
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating intel record:", error);
      res.status(500).json({ error: "Failed to create intel record" });
    }
  });

  app.patch("/api/intel/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, type, date, clearance, details, tags, source } = req.body;
      
      const record = await prisma.intelRecord.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(type && { type }),
          ...(date && { date }),
          ...(clearance && { clearance }),
          ...(details !== undefined && { details }),
          ...(tags && { tags }),
          ...(source !== undefined && { source })
        }
      });
      
      res.json(record);
    } catch (error) {
      console.error("Error updating intel record:", error);
      res.status(500).json({ error: "Failed to update intel record" });
    }
  });

  app.delete("/api/intel/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.intelRecord.delete({
        where: { id }
      });
      
      res.json({ success: true, message: "Intel record deleted" });
    } catch (error) {
      console.error("Error deleting intel record:", error);
      res.status(500).json({ error: "Failed to delete intel record" });
    }
  });

  // ============================================
  // OSINT ENDPOINTS
  // ============================================

  // Comprehensive DNS lookup
  app.get("/api/osint/dns/:domain", async (req, res) => {
    try {
      const { domain } = req.params;
      
      const [records, mxRecords, txtRecords, nsRecords] = await Promise.allSettled([
        resolveAny(domain),
        resolveMx(domain),
        resolveTxt(domain),
        resolveNs(domain)
      ]);

      const result: any = {
        domain,
        timestamp: new Date().toISOString()
      };

      if (records.status === 'fulfilled') result.records = records.value;
      if (mxRecords.status === 'fulfilled') result.mx = mxRecords.value;
      if (txtRecords.status === 'fulfilled') result.txt = txtRecords.value;
      if (nsRecords.status === 'fulfilled') result.ns = nsRecords.value;

      res.json(result);
    } catch (error: any) {
      console.error("DNS lookup error:", error);
      res.status(500).json({ 
        error: "DNS lookup failed", 
        details: error.message,
        domain: req.params.domain
      });
    }
  });

  // IP to domain reverse lookup
  app.get("/api/osint/reverse/:ip", async (req, res) => {
    try {
      const { ip } = req.params;
      const hostnames = await reverse(ip);
      res.json({ ip, hostnames });
    } catch (error: any) {
      res.status(500).json({ error: "Reverse lookup failed", details: error.message });
    }
  });

  // WHOIS lookup
  app.get("/api/osint/whois/:domain", async (req, res) => {
    try {
      const { domain } = req.params;
      const results = await whois(domain);
      res.json({
        domain,
        timestamp: new Date().toISOString(),
        data: results
      });
    } catch (error: any) {
      console.error("WHOIS lookup error:", error);
      res.status(500).json({ 
        error: "WHOIS lookup failed", 
        details: error.message,
        domain: req.params.domain
      });
    }
  });

  // Phone number validation and formatting
  app.get("/api/osint/phone/:phone", async (req, res) => {
    try {
      const { phone } = req.params;
      const cleanPhone = decodeURIComponent(phone).replace(/\s+/g, '');
      const phoneNumber = parsePhoneNumberFromString(cleanPhone);
      
      if (phoneNumber) {
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
      } else {
        res.status(400).json({ 
          error: "Invalid phone number format",
          input: cleanPhone
        });
      }
    } catch (error: any) {
      console.error("Phone lookup error:", error);
      res.status(500).json({ error: "Phone lookup failed", details: error.message });
    }
  });

  // Username/Handle lookup across platforms
  app.get("/api/osint/username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const platforms = [
        { name: 'GitHub', url: `https://github.com/${username}`, checkUrl: `https://api.github.com/users/${username}` },
        { name: 'Twitter/X', url: `https://twitter.com/${username}` },
        { name: 'Instagram', url: `https://instagram.com/${username}` },
        { name: 'Reddit', url: `https://reddit.com/user/${username}` },
        { name: 'LinkedIn', url: `https://linkedin.com/in/${username}` },
        { name: 'TikTok', url: `https://tiktok.com/@${username}` },
        { name: 'YouTube', url: `https://youtube.com/@${username}` },
        { name: 'Facebook', url: `https://facebook.com/${username}` },
        { name: 'Dev.to', url: `https://dev.to/${username}` },
        { name: 'HackerNews', url: `https://news.ycombinator.com/user?id=${username}` },
      ];

      const results = await Promise.all(platforms.map(async (platform) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        try {
          const response = await fetch(platform.url, { 
            method: 'HEAD',
            redirect: 'manual',
            signal: controller.signal as any
          });
          clearTimeout(timeoutId);
          
          // 200 = page exists, 302/301 with redirect might indicate user exists
          // 404 = user not found
          const exists = response.status === 200 || response.status === 302;
          const statusCode = response.status;
          
          return { 
            name: platform.name, 
            url: platform.url, 
            exists,
            statusCode,
            checkedAt: new Date().toISOString()
          };
        } catch (e: any) {
          clearTimeout(timeoutId);
          return { 
            name: platform.name, 
            url: platform.url, 
            exists: false, 
            error: e.name === 'AbortError' ? 'timeout' : 'request_failed',
            checkedAt: new Date().toISOString()
          };
        }
      }));

      res.json({
        username,
        timestamp: new Date().toISOString(),
        platforms: results,
        summary: {
          found: results.filter(r => r.exists).length,
          total: platforms.length
        }
      });
    } catch (error: any) {
      console.error("Username lookup error:", error);
      res.status(500).json({ error: "Username search failed", details: error.message });
    }
  });

  // Email verification endpoint
  app.get("/api/osint/email/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const decodedEmail = decodeURIComponent(email);
      
      // Basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(decodedEmail);
      
      // Extract domain
      const domain = decodedEmail.split('@')[1];
      
      // Check MX records
      let mxRecords: any[] = [];
      try {
        mxRecords = await resolveMx(domain);
      } catch (e) {
        // Domain might not have MX records
      }

      res.json({
        email: decodedEmail,
        valid: isValid,
        domain,
        hasMxRecords: mxRecords.length > 0,
        mxRecords,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: "Email verification failed", details: error.message });
    }
  });

  // ============================================
  // AI PROXY ENDPOINTS
  // ============================================

  app.post("/api/ai/huggingface", async (req, res) => {
    console.log(`[AI_PROXY] Hugging Face request received`);
    
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
      } else {
        data = { raw: await response.text() };
      }

      if (!response.ok) {
        console.error(`[AI_PROXY] Hugging Face error: ${response.status}`, data);
        return res.status(response.status).json(data);
      }
      
      res.json(data);
    } catch (error: any) {
      console.error("[AI_PROXY] Hugging Face Proxy Error:", error);
      res.status(500).json({ 
        error: "Failed to connect to Hugging Face", 
        details: error.message 
      });
    }
  });

  app.post("/api/ai/openai", async (req, res) => {
    console.log(`[AI_PROXY] OpenAI request received`);
    
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
      } else {
        data = { raw: await response.text() };
      }

      if (!response.ok) {
        console.error(`[AI_PROXY] OpenAI error: ${response.status}`, data);
        return res.status(response.status).json(data);
      }
      
      res.json(data);
    } catch (error: any) {
      console.error("[AI_PROXY] OpenAI Proxy Error:", error);
      res.status(500).json({ 
        error: "Failed to connect to OpenAI", 
        details: error.message 
      });
    }
  });

  app.post("/api/ai/gemini", async (req, res) => {
    console.log(`[AI_PROXY] Gemini request received`);
    
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
        console.error(`[AI_PROXY] Gemini error: ${response.status}`, data);
        return res.status(response.status).json(data);
      }
      
      res.json(data);
    } catch (error: any) {
      console.error("[AI_PROXY] Gemini Proxy Error:", error);
      res.status(500).json({ 
        error: "Failed to connect to Gemini", 
        details: error.message 
      });
    }
  });

  // ============================================
  // STATIC FILES & SPA FALLBACK
  // ============================================

  // Fallback for unknown API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ 
      error: `API route not found: ${req.method} ${req.path}`,
      available: [
        'GET /api/health',
        'GET /api/status',
        'GET/POST /api/intel',
        'GET /api/osint/dns/:domain',
        'GET /api/osint/whois/:domain',
        'GET /api/osint/phone/:phone',
        'GET /api/osint/username/:username',
        'GET /api/osint/email/:email',
        'POST /api/ai/huggingface',
        'POST /api/ai/openai',
        'POST /api/ai/gemini'
      ]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { host: '0.0.0.0' }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    
    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  // Start server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║         AGENT7 INTELLIGENCE INTERFACE - ONLINE             ║
╠════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                            ║
║  Environment: ${process.env.NODE_ENV || 'development'}                            ║
║  Database: ${process.env.DATABASE_URL?.includes('accelerate') ? 'Prisma Accelerate' : 'Direct'}                    ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
