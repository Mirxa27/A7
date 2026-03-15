import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { body, param, validationResult } from 'express-validator';
// Rate limiting configurations
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
export const osintLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 OSINT requests per minute
    message: {
        error: 'OSINT rate limit exceeded',
        retryAfter: '1 minute'
    },
});
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 AI requests per minute
    message: {
        error: 'AI proxy rate limit exceeded',
        retryAfter: '1 minute'
    },
});
// Security middleware configuration
export const securityMiddleware = [
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://esm.sh"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://api.github.com", "https://*.prisma-data.net"],
            },
        },
        crossOriginEmbedderPolicy: false, // Allow embedding
    }),
    cors({
        origin: process.env.NODE_ENV === 'production'
            ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
            : true,
        credentials: true,
    }),
];
// Validation middleware
export const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }
        res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    };
};
// Common validators
export const validators = {
    domain: param('domain')
        .isString()
        .trim()
        .isLength({ min: 3, max: 253 })
        .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)
        .withMessage('Invalid domain format'),
    phone: param('phone')
        .isString()
        .trim()
        .isLength({ min: 7, max: 20 })
        .matches(/^[+]?[\d\s()-]+$/)
        .withMessage('Invalid phone number format'),
    username: param('username')
        .isString()
        .trim()
        .isLength({ min: 1, max: 50 })
        .matches(/^[a-zA-Z0-9._-]+$/)
        .withMessage('Invalid username format'),
    email: param('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email format'),
    ip: param('ip')
        .isIP()
        .withMessage('Invalid IP address format'),
    intelRecord: [
        body('title').isString().trim().isLength({ min: 1, max: 200 }),
        body('type').isIn(['REPORT', 'INTERCEPT', 'PROFILE', 'ASSET', 'BREACH', 'SURVEILLANCE', 'MISSION']),
        body('date').isISO8601(),
        body('clearance').isIn(['TOP SECRET', 'SECRET', 'CONFIDENTIAL']),
        body('details').optional().isString().isLength({ max: 10000 }),
        body('tags').optional().isArray(),
        body('source').optional().isString().isLength({ max: 500 }),
    ],
};
// Audit logging middleware
export const auditLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    // Log sensitive operations
    if (req.path.startsWith('/api/intel') || req.path.startsWith('/api/osint')) {
        console.log(`[AUDIT] ${timestamp} | ${clientIP} | ${req.method} ${req.path} | User-Agent: ${req.headers['user-agent']}`);
    }
    next();
};
// Request sanitization
export const sanitizeInput = (req, res, next) => {
    // Remove potentially dangerous characters from string inputs
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return obj.replace(/[<>\"']/g, '');
        }
        if (Array.isArray(obj)) {
            return obj.map(item => sanitize(item));
        }
        if (typeof obj === 'object' && obj !== null) {
            const sanitized = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    sanitized[key] = sanitize(obj[key]);
                }
            }
            return sanitized;
        }
        return obj;
    };
    // Only sanitize body - query and params are read-only in Express 5
    if (req.body && typeof req.body === 'object') {
        req.body = sanitize(req.body);
    }
    next();
};
