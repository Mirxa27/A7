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

const resolveAny = promisify(dns.resolveAny);
const reverse = promisify(dns.reverse);

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate());

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API_REQUEST] ${req.method} ${req.path}`);
    }
    next();
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/intel", async (req, res) => {
    try {
      const records = await prisma.intelRecord.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(records);
    } catch (error) {
      console.error("Error fetching intel records:", error);
      res.status(500).json({ error: "Failed to fetch intel records" });
    }
  });

  app.post("/api/intel", async (req, res) => {
    try {
      const { title, type, date, clearance, details, tags, source } = req.body;
      const record = await prisma.intelRecord.create({
        data: {
          title,
          type,
          date,
          clearance,
          details,
          tags: tags || [],
          source
        }
      });
      res.json(record);
    } catch (error) {
      console.error("Error creating intel record:", error);
      res.status(500).json({ error: "Failed to create intel record" });
    }
  });

  // OSINT Routes
  app.get("/api/osint/dns/:domain", async (req, res) => {
    try {
      const { domain } = req.params;
      const records = await resolveAny(domain);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "DNS lookup failed", details: error });
    }
  });

  app.get("/api/osint/whois/:domain", async (req, res) => {
    try {
      const { domain } = req.params;
      const results = await whois(domain);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "WHOIS lookup failed", details: error });
    }
  });

  app.get("/api/osint/phone/:phone", async (req, res) => {
    try {
      const { phone } = req.params;
      const phoneNumber = parsePhoneNumberFromString(phone);
      if (phoneNumber) {
        res.json({
          valid: phoneNumber.isValid(),
          type: phoneNumber.getType(),
          country: phoneNumber.country,
          formatInternational: phoneNumber.formatInternational(),
          formatNational: phoneNumber.formatNational(),
          uri: phoneNumber.getURI(),
        });
      } else {
        res.status(400).json({ error: "Invalid phone number format" });
      }
    } catch (error) {
      res.status(500).json({ error: "Phone lookup failed" });
    }
  });

  app.get("/api/osint/username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const sites = [
        { name: 'GitHub', url: `https://github.com/${username}` },
        { name: 'Twitter', url: `https://twitter.com/${username}` },
        { name: 'Instagram', url: `https://instagram.com/${username}` },
        { name: 'Reddit', url: `https://reddit.com/user/${username}` },
        { name: 'LinkedIn', url: `https://linkedin.com/in/${username}` },
      ];

      const results = await Promise.all(sites.map(async (site) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch(site.url, { 
            method: 'HEAD', 
            signal: controller.signal as any
          });
          clearTimeout(timeoutId);
          return { name: site.name, url: site.url, exists: response.status === 200 };
        } catch (e) {
          clearTimeout(timeoutId);
          return { name: site.name, url: site.url, exists: false, error: true };
        }
      }));

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Username search failed" });
    }
  });

  app.post("/api/ai/huggingface", async (req, res) => {
    console.log(`[AI_PROXY] Hugging Face request received: ${req.body?.endpoint}`);
    try {
      const { endpoint, payload, apiKey } = req.body;
      if (!endpoint || !payload || !apiKey) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = { error: await response.text() };
      }

      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      res.json(data);
    } catch (error: any) {
      console.error("Hugging Face Proxy Error:", error);
      res.status(500).json({ error: "Failed to connect to Hugging Face", details: error.message });
    }
  });

  app.post("/api/ai/openai", async (req, res) => {
    console.log(`[AI_PROXY] OpenAI request received: ${req.body?.baseUrl}`);
    try {
      const { baseUrl, payload, apiKey } = req.body;
      if (!payload || !apiKey) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = { error: await response.text() };
      }

      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      res.json(data);
    } catch (error: any) {
      console.error("OpenAI Proxy Error:", error);
      res.status(500).json({ error: "Failed to connect to OpenAI", details: error.message });
    }
  });

  // Fallback for unknown API routes to prevent SPA fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
