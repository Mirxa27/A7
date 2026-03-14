# Agent7 Intelligence Interface

A comprehensive OSINT (Open Source Intelligence) platform with AI-powered analysis capabilities. Built with React, TypeScript, Express, and Prisma.

![Agent7 Interface](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## Features

### 🔍 OSINT Tools
- **DNS Lookup**: Comprehensive DNS record resolution (A, MX, TXT, NS)
- **WHOIS Lookup**: Domain registration and ownership information
- **Phone Validation**: International phone number validation with carrier detection
- **Username Search**: Cross-platform username/handle search across 10+ social networks
- **Email Verification**: MX record validation and syntax checking
- **Reverse DNS**: IP to hostname resolution

### 🤖 AI-Powered Analysis
- **Target Dossier Generation**: Deep research pipeline with iterative search
- **Mission Planning**: Automated tactical strategy generation
- **Behavioral Forecasting**: Predictive analytics for target behavior
- **Social Engineering**: Persona generation for infiltration scenarios
- **Intelligence Analysis**: Multi-source data synthesis and threat assessment

### 🎯 Tactical Dashboard
- Real-time operation monitoring
- Asset tracking and management
- Surveillance grid visualization
- Network topology mapping
- Threat level indicators

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Recharts
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (via Prisma Accelerate)
- **AI Integration**: Google Gemini, OpenAI, HuggingFace
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

## Configuration

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Prisma Accelerate connection string | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | No* |
| `OPENAI_API_KEY` | OpenAI API key | No* |
| `HUGGINGFACE_API_KEY` | HuggingFace API key | No* |

*At least one AI provider is required for full functionality

### Database Setup

The project uses Prisma Accelerate for database access. The connection string is pre-configured in `.env`. To use your own database:

1. Update `DATABASE_URL` in `.env`
2. Run `npx prisma db push` to sync schema
3. Run `npx prisma generate` to generate client

## API Endpoints

### Health & Status
- `GET /api/health` - Health check
- `GET /api/status` - System status

### Intel Records
- `GET /api/intel` - List all records
- `GET /api/intel/:id` - Get specific record
- `POST /api/intel` - Create new record
- `PATCH /api/intel/:id` - Update record
- `DELETE /api/intel/:id` - Delete record

### OSINT Tools
- `GET /api/osint/dns/:domain` - DNS lookup
- `GET /api/osint/whois/:domain` - WHOIS lookup
- `GET /api/osint/phone/:phone` - Phone validation
- `GET /api/osint/username/:username` - Username search
- `GET /api/osint/email/:email` - Email verification
- `GET /api/osint/reverse/:ip` - Reverse DNS lookup

### AI Proxy
- `POST /api/ai/huggingface` - HuggingFace API proxy
- `POST /api/ai/openai` - OpenAI API proxy
- `POST /api/ai/gemini` - Gemini API proxy

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Type check with TypeScript
```

## Project Structure

```
A7/
├── components/          # React components
│   ├── Dashboard.tsx
│   ├── IntelSearch.tsx
│   ├── IntelAnalysis.tsx
│   └── ...
├── context/            # React context providers
├── services/           # Business logic
│   ├── geminiService.ts
│   ├── osintService.ts
│   ├── storageService.ts
│   └── audioService.ts
├── prisma/
│   └── schema.prisma   # Database schema
├── server.ts           # Express server
├── App.tsx             # Main app component
└── types.ts            # TypeScript type definitions
```

## Security Notes

- All API keys are server-side only (proxied through backend)
- No client-side storage of sensitive credentials
- CORS enabled for development
- Input validation on all endpoints
- Rate limiting recommended for production

## Production Deployment

### Build
```bash
npm run build
```

### Environment
Set `NODE_ENV=production` in your environment.

### Docker (Optional)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## License

Private - For authorized use only.

## Support

For issues or feature requests, please open an issue on the GitHub repository.
