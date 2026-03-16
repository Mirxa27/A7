import crypto from 'crypto';
import { prisma } from './prisma.js';

const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-in-production';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface Session {
  token: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory session store (sufficient for single-instance deployment)
const sessions = new Map<string, Session>();

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createSession(): { token: string; expiresAt: number } {
  const token = generateToken();
  const now = Date.now();
  const session: Session = { token, createdAt: now, expiresAt: now + SESSION_DURATION_MS };
  sessions.set(token, session);
  return { token, expiresAt: session.expiresAt };
}

export function validateSession(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

// Cleanup expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) sessions.delete(token);
  }
}, 60 * 60 * 1000); // Every hour
