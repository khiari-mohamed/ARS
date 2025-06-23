export function isPasswordComplex(password: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
}

const lockoutMap = new Map<string, { attempts: number; lockedUntil: Date | null }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export function recordFailedAttempt(email: string): boolean {
  const entry = lockoutMap.get(email) || { attempts: 0, lockedUntil: null };
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
  }
  lockoutMap.set(email, entry);
  return entry.lockedUntil !== null;
}

export function isLockedOut(email: string): boolean {
  const entry = lockoutMap.get(email);
  if (!entry) return false;
  if (entry.lockedUntil && entry.lockedUntil > new Date()) return true;
  if (entry.lockedUntil && entry.lockedUntil <= new Date()) {
    lockoutMap.delete(email);
    return false;
  }
  return false;
}

export function resetLockout(email: string) {
  lockoutMap.delete(email);
}