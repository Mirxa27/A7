import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger configuration
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { 
    service: 'agent7-intelligence',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
    }),
    
    // API request log
    new winston.transports.File({
      filename: path.join(logsDir, 'api-requests.log'),
      format: fileFormat,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
  ]
});

// Request logging middleware
export function requestLogger(req: any, res: any, next: any) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      contentLength: res.get('content-length'),
    };
    
    if (res.statusCode >= 400) {
      logger.warn('API Request', logData);
    } else {
      logger.info('API Request', logData);
    }
  });
  
  next();
}

// Security event logging
export function logSecurityEvent(event: string, details: any) {
  logger.warn('Security Event', {
    type: 'security',
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
}

// Audit logging for sensitive operations
export function auditLog(action: string, userId: string, details: any) {
  logger.info('Audit Log', {
    type: 'audit',
    action,
    userId,
    ...details,
    timestamp: new Date().toISOString()
  });
}

// OSINT operation logging
export function logOsintOperation(operation: string, target: string, success: boolean, details?: any) {
  logger.info('OSINT Operation', {
    type: 'osint',
    operation,
    target,
    success,
    ...details,
    timestamp: new Date().toISOString()
  });
}

// AI operation logging
export function logAIOperation(provider: string, operation: string, success: boolean, duration: number) {
  logger.info('AI Operation', {
    type: 'ai',
    provider,
    operation,
    success,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
}

export default logger;
