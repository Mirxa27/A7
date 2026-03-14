# Changelog

All notable changes to the Agent7 Intelligence Interface project.

## [1.0.0] - 2026-03-14

### 🛡️ Security
- Added comprehensive rate limiting (express-rate-limit)
- Implemented Helmet security headers
- Added input validation with express-validator
- Implemented input sanitization middleware
- Added audit logging for sensitive operations
- Enhanced CORS configuration
- Added request logging with Winston

### 🚀 Performance
- Implemented intelligent caching system (node-cache)
- Added cache statistics endpoint
- Created background job queue for async operations
- Added job progress tracking
- Implemented cache management endpoints

### 🔍 OSINT Enhancements
- **IP Geolocation**: Added IP-to-location lookup service
- **Enhanced Username Search**: Expanded to 25+ platforms
  - Social: Twitter/X, Instagram, Facebook, TikTok, YouTube, Reddit, Pinterest, Snapchat
  - Dev: GitHub, GitLab, Bitbucket, StackOverflow, Dev.to, CodePen, Replit, HackerRank, LeetCode
  - Forums: HackerNews, Medium, Quora
  - Professional: LinkedIn, AngelList, Behance, Dribbble, Fiverr, Upwork
  - Other: Twitch, Discord, Telegram, Spotify, SoundCloud, Vimeo, Flickr, Gravatar
- **Email Breach Check**: Integrated Have I Been Pwned API
- **Subdomain Enumeration**: Certificate Transparency log search via crt.sh
- **SSL Certificate Info**: SSL Labs API integration
- **Comprehensive DNS**: Multi-record type lookups (A, MX, TXT, NS)

### 📄 Export & Reporting
- Added PDF dossier generation (PDFKit)
- Added mission operation order exports
- Added JSON export functionality
- Added CSV export support
- Implemented classification level handling
- Added export download endpoints
- Added export cleanup automation

### 📝 Logging & Monitoring
- Integrated Winston logging framework
- Added structured JSON logging
- Created separate log files (error, combined, API, exceptions, rejections)
- Added security event logging
- Added audit trail logging
- Added OSINT operation logging
- Added AI operation logging with timing

### 🔧 Developer Experience
- Added TypeScript type safety throughout
- Created comprehensive API documentation
- Added health check endpoint with cache stats
- Added system status endpoint
- Created job queue management API
- Added cache management admin endpoints

### 🐳 DevOps
- Added Docker support with Dockerfile
- Created docker-compose.yml for easy deployment
- Implemented GitHub Actions CI/CD pipeline
- Added automated testing in CI
- Created setup.sh for automated installation
- Created deploy.sh for production deployment

### 📦 Dependencies Added
- `express-rate-limit` - API rate limiting
- `express-validator` - Input validation
- `helmet` - Security headers
- `node-cache` - In-memory caching
- `pdfkit` - PDF generation
- `uuid` - UUID generation
- `winston` - Logging framework

### API Changes

#### New Endpoints
- `GET /api/admin/cache/stats` - Cache statistics
- `POST /api/admin/cache/clear/:type` - Clear cache
- `GET /api/osint/subdomains/:domain` - Subdomain enumeration
- `GET /api/osint/ssl/:domain` - SSL certificate info
- `GET /api/osint/geolocation/:ip` - IP geolocation
- `POST /api/jobs` - Create background job
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/active` - List active jobs
- `GET /api/jobs/:id` - Get job status
- `DELETE /api/jobs/:id` - Cancel job
- `POST /api/export/dossier` - Export dossier
- `POST /api/export/mission` - Export mission
- `GET /api/exports` - List exports
- `GET /api/export/download/:filename` - Download export

#### Enhanced Endpoints
- `GET /api/intel` - Added pagination support
- `GET /api/osint/username/:username` - Now checks 25+ platforms
- `GET /api/osint/email/:email` - Added breach checking
- `GET /api/status` - Added cache and job queue stats

### Configuration Changes
- Added `HIBP_API_KEY` for email breach checking
- Added `LOG_LEVEL` for controlling log verbosity
- Added rate limit configuration options

### Bug Fixes
- Fixed Prisma Accelerate initialization
- Fixed Express 5.x route pattern compatibility
- Improved error handling throughout

## [0.0.1] - 2026-03-13

### Initial Release
- Basic Express server with TypeScript
- React 19 frontend with Vite
- Prisma ORM with PostgreSQL
- Basic OSINT tools (DNS, WHOIS, phone, username)
- AI proxy for Gemini, OpenAI, HuggingFace
- Tactical dashboard UI
- Audio feedback system
- Local storage for settings

[1.0.0]: https://github.com/Mirxa27/A7/releases/tag/v1.0.0
[0.0.1]: https://github.com/Mirxa27/A7/releases/tag/v0.0.1
