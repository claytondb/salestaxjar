// Security utilities for SalesTaxJar
// Note: This is a demo implementation. In production, use proper bcrypt and server-side auth.

const DEMO_WARNING = `
⚠️ DEMO MODE WARNING ⚠️
This application uses client-side storage for demonstration purposes only.
In a production environment:
- Passwords should be hashed server-side with bcrypt (cost factor 12+)
- Sessions should be managed with HTTP-only, secure cookies
- All sensitive data should be stored in encrypted databases
- Authentication should be handled by a secure backend service
`;

// Simulated bcrypt-like password hashing (DO NOT use in production)
// In production, use bcrypt on the server with await bcrypt.hash(password, 12)
export function hashPassword(password: string): string {
  // Simple simulation - in production use bcrypt
  const salt = generateSalt();
  const hash = simpleHash(password + salt);
  return `$demo$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash.startsWith('$demo$')) {
    // Legacy plain text comparison (for existing users before this update)
    return password === storedHash;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;
  const salt = parts[2];
  const hash = parts[3];
  return simpleHash(password + salt) === hash;
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Convert to base36 and pad
  const hashStr = Math.abs(hash).toString(36);
  return hashStr.padStart(12, '0');
}

// Session token management
export interface SessionToken {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateSessionToken(userId: string): SessionToken {
  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const now = Date.now();
  return {
    token,
    userId,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };
}

export function isSessionValid(session: SessionToken | null): boolean {
  if (!session) return false;
  return Date.now() < session.expiresAt;
}

export function getSessionFromStorage(): SessionToken | null {
  try {
    const sessionStr = localStorage.getItem('salestaxjar_session');
    if (!sessionStr) return null;
    const session: SessionToken = JSON.parse(sessionStr);
    if (!isSessionValid(session)) {
      localStorage.removeItem('salestaxjar_session');
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSessionToStorage(session: SessionToken): void {
  localStorage.setItem('salestaxjar_session', JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem('salestaxjar_session');
}

// Rate limiting (client-side - server-side recommended for production)
interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes lockout

export function checkRateLimit(key: string): { allowed: boolean; waitTime?: number; attemptsRemaining?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    rateLimitStore.set(key, { attempts: 1, firstAttempt: now, lockedUntil: null });
    return { allowed: true, attemptsRemaining: MAX_ATTEMPTS - 1 };
  }

  // Check if locked out
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, waitTime: Math.ceil((entry.lockedUntil - now) / 1000 / 60) };
  }

  // Reset if window expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    rateLimitStore.set(key, { attempts: 1, firstAttempt: now, lockedUntil: null });
    return { allowed: true, attemptsRemaining: MAX_ATTEMPTS - 1 };
  }

  // Check attempts
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    return { allowed: false, waitTime: Math.ceil(LOCKOUT_MS / 1000 / 60) };
  }

  entry.attempts++;
  return { allowed: true, attemptsRemaining: MAX_ATTEMPTS - entry.attempts };
}

export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// Input validation and sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS
    .slice(0, 1000); // Limit length
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateName(name: string): boolean {
  return name.length >= 1 && name.length <= 100 && /^[a-zA-Z\s\-']+$/.test(name);
}

// Data encryption for localStorage (demo - use proper encryption in production)
// In production, sensitive data should be stored server-side in encrypted databases
const STORAGE_KEY_PREFIX = 'stj_';

export function encryptForStorage(data: string): string {
  // Demo: Base64 encode with a marker
  // In production: Use Web Crypto API with proper key management
  return btoa(unescape(encodeURIComponent('ENC:' + data)));
}

export function decryptFromStorage(encrypted: string): string | null {
  try {
    const decoded = decodeURIComponent(escape(atob(encrypted)));
    if (!decoded.startsWith('ENC:')) return null;
    return decoded.slice(4);
  } catch {
    return null;
  }
}

// GDPR-compliant data export
export function exportUserData(): string {
  const data: Record<string, unknown> = {
    exportDate: new Date().toISOString(),
    exportFormat: 'JSON',
    dataCategories: [],
  };

  // Collect all user data from localStorage
  const keysToExport = [
    'salestaxjar_state',
    'salestaxjar_users',
    'salestaxjar_session',
    'salestaxjar_cookie_consent',
  ];

  keysToExport.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        data[key] = JSON.parse(value);
        (data.dataCategories as string[]).push(key);
      } catch {
        data[key] = value;
      }
    }
  });

  return JSON.stringify(data, null, 2);
}

// GDPR-compliant data deletion
export function deleteAllUserData(): void {
  const keysToDelete = [
    'salestaxjar_state',
    'salestaxjar_users',
    'salestaxjar_session',
    'salestaxjar_cookie_consent',
  ];

  keysToDelete.forEach(key => {
    localStorage.removeItem(key);
  });

  // Clear session storage as well
  sessionStorage.clear();
}

// Log the demo warning in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.warn(DEMO_WARNING);
}
