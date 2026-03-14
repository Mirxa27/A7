# Agent7 Intelligence Interface v1.0.0

A comprehensive OSINT (Open Source Intelligence) platform with AI-powered analysis capabilities. Built with React, TypeScript, Express, and Prisma.

![Agent7 Interface](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## What's New in v1.0.0

### 🛡️ Security Enhancements
- **Rate Limiting**: Configurable limits for API, OSINT, and AI endpoints
- **Helmet Security Headers**: CSP, HSTS, X-Frame-Options, and more
- **Input Validation**: Express-validator for all endpoints
- **Input Sanitization**: Automatic XSS protection
- **Audit Logging**: Complete request and security event logging
- **CORS Configuration**: Production-ready CORS policies

### 🚀 Performance Improvements
- **Intelligent Caching**: Node-cache for OSINT and AI responses
- **Cache Statistics**: Real-time cache performance monitoring
- **Background Jobs**: Async job queue for long-running operations
- **Job Progress Tracking**: Real-time progress updates

### 🔍 Enhanced OSINT Tools
- **IP Geolocation**: Free IP-to-location service
- **Enhanced Username Search**: 25+ platforms (social, dev, professional)
- **Email Breach Check**: Have I Been Pwned integration
- **Subdomain Enumeration**: Certificate Transparency log search
- **SSL Certificate Info**: SSL Labs API integration
- **Comprehensive DNS**: A, MX, TXT, NS record lookup

### 📄 Export & Reporting
- **PDF Dossier Generation**: Professional intelligence reports
- **Mission Operation Orders**: Tactical PDF exports
- **JSON Export**: Structured data exports
- **CSV Export**: Spreadsheet-compatible outputs
- **Classification Levels**: TOP SECRET, SECRET, CONFIDENTIAL handling

### 📝 Logging & Monitoring
- **Winston Logger**: Structured logging with rotation
- **Request Logging**: All API requests logged
- **Security Event Logging**: Failed auth, rate limits, etc.
- **Audit Trails**: Sensitive operation tracking
- **Log Files**: Separate error, combined, and API request logs

### 🔧 Developer Experience
- **TypeScript**: Full type safety
- **API Documentation**: Comprehensive endpoint listing
- **Job Queue API**: Async task management
- **Cache Management**: Admin endpoints for cache control
- **Health Checks**: System status monitoring

## Features

### OSINT Capabilities
- **DNS Intelligence**: Multi-record type DNS lookups
- **Domain Intelligence**: WHOIS, subdomains, SSL certificates
- **IP Intelligence**: Geolocation, reverse DNS
- **Phone Intelligence**: International validation, carrier info
- **Email Intelligence**: Validation, MX records, breach checking
- **Username Intelligence**: Cross-platform presence detection

### AI Integration
- **Multi-Provider Support**: Google Gemini, OpenAI, HuggingFace
- **Proxy Architecture**: Secure API key handling
- **Rate Limiting**: Prevent abuse and manage costs
- **Response Caching**: Reduce API calls and latency

### Tactical Dashboard
- Real-time operation monitoring
- Asset tracking and management
- Surveillance grid visualization
- Network topology mapping
- Threat level indicators
- Audio feedback system

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Recharts
- **Backend**: Express.js 5.x, Node.js 18+
- **Database**: PostgreSQL (via Prisma Accelerate)
- **Security**: Helmet, express-rate-limit, express-validator
- **Caching**: node-cache
- **Logging**: Winston
- **PDF Generation**: PDFKit
- **Build Tool**: Vite

## Quick Start

### Prerequisites
- Node.js 18+
- Git
- API keys for AI services (optional but recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mirxa27/A7.git
   cd A7
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the interface**
   Navigate to `http://localhost:3000`

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma Accelerate connection string |

### Optional (for enhanced features)
| Variable | Description | Feature |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | AI Analysis |
| `OPENAI_API_KEY` | OpenAI API key | AI Analysis |
| `HUGGINGFACE_API_KEY` | HuggingFace API key | AI Analysis |
| `HIBP_API_KEY` | Have I Been Pwned API key | Email Breach Check |
| `LOG_LEVEL` | debug, info, warn, error | Logging |
| `SESSION_SECRET` | Random string for sessions | Security |

## API Endpoints

### Health & Status
- `GET /api/health` - Health check
- `GET /api/status` - System status with cache stats

### Admin
- `GET /api/admin/cache/stats` - Cache statistics
- `POST /api/admin/cache/clear/:type` - Clear cache (osint/ai)
- `DELETE /api/admin/exports/cleanup` - Clean old exports

### Intel Records
- `GET /api/intel` - List records with pagination
- `GET /api/intel/:id` - Get specific record
- `POST /api/intel` - Create new record
- `PATCH /api/intel/:id` - Update record
- `DELETE /api/intel/:id` - Delete record

### OSINT Tools
- `GET /api/osint/dns/:domain` - DNS lookup
- `GET /api/osint/subdomains/:domain` - Subdomain enumeration
- `GET /api/osint/ssl/:domain` - SSL certificate info
- `GET /api/osint/whois/:domain` - WHOIS lookup
- `GET /api/osint/phone/:phone` - Phone validation
- `GET /api/osint/username/:username` - Username search (25+ platforms)
- `GET /api/osint/email/:email` - Email verification & breach check
- `GET /api/osint/geolocation/:ip` - IP geolocation
- `GET /api/osint/reverse/:ip` - Reverse DNS lookup

### Job Queue
- `POST /api/jobs` - Create new job
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/active` - List active jobs
- `GET /api/jobs/:id` - Get job status
- `DELETE /api/jobs/:id` - Cancel job

### Export
- `POST /api/export/dossier` - Export dossier (PDF/JSON)
- `POST /api/export/mission` - Export mission (PDF)
- `GET /api/exports` - List exports
- `GET /api/export/download/:filename` - Download file

### AI Proxy
- `POST /api/ai/huggingface` - HuggingFace API proxy
- `POST /api/ai/openai` - OpenAI API proxy
- `POST /api/ai/gemini` - Gemini API proxy

## Scripts

```bash
# Development
npm run dev              # Start development server

# Production
npm run build           # Build for production
npm start               # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:studio       # Open Prisma Studio

# Maintenance
npm run export:cleanup  # Clean old exports (>1 hour)
npm run lint            # Type check with TypeScript
```

## Project Structure

```
A7/
├── .github/workflows/    # CI/CD configuration
├── components/           # React components
├── context/             # React context providers
├── lib/                 # Backend libraries
│   ├── cache.ts         # Caching service
│   ├── exportService.ts # PDF/JSON export
│   ├── jobQueue.ts      # Background jobs
│   ├── logger.ts        # Winston logging
│   ├── osintEnhanced.ts # Enhanced OSINT tools
│   ├── prisma.ts        # Prisma client
│   └── security.ts      # Security middleware
├── prisma/
│   └── schema.prisma    # Database schema
├── logs/                # Log files (created at runtime)
├── exports/             # Export files (created at runtime)
├── server.ts            # Express server
├── App.tsx              # Main app component
├── types.ts             # TypeScript definitions
└── ...
```

## Security Features

- **Rate Limiting**: 100 req/15min (general), 30 req/min (OSINT), 20 req/min (AI)
- **Helmet**: Security headers including CSP
- **Input Validation**: All user inputs validated
- **Input Sanitization**: XSS protection
- **CORS**: Configurable origin whitelist
- **Audit Logging**: All sensitive operations logged
- **API Key Security**: Keys stored server-side only

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/*` | 100 requests | 15 minutes |
| `/api/osint/*` | 30 requests | 1 minute |
| `/api/ai/*` | 20 requests | 1 minute |

## Deployment

### Docker
```bash
docker-compose up -d
```

### Manual
```bash
npm run build
npm start
```

### Environment
Set `NODE_ENV=production` for production deployments.

## License

Private - For authorized use only.

## Changelog

### v1.0.0 (2026-03-14)
- Initial release with enhanced security
- Added rate limiting and input validation
- Implemented caching system
- Added background job queue
- Enhanced OSINT tools (IP geo, subdomains, SSL, breaches)
- Added PDF/JSON export functionality
- Implemented comprehensive logging
- Added Docker support
- CI/CD pipeline with GitHub Actions
