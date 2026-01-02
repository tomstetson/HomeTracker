import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from './database.service';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

// Constants
const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// Get JWT secret - requires environment variable
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] JWT_SECRET environment variable is required in production');
    }
    console.warn('[SECURITY] JWT_SECRET not configured. Set JWT_SECRET in .env before deploying to production.');
    // Only allow fallback in development - generate a random one per process
    // This means tokens won't persist across restarts in dev, which is acceptable
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
  return secret;
};

const getRefreshSecret = (): string => {
  if (process.env.JWT_REFRESH_SECRET) {
    return process.env.JWT_REFRESH_SECRET;
  }
  return getJwtSecret() + '-refresh';
};

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate access and refresh tokens
 */
export function generateTokens(user: User): AuthTokens {
  const accessPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };

  const refreshPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
  };

  const accessToken = jwt.sign(accessPayload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(refreshPayload, getRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as TokenPayload;
    if (payload.type !== 'access') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, getRefreshSecret()) as TokenPayload;
    if (payload.type !== 'refresh') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ user: User; tokens: AuthTokens } | { error: string }> {
  // Check if user already exists
  const existingStmt = db.prepare('SELECT id FROM users WHERE email = ?');
  const existing = existingStmt.get(email) as { id: string } | undefined;
  if (existing) {
    return { error: 'Email already registered' };
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const userId = uuidv4();
  const now = new Date().toISOString();

  const insertStmt = db.prepare(
    `INSERT INTO users (id, email, name, password_hash, role, settings, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertStmt.run(userId, email, name, passwordHash, 'user', '{}', now, now);

  const user: User = {
    id: userId,
    email,
    name,
    role: 'user',
    settings: {},
    created_at: now,
    updated_at: now,
  };

  const tokens = generateTokens(user);

  return { user, tokens };
}

/**
 * Login a user
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; tokens: AuthTokens } | { error: string }> {
  // Find user
  const stmt = db.prepare(
    'SELECT id, email, name, password_hash, role, settings, created_at, updated_at FROM users WHERE email = ?'
  );
  const userRow = stmt.get(email) as (User & { password_hash: string }) | undefined;

  if (!userRow) {
    return { error: 'Invalid email or password' };
  }

  // Verify password
  const valid = await verifyPassword(password, userRow.password_hash);
  if (!valid) {
    return { error: 'Invalid email or password' };
  }

  const user: User = {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    role: userRow.role as 'admin' | 'user',
    settings: typeof userRow.settings === 'string' ? JSON.parse(userRow.settings) : userRow.settings,
    created_at: userRow.created_at,
    updated_at: userRow.updated_at,
  };

  const tokens = generateTokens(user);

  return { user, tokens };
}

/**
 * Get user by ID
 */
export function getUserById(userId: string): User | null {
  const stmt = db.prepare(
    'SELECT id, email, name, role, settings, created_at, updated_at FROM users WHERE id = ?'
  );
  const user = stmt.get(userId) as User | undefined;

  if (!user) {
    return null;
  }

  return {
    ...user,
    settings: typeof user.settings === 'string' ? JSON.parse(user.settings) : user.settings,
  };
}

/**
 * Update user password
 */
export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean } | { error: string }> {
  const selectStmt = db.prepare('SELECT password_hash FROM users WHERE id = ?');
  const userRow = selectStmt.get(userId) as { password_hash: string } | undefined;

  if (!userRow) {
    return { error: 'User not found' };
  }

  const valid = await verifyPassword(currentPassword, userRow.password_hash);
  if (!valid) {
    return { error: 'Current password is incorrect' };
  }

  const newHash = await hashPassword(newPassword);
  const updateStmt = db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?');
  updateStmt.run(newHash, new Date().toISOString(), userId);

  return { success: true };
}

/**
 * Update user profile
 */
export function updateProfile(
  userId: string,
  updates: { name?: string; email?: string }
): User | { error: string } {
  const user = getUserById(userId);
  if (!user) {
    return { error: 'User not found' };
  }

  // Check if email is being changed and if it's already taken
  if (updates.email && updates.email !== user.email) {
    const checkStmt = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?');
    const existing = checkStmt.get(updates.email, userId) as { id: string } | undefined;
    if (existing) {
      return { error: 'Email already in use' };
    }
  }

  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(userId);

    const updateStmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    updateStmt.run(...values);
  }

  return getUserById(userId)!;
}

/**
 * Create default admin user if no users exist
 */
export async function ensureDefaultAdmin(): Promise<void> {
  const checkStmt = db.prepare('SELECT id FROM users LIMIT 1');
  const existing = checkStmt.get() as { id: string } | undefined;
  
  if (!existing) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hometracker.local';
    const adminName = process.env.ADMIN_NAME || 'Admin';
    
    // Require ADMIN_PASSWORD env var or generate a secure random one
    let adminPassword: string;
    let passwordGenerated = false;
    
    if (process.env.ADMIN_PASSWORD) {
      adminPassword = process.env.ADMIN_PASSWORD;
    } else {
      // Generate a secure random password if not provided
      const crypto = require('crypto');
      adminPassword = crypto.randomBytes(16).toString('base64url');
      passwordGenerated = true;
    }

    console.log('📝 Creating default admin user...');
    
    const passwordHash = await hashPassword(adminPassword);
    const userId = uuidv4();
    const now = new Date().toISOString();

    const insertStmt = db.prepare(
      `INSERT INTO users (id, email, name, password_hash, role, settings, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertStmt.run(userId, adminEmail, adminName, passwordHash, 'admin', '{}', now, now);

    console.log(`✅ Default admin created: ${adminEmail}`);
    if (passwordGenerated) {
      console.log(`🔐 Generated admin password: ${adminPassword}`);
      console.log('⚠️  Save this password! It will not be shown again.');
      console.log('💡 Set ADMIN_PASSWORD in .env to use a fixed password.');
    } else {
      console.log('⚠️  Change the default password after first login!');
    }
  }
}
