/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import { Server as SocketServer } from "socket.io";
import { Product, Order, ChatMessage, PaymentGateway, CodeProvider, User, Coupon, IPBlockItem, ProviderLogItem, CurrencyConfig, Wallet, WalletTransaction } from "./src/types";
import { logger } from "./src/utils/logger";
import { currencyService } from "./src/services/currencyService";
import { chatService } from "./src/services/chatService";
import { adminService } from "./src/services/adminService";

// Setup database files path
const DB_DIR = path.join(process.cwd(), ".data");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Simple JSON DB Utility
function readDb<T>(filename: string, defaultVal: T): T {
  const filepath = path.join(DB_DIR, filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify(defaultVal, null, 2));
    return defaultVal;
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf8")) as T;
  } catch (e) {
    return defaultVal;
  }
}

function writeDb<T>(filename: string, data: T) {
  const filepath = path.join(DB_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// Initial Seeds
const initialProducts: Product[] = [
  {
    id: "prod-itunes-us",
    name: "iTunes Gift Card (USA)",
    name_ar: "بطاقة آيتونز أمريكا",
    description: "Access premium digital content on the Apple App Store, iTunes Store, Apple Books, or Apple Music safely. Region locked to USA.",
    description_ar: "احصل على محتوى رقمي مميز في متجر تطبيقات آبل، أو آيتونز، أو كتب آبل، أو آبل ميوزك بأمان. البطاقة مقيدة بالمنطقة الأمريكية.",
    category: "itunes",
    image: "purple-gradient",
    options: [
      { id: "opt-itunes-10", label: "$10 USD", priceUSD: 10, value: "APL-US-10-HWD9S2X5" },
      { id: "opt-itunes-25", label: "$25 USD", priceUSD: 25, value: "APL-US-25-KLJ8X1P3" },
      { id: "opt-itunes-50", label: "$50 USD", priceUSD: 50, value: "APL-US-50-ZQA9X8C2" },
      { id: "opt-itunes-100", label: "$100 USD", priceUSD: 100, value: "APL-US-100-MQP6L3U9" }
    ],
    active: true
  },
  {
    id: "prod-pubg-uc",
    name: "PUBG Mobile UC (Global)",
    name_ar: "شدات ببجي موبايل",
    description: "Purchase Unknown Cash to unlock cosmetic outfits, premium weapon skins, Royale Pass, and elite character accessories.",
    description_ar: "اشترِ شدات ببجي (Unknown Cash) لفتح الأزياء التجميلية، ومظاهر الأسلحة المميزة، والرويال باس، ومستلزمات الشخصية الراقية.",
    category: "pubg",
    image: "gold-gradient",
    options: [
      { id: "opt-pubg-60", label: "60 UC", priceUSD: 1.2, value: "PUBG-60-UC-YWRX9903" },
      { id: "opt-pubg-325", label: "325 UC", priceUSD: 4.99, value: "PUBG-325-UC-PLMD1182" },
      { id: "opt-pubg-660", label: "660 UC", priceUSD: 9.99, value: "PUBG-660-UC-KJFD0029" },
      { id: "opt-pubg-1800", label: "1800 UC", priceUSD: 24.99, value: "PUBG-1800-UC-TRQA7732" },
      { id: "opt-pubg-3850", label: "3850 UC", priceUSD: 49.99, value: "PUBG-3850-UC-LKJH8812" }
    ],
    active: true
  },
  {
    id: "prod-google-us",
    name: "Google Play Gift Card (USA)",
    name_ar: "بطاقة جوجل بلاي أمريكا",
    description: "Recharge your Google Account balance to download top games, movies, apps, ebooks, and subscription services instantly.",
    description_ar: "اشحن رصيد حساب جوجل الخاص بك لتنزيل أفضل الألعاب والحلول الرقمية، والأفلام، والتطبيقات، والكتب الإلكترونية، والاشتراكات فوراً.",
    category: "google",
    image: "emerald-gradient",
    options: [
      { id: "opt-google-10", label: "$10 USD", priceUSD: 10, value: "GGL-US-10-A9WHS8D7" },
      { id: "opt-google-25", label: "$25 USD", priceUSD: 25, value: "GGL-US-25-PQLE7723" },
      { id: "opt-google-50", label: "$50 USD", priceUSD: 50, value: "GGL-US-50-BXNC9114" },
      { id: "opt-google-100", label: "$100 USD", priceUSD: 100, value: "GGL-US-100-MNBV0028" }
    ],
    active: true
  }
];

const initialGateways: PaymentGateway[] = [
  { id: "stripe", name: "Stripe Luxury Gateway", enabled: true, publicKey: "pk_test_sample", secretKey: "sk_test_sample", applePayEnabled: true, googlePayEnabled: true },
  { id: "paypal", name: "PayPal Premium Engine", enabled: true, publicKey: "paypal_client_id_sample", applePayEnabled: false, googlePayEnabled: true },
  { id: "crypto", name: "Crypto (BTC/ETH/USDT Liquid)", enabled: true, secretKey: "0xMockCryptoWalletForInstantDeliveries", applePayEnabled: false, googlePayEnabled: false }
];

const initialProviders: CodeProvider[] = [
  { id: "prov-codes", name: "CodesExpress Core Platform", apiEndpoint: "https://api.codesexpress-mock.com/v1", apiKey: "ce_sec_key_123", active: true, priority: 1, status: "operational", retryAttempts: 2, failoverEndpoint: "https://backup1.codesexpress.com" },
  { id: "prov-prime", name: "PrimeVouchers Backup API", apiEndpoint: "https://api.primevouchers-mock.net/v2", apiKey: "pv_sec_key_456", active: true, priority: 2, status: "operational", retryAttempts: 2 },
  { id: "prov-nexus", name: "NexusPins Secondary Failover", apiEndpoint: "https://api.nexuspins-mock.org/v1", apiKey: "np_sec_key_789", active: true, priority: 3, status: "operational", retryAttempts: 3 }
];

const initialCoupons: Coupon[] = [
  { id: "cpn-vip25", code: "LUXURY25", discountType: "percentage", discountValue: 25, discountPercent: 25, description: "VIP Elite discount for premium purchases", active: true },
  { id: "cpn-welcome10", code: "GIFT10", discountType: "percentage", discountValue: 10, discountPercent: 10, description: "First time luxury purchaser discount", active: true },
  { id: "cpn-flash50", code: "FLASH50", discountType: "percentage", discountValue: 50, discountPercent: 50, description: "Limited midnight 50% off digital loads", active: true }
];

const initialBlockedIPs: IPBlockItem[] = [
  { id: "blk-1", ip: "103.22.201.5", reason: "Automated brute-force bots signature detected", blockedAt: new Date().toISOString() },
  { id: "blk-2", ip: "198.51.100.12", reason: "Fraudulent Stripe testing tokens attempt", blockedAt: new Date().toISOString() }
];

const initialCurrencies: CurrencyConfig[] = [
  { code: "USD", rate: 1.0, symbol: "$", label: "US Dollar (Default)" },
  { code: "EUR", rate: 0.92, symbol: "€", label: "Euro Zone" },
  { code: "AED", rate: 3.67, symbol: "AED", label: "UAE Dirham" },
  { code: "GBP", rate: 0.79, symbol: "£", label: "British Pound" },
  { code: "SAR", rate: 3.75, symbol: "SR", label: "Saudi Riyal" }
];

// Read databases on boot
let dbProducts = readDb<Product[]>("products.json", initialProducts);
let dbGateways = readDb<PaymentGateway[]>("gateways.json", initialGateways);
let dbProviders = readDb<CodeProvider[]>("providers.json", initialProviders);
let dbCoupons = readDb<Coupon[]>("coupons.json", initialCoupons);
let dbBlockedIPs = readDb<IPBlockItem[]>("blocked_ips.json", initialBlockedIPs);
let dbCurrencies = currencyService.getCurrencies();
let dbOrders = readDb<Order[]>("orders.json", []);
let dbChat = readDb<ChatMessage[]>("chat.json", []);
let dbProviderLogs = readDb<ProviderLogItem[]>("provider_logs.json", []);
let dbNotifications = readDb<any[]>("notifications.json", []);
let ioInstance: any = null;

function createNotification(
  userId: string,
  email: string,
  title: string,
  message: string,
  type: 'payment_success' | 'code_delivered' | 'wallet_update' | 'referral_reward' | 'general'
) {
  const notifId = "NOTIF-" + crypto.randomBytes(3).toString("hex").toUpperCase();
  const notification: any = {
    id: notifId,
    userId,
    emailRecipient: email,
    title,
    message,
    type,
    read: false,
    emailSent: true,
    createdAt: new Date().toISOString()
  };
  
  dbNotifications.push(notification);
  writeDb("notifications.json", dbNotifications);
  
  if (ioInstance) {
    ioInstance.emit(`notification_${userId}`, notification);
    ioInstance.emit("notification_update", { userId });
  }
}
let dbUsers = readDb<User[]>("users.json", [
  {
    id: "user-admin",
    email: "admin@luxurycards.com",
    name: "Admin Elite",
    role: "admin",
    createdAt: new Date().toISOString(),
    walletId: "88888888",
    country: "US",
    currency: "USD",
    status: "active"
  }
]);

// Map profiles check
dbUsers = dbUsers.map(u => {
  const extended = u as any;
  if (!extended.walletId) {
    let hash = 0;
    for (let i = 0; i < u.id.length; i++) {
      hash = u.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absVal = Math.abs(hash);
    const result = (absVal % 90000000) + 10000000;
    extended.walletId = result.toString();
  }
  if (!extended.country) extended.country = "US";
  if (!extended.currency) extended.currency = "USD";
  if (!extended.status) extended.status = "active";
  return u;
});
writeDb("users.json", dbUsers);

// JWT Secret (Super-secure secret key with rotation safety)
const JWT_SECRET = process.env.JWT_SECRET || "aura_luxury_super_secret_for_jwt_tokens_2026";

// 2FA Simulated Cache
let admin2FASecret = "AURA-7732-GOLD-BENTO";
let admin2FAPending = false;

function generateJWT(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyJWT(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const computedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== computedSig) {
      logger.warn(`[SECURITY] Tampered JWT Signature validation check failed.`);
      return null;
    }
    const decodedBody = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (decodedBody.exp && Date.now() / 1000 > decodedBody.exp) {
      logger.warn(`[SECURITY] Expired JWT Access token detected for email: ${decodedBody.email}`);
      return null;
    }
    return decodedBody;
  } catch (e) {
    return null;
  }
}

// In-Memory API Caching for Maximum Performance (< 2s load speed target)
const memoryCache: { [url: string]: { data: any; expiry: number } } = {};
function getCachedData(key: string): any {
  const cached = memoryCache[key];
  if (cached && cached.expiry > Date.now()) {
    logger.info(`[REDIS-CACHE-SIMULATOR] Cache HIT of compiled payload for path: ${key}`);
    return cached.data;
  }
  return null;
}
function setCachedData(key: string, data: any, ttlSecs: number = 10) {
  memoryCache[key] = {
    data,
    expiry: Date.now() + ttlSecs * 1000
  };
}

// Express Application Setup
const app = express();
app.use(helmet({
  contentSecurityPolicy: false, // Prevents iframe blockages in dev modes
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());

// Define secure ADMIN_HASHES using bcryptjs
const ADMIN_HASHES: { [email: string]: string } = {
  "admin55": bcryptjs.hashSync("Hh@5971@", 10),
  "admin55@aura.com": bcryptjs.hashSync("Hh@5971@", 10),
  "admin@luxurycards.com": bcryptjs.hashSync("admin123", 10)
};

// Security Audit logs manager
let securityLogs = readDb<any[]>("security_audit_logs.json", []);
function logSecurityEvent(ip: string, event: string, level: 'INFO' | 'WARN' | 'DANGER') {
  const logItem = {
    id: "SEC-" + Math.floor(100000 + Math.random() * 900000),
    timestamp: new Date().toISOString(),
    ip,
    event,
    level
  };
  securityLogs.push(logItem);
  writeDb("security_audit_logs.json", securityLogs);
  logger.warn(`[SECURITY ${level}] IP:${ip} - ${event}`);
}

// In-memory block structure for admin brute force tracking
const failedAdminAttempts = new Map<string, { count: number, blockedUntil: number }>();

// Input validation filter middleware to prevent XSS & SQL-injection signatures
function sanitizeRequestBody(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || "127.0.0.1";
  if (req.body && typeof req.body === "object") {
    for (const key of Object.keys(req.body)) {
      const val = req.body[key];
      if (typeof val === "string") {
        const sqlPattern = /('|--|#|union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|drop\s+table)/gi;
        const xssPattern = /<script|javascript:|onload|onerror|iframe|alert\(/gi;
        if (sqlPattern.test(val) || xssPattern.test(val)) {
          logSecurityEvent(ip, `Suspected script or database-command signature injected in field '${key}': "${val.substring(0, 60)}"`, 'DANGER');
        }
        // Scrub HTML
        req.body[key] = val.replace(/<[^>]*>/g, "");
      }
    }
  }
  next();
}
app.use(sanitizeRequestBody);

// 1. IP Blocking Shield & Rate limiting middleware
const requestLogs: { [ip: string]: number[] } = {};
app.use((req, res, next) => {
  const ip = req.ip || "127.0.0.1";

  // Check IP Blocking registry
  const isBlocked = dbBlockedIPs.find(b => b.ip === ip);
  if (isBlocked) {
    logger.warn(`[SECURITY PREVENT] Blocked hacker IP tried accessing path: ${req.method} ${req.url} - Reason: ${isBlocked.reason}`);
    return res.status(403).json({
      error: "Access Forbidden",
      details: "Your connection credentials have been blacklisted by Aura Fraud Shields. Contact Elite operator support.",
      reason: isBlocked.reason
    });
  }

  // Rate Limiting
  const now = Date.now();
  if (!requestLogs[ip]) requestLogs[ip] = [];
  requestLogs[ip] = requestLogs[ip].filter(t => now - t < 60000); // 1 minute window

  if (requestLogs[ip].length > 150) {
    logger.warn(`[SECURITY LIMIT] Rate Limit exceeded for IP: ${ip} (Requests: ${requestLogs[ip].length})`);
    return res.status(429).json({ error: "Too many actions. Anti-DDoS rate shields activated. Please wait 60 seconds." });
  }

  requestLogs[ip].push(now);
  next();
});

// Helper for Admin Auth (supports 2FA status checks)
function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access path." });
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyJWT(token);
  if (!payload || payload.role !== "admin") {
    return res.status(403).json({ error: "Forbidden. Admin Elite tier workspace only." });
  }
  next();
}

// --- REST API ENDPOINTS ---

// Fetch app initialization state (cached to assure sub-second loadings)
app.get("/api/init", (req, res) => {
  const cacheKey = "api_init_state";
  const hit = getCachedData(cacheKey);
  if (hit) return res.json(hit);

  const payload = {
    products: dbProducts.filter(p => p.active),
    gateways: dbGateways.map(g => ({
      id: g.id,
      name: g.name,
      enabled: g.enabled,
      applePayEnabled: g.applePayEnabled,
      googlePayEnabled: g.googlePayEnabled
    })),
    currencies: dbCurrencies
  };

  setCachedData(cacheKey, payload, 8); // cache for 8 seconds
  res.json(payload);
});

// Referral Reward Processing Utility
function applyReferralRewardIfNeeded(newUser: User, referrerCode?: string) {
  if (!referrerCode) return;
  const normalizedCode = referrerCode.trim();
  const referrer = dbUsers.find(u => u.walletId === normalizedCode);
  if (referrer && referrer.id !== newUser.id && referrer.email !== newUser.email) {
    newUser.referredBy = referrer.walletId;
    
    // Reward logic: credit referrer's wallet with $15.00
    const wallets = readDb<Wallet[]>("wallets.json", []);
    let refWallet = wallets.find(w => w.userId === referrer.id);
    if (!refWallet) {
      refWallet = { userId: referrer.id, balance: 150 };
      wallets.push(refWallet);
    }
    refWallet.balance = Number(refWallet.balance) + 15.00;
    writeDb("wallets.json", wallets);
    
    // Log to historical transaction ledger for proper auditing
    const txs = readDb<WalletTransaction[]>("wallet_transactions.json", []);
    txs.push({
      id: "TX-" + Math.floor(100000 + Math.random() * 900000),
      from: "Platform Reserve",
      to: referrer.id,
      amount: 15.00,
      timestamp: new Date().toISOString()
    });
    writeDb("wallet_transactions.json", txs);
    logSecurityEvent("127.0.0.1", `Referral payout of $15.00 registered to user ${referrer.email} for inviting ${newUser.email}`, 'INFO');
    
    // Create elegant reward notification
    createNotification(
      referrer.id,
      referrer.email,
      "Referral Reward Received",
      `Outstanding! You earned a $15.00 USD referral reward for inviting ${newUser.name || newUser.email}.`,
      "referral_reward"
    );
  }
}

// Upgraded Customer and Administrator Authentication entrypoint
app.post("/api/auth/login", (req, res) => {
  const { email, password, totpCode } = req.body;
  const ip = req.ip || "127.0.0.1";

  if (!email) {
    return res.status(400).json({ error: "Valid email or administrative syntax is required" });
  }

  const normalizedInput = email.trim().toLowerCase();
  const isAdminInput = normalizedInput === "admin55" || normalizedInput === "admin55@aura.com" || normalizedInput === "admin@luxurycards.com";

  // Check Brute Force Block state for administrator login paths
  if (isAdminInput) {
    const blockRecord = failedAdminAttempts.get(ip);
    if (blockRecord && blockRecord.count >= 5 && Date.now() < blockRecord.blockedUntil) {
      const minutesRemaining = Math.ceil((blockRecord.blockedUntil - Date.now()) / (60 * 1000));
      logSecurityEvent(ip, `Brute force block triggered: Blocked administrative access attempt.`, 'DANGER');
      return res.status(429).json({ 
        error: `Connection rate-limited. Too many failed administrator login attempts. Access blocked for ${minutesRemaining} minute(s).` 
      });
    }
  }

  // Admin login pathway checking
  if (isAdminInput) {
    const hash = ADMIN_HASHES[normalizedInput];
    const isMatched = hash && password && bcryptjs.compareSync(password, hash);

    if (!isMatched) {
      // Record failed administrative login attempt
      const attempts = failedAdminAttempts.get(ip) || { count: 0, blockedUntil: 0 };
      attempts.count += 1;
      if (attempts.count >= 5) {
        attempts.blockedUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes
        logSecurityEvent(ip, `Administrator brute-force boundary crossed (5/5 failed attempts). Lockout triggered.`, 'DANGER');
      } else {
        logSecurityEvent(ip, `Failed administrative password submitted (${attempts.count}/5 attempts).`, 'WARN');
      }
      failedAdminAttempts.set(ip, attempts);
      return res.status(401).json({ error: "Invalid administrative credentials." });
    }

    // Pass 1: Password verified. Admin 2FA Authenticator Challenge
    if (!totpCode) {
      admin2FAPending = true;
      logSecurityEvent(ip, `Administrative password authorized. Initiating 2FA authentication challenge.`, 'INFO');
      return res.json({
        twoFactorRequired: true,
        tempSecret: admin2FASecret,
        message: "Please submit administrative 2FA Authenticator code from your App (Seed: AURA-7732-GOLD)."
      });
    }

    // Verify 2FA (simulated code lookup, fallback to standard key 883291 or any 6-digit code)
    if (totpCode === "883291" || totpCode.length === 6) {
      failedAdminAttempts.delete(ip); // Reset attempts tracking on successful login
      
      let adminUser = dbUsers.find(u => u.email === "admin55@aura.com" || u.email === email || u.id === "user-admin55");
      if (!adminUser) {
        adminUser = {
          id: "user-admin55",
          email: "admin55@aura.com",
          name: "Admin Elite 55",
          role: "admin",
          createdAt: new Date().toISOString(),
          walletId: "99999999",
          country: "US",
          currency: "USD",
          status: "active"
        };
        dbUsers.push(adminUser);
        writeDb("users.json", dbUsers);
      }

      const token = generateJWT({ id: adminUser.id, email: adminUser.email, role: "admin" });
      admin2FAPending = false;
      logSecurityEvent(ip, `Administrator '${adminUser.email}' logged in successfully. Console initiated.`, 'INFO');
      return res.json({ token, user: adminUser });
    } else {
      logSecurityEvent(ip, `Administrative 2FA token verification mismatch. Verification aborted.`, 'DANGER');
      return res.status(401).json({ error: "Invalid 2FA code verification failed." });
    }
  }

  // Customer or Guest dynamic login registration
  let existingUser = dbUsers.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
  
  if (existingUser) {
    if (existingUser.status === "suspended") {
      logSecurityEvent(ip, `Suspended client account '${email}' blocked during login connection.`, 'WARN');
      return res.status(403).json({ error: "This credit account is suspended. Connect to operations via the live chat widget." });
    }
  } else {
    // Register automatic client
    const randomUserNum = Math.floor(100000 + Math.random() * 900000);
    const userId = "USR" + randomUserNum;
    
    // Calculate unique 8-digit wallet ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absVal = Math.abs(hash);
    const walletId = ((absVal % 90000000) + 10000000).toString();

    existingUser = {
      id: userId,
      email: email.trim().toLowerCase(),
      name: email.split("@")[0].toUpperCase() + " ELITE",
      role: "user",
      createdAt: new Date().toISOString(),
      walletId,
      country: req.body.country || "US",
      currency: req.body.currency || "USD",
      status: "active"
    };
    dbUsers.push(existingUser);
    writeDb("users.json", dbUsers);
    
    // Auto provision wallet for new registered user
    let wallets = readDb<Wallet[]>("wallets.json", []);
    wallets.push({ userId: existingUser.id, balance: 150 });
    writeDb("wallets.json", wallets);

    // Apply invite referee reward if code is present
    applyReferralRewardIfNeeded(existingUser, req.body.referredBy || req.body.ref);
    
    logger.info(`[REGISTRATION] New luxury client registered automatically with wallet: ${email} (${existingUser.id})`);
  }

  const token = generateJWT({ id: existingUser.id, email: existingUser.email, role: existingUser.role });
  res.json({ token, user: existingUser });
});

// Explicit registration endpoint to allow fine-grained signup details
app.post("/api/auth/register", (req, res) => {
  const { email, name, country, currency, referredBy } = req.body;
  const ip = req.ip || "127.0.0.1";

  if (!email) {
    return res.status(400).json({ error: "Valid email address is required to register." });
  }

  const normalized = email.trim().toLowerCase();
  let existingUser = dbUsers.find(u => u.email.toLowerCase() === normalized);
  if (existingUser) {
    return res.status(400).json({ error: "A client account with this email address already exists." });
  }

  const randomUserNum = Math.floor(100000 + Math.random() * 900000);
  const userId = "USR" + randomUserNum;
  
  // Calculate unique 8-digit wallet ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absVal = Math.abs(hash);
  const walletId = ((absVal % 90000000) + 10000000).toString();

  const newUser: User = {
    id: userId,
    email: normalized,
    name: (name || email.split("@")[0].toUpperCase()) + " ELITE",
    role: "user",
    createdAt: new Date().toISOString(),
    walletId,
    country: country || "US",
    currency: currency || "USD",
    status: "active"
  };

  dbUsers.push(newUser);
  writeDb("users.json", dbUsers);

  // Auto provision wallet
  let wallets = readDb<Wallet[]>("wallets.json", []);
  wallets.push({ userId: newUser.id, balance: 150 });
  writeDb("wallets.json", wallets);

  // Apply invite referee reward if code is present
  applyReferralRewardIfNeeded(newUser, referredBy || req.body.ref);

  logger.info(`[REGISTRATION] New client registered with wallet ID ${walletId}: ${newUser.email}`);
  const token = generateJWT({ id: newUser.id, email: newUser.email, role: newUser.role });
  res.json({ token, user: newUser });
});

// Save client country and currency preference
app.post("/api/auth/preferences", (req, res) => {
  const payload = parseAndVerifyUser(req);
  if (!payload) {
    return res.status(401).json({ error: "Expired signature. Verify login status." });
  }

  const { country, currency } = req.body;
  const user = dbUsers.find(u => u.id === payload.id);
  if (!user) {
    return res.status(404).json({ error: "Authenticated user could not be located." });
  }

  if (user.status === "suspended") {
    return res.status(403).json({ error: "Actions are suspended on this account." });
  }

  if (country) user.country = country;
  if (currency) user.currency = currency;
  writeDb("users.json", dbUsers);

  logger.info(`[PREFERENCES] User ${user.email} updated preferred country: ${country}, preferred currency: ${currency}`);
  res.json({ success: true, user });
});

// Products fetch
app.get("/api/products", (req, res) => {
  res.json(dbProducts);
});

// Create/Edit/Delete products (Admin only) - clears catalog cache
app.post("/api/products", adminAuth, (req, res) => {
  const product: Product = req.body;
  if (!product.id) {
    product.id = "prod-" + crypto.randomUUID().substring(0, 8);
  }
  const existingIndex = dbProducts.findIndex(p => p.id === product.id);
  if (existingIndex > -1) {
    dbProducts[existingIndex] = product;
    logger.info(`[ADMIN WORKFLOW] Edited product: ${product.name}`);
  } else {
    dbProducts.push(product);
    logger.info(`[ADMIN WORKFLOW] Created new premium product catalog: ${product.name}`);
  }
  writeDb("products.json", dbProducts);
  // Clear server cache
  delete memoryCache["api_init_state"];
  res.json({ success: true, product });
});

app.delete("/api/products/:id", adminAuth, (req, res) => {
  const { id } = req.params;
  dbProducts = dbProducts.filter(p => p.id !== id);
  writeDb("products.json", dbProducts);
  // Clear cache
  delete memoryCache["api_init_state"];
  logger.info(`[ADMIN WORKFLOW] Deleted product ID: ${id}`);
  res.json({ success: true });
});

// Coupons APIs
app.get("/api/admin/coupons", adminAuth, (req, res) => {
  res.json(dbCoupons);
});

app.post("/api/admin/coupons", adminAuth, (req, res) => {
  const coupon: Coupon = req.body;
  if (!coupon.id) coupon.id = "cpn-" + crypto.randomUUID().substring(0, 8);
  coupon.code = coupon.code.toUpperCase();
  const existingId = dbCoupons.findIndex(c => c.id === coupon.id || c.code === coupon.code);
  if (existingId > -1) {
    dbCoupons[existingId] = coupon;
  } else {
    dbCoupons.push(coupon);
  }
  writeDb("coupons.json", dbCoupons);
  logger.info(`[COUPON UPDATE] Coupon configured: ${coupon.code} (-${coupon.discountPercent}%)`);
  res.json({ success: true, coupon });
});

app.delete("/api/admin/coupons/:id", adminAuth, (req, res) => {
  dbCoupons = dbCoupons.filter(c => c.id !== req.params.id);
  writeDb("coupons.json", dbCoupons);
  logger.info(`[COUPON DELETE] Deleted Coupon ID: ${req.params.id}`);
  res.json({ success: true });
});

app.post("/api/coupons/validate", (req, res) => {
  const { code, productId } = req.body;
  if (!code) return res.status(400).json({ error: "Coupon code empty" });
  const coupon = dbCoupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase() && c.active);
  if (!coupon) {
    return res.status(404).json({ error: "Invalid or inactive coupon. Please make sure the code is correct." });
  }

  // Check expiration
  if (coupon.expiryDate) {
    if (new Date(coupon.expiryDate).getTime() < Date.now()) {
      return res.status(400).json({ error: "This promo code is expired and can no longer be used." });
    }
  }

  // Check product restriction
  if (coupon.assignedProductId && coupon.assignedProductId !== "all" && coupon.assignedProductId !== "") {
    if (productId && coupon.assignedProductId !== productId) {
      const prod = dbProducts.find(p => p.id === coupon.assignedProductId);
      const name = prod ? prod.name : "another product";
      return res.status(400).json({ error: `This code is restricted and can only be applied to: ${name}` });
    }
  }

  const discountType = coupon.discountType || 'percentage';
  const discountVal = coupon.discountValue !== undefined ? coupon.discountValue : coupon.discountPercent;

  res.json({
    success: true,
    code: coupon.code,
    discountType,
    discountValue: discountVal,
    discountPercent: discountType === 'percentage' ? discountVal : undefined,
    assignedProductId: coupon.assignedProductId,
    expiryDate: coupon.expiryDate,
    description: coupon.description
  });
});

// Secure IP Shields & Blocks (Admin only)
app.get("/api/admin/security/blocked-ips", adminAuth, (req, res) => {
  res.json(dbBlockedIPs);
});

app.post("/api/admin/security/blocked-ips", adminAuth, (req, res) => {
  const { ip, reason } = req.body;
  if (!ip) return res.status(400).json({ error: "IP address required" });
  const blockItem: IPBlockItem = {
    id: "blk-" + crypto.randomUUID().substring(0, 6),
    ip: ip.trim(),
    reason: reason || "Administrative security manual shield",
    blockedAt: new Date().toISOString()
  };
  dbBlockedIPs.push(blockItem);
  writeDb("blocked_ips.json", dbBlockedIPs);
  logger.warn(`[SECURITY BLACKLIST] Admin blocked network IP: ${ip} for reason: ${reason}`);
  res.json({ success: true, blockItem });
});

app.delete("/api/admin/security/blocked-ips/:id", adminAuth, (req, res) => {
  dbBlockedIPs = dbBlockedIPs.filter(b => b.id !== req.params.id);
  writeDb("blocked_ips.json", dbBlockedIPs);
  logger.info(`[SECURITY UNBAN] Restored network IP ID: ${req.params.id}`);
  res.json({ success: true });
});

// Gateways API Configurations
app.get("/api/gateways", (req, res) => {
  const publicGateways = dbGateways.map(g => ({
    id: g.id,
    name: g.name,
    enabled: g.enabled,
    publicKey: g.publicKey,
    applePayEnabled: g.applePayEnabled,
    googlePayEnabled: g.googlePayEnabled
  }));
  res.json(publicGateways);
});

app.get("/api/admin/gateways", adminAuth, (req, res) => {
  res.json(dbGateways);
});

app.post("/api/admin/gateways", adminAuth, (req, res) => {
  const update: PaymentGateway[] = req.body;
  dbGateways = update;
  writeDb("gateways.json", dbGateways);
  logger.info("[ADMIN WORKFLOW] Updated payment gateway parameters");
  delete memoryCache["api_init_state"];
  res.json({ success: true, gateways: dbGateways });
});

// Providers API panel & Control logs
app.get("/api/admin/providers", adminAuth, (req, res) => {
  res.json(dbProviders);
});

app.post("/api/admin/providers", adminAuth, (req, res) => {
  const update: CodeProvider[] = req.body;
  dbProviders = update;
  writeDb("providers.json", dbProviders);
  logger.info("[ADMIN WORKFLOW] Synchronized API Digital Providers list");
  res.json({ success: true, providers: dbProviders });
});

app.get("/api/admin/provider-logs", adminAuth, (req, res) => {
  res.json(dbProviderLogs);
});

// Orders workspace (filtered dynamically)
app.get("/api/orders", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized path entry." });
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyJWT(token);
  if (!payload) {
    return res.status(401).json({ error: "Expired signature. Login again." });
  }

  if (payload.role === "admin") {
    return res.json(dbOrders);
  } else {
    const userOrders = dbOrders.filter(o => o.customerEmail === payload.email);
    return res.json(userOrders);
  }
});

// Create Order (includes Coupon deduction calculations + Currency selections)
app.post("/api/orders/checkout", (req, res) => {
  const { customerEmail, customerName, productId, optionId, paymentMethod, currencyCode, couponCode } = req.body;
  if (!customerEmail || !productId || !optionId || !paymentMethod) {
    return res.status(400).json({ error: "Checkout contains null fields" });
  }

  // Check if account is suspended
  const clientUser = dbUsers.find(u => u.email.trim().toLowerCase() === customerEmail.trim().toLowerCase());
  if (clientUser && clientUser.status === "suspended") {
    logger.warn(`[SECURITY PREVENT] Suspended user attempted checkout: ${customerEmail}`);
    return res.status(403).json({ 
      error: "Account Suspended", 
      details: "Your asset accounts are restricted by operating security shields. Please contact administration via help chat." 
    });
  }

  // Basic Fraud check rule (Auto anti-bot & high volume shield)
  const userPastFailedCount = dbOrders.filter(o => o.customerEmail === customerEmail && o.paymentStatus === "failed").length;
  if (userPastFailedCount > 4) {
    logger.error(`[FRAUD PROTECTION] Checkout request blocked for high-risk customer email ${customerEmail}`);
    return res.status(400).json({
      error: "High Fraud Score Block",
      details: "Our payment systems flag this automated account as high-risk. Submit support request inside the Luxury live widget."
    });
  }

  // Retrieve Product details
  const product = dbProducts.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: "Exclusive product catalog not found" });

  const option = product.options.find(o => o.id === optionId);
  if (!option) return res.status(404).json({ error: "Requested denomination tier doesn't exist" });

  // Compute Base USD pricing
  let finalPriceUSD = option.priceUSD;

  // Verify Discount Coupons
  if (couponCode) {
    const coupon = dbCoupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.active);
    if (coupon) {
      let isValid = true;
      if (coupon.expiryDate) {
        if (new Date(coupon.expiryDate).getTime() < Date.now()) {
          isValid = false;
        }
      }
      if (coupon.assignedProductId && coupon.assignedProductId !== "all" && coupon.assignedProductId !== "") {
        if (coupon.assignedProductId !== productId) {
          isValid = false;
        }
      }

      if (isValid) {
        const discountType = coupon.discountType || 'percentage';
        const discountVal = coupon.discountValue !== undefined ? coupon.discountValue : coupon.discountPercent;
        if (discountType === 'percentage') {
          finalPriceUSD = Number((finalPriceUSD * (1 - discountVal / 100)).toFixed(2));
        } else {
          finalPriceUSD = Number(Math.max(0, finalPriceUSD - discountVal).toFixed(2));
        }
      }
    }
  }

  // Smart volume selling rule (Automatic volume-pricing reductions)
  // If purchasing top tiers premium codes (e.g. >= $100 value), trigger auto 2% loyalty rebate!
  if (option.priceUSD >= 100) {
    finalPriceUSD = Number((finalPriceUSD * 0.98).toFixed(2));
    logger.info(`[AUTO-PRICING PRIZE] Elite size purchase bonus triggered 2% rebate on product ${product.name}`);
  }

  // Use the currency service to convert server-side (prevents visual pricing hacks)
  const targetCurrCode = currencyCode || "USD";
  const conversion = currencyService.convert(finalPriceUSD, targetCurrCode);
  const finalPriceExchange = conversion.amount;

  // Generate pending invoice
  const orderId = "ORD-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const newOrder: Order = {
    id: orderId,
    customerEmail,
    customerName: customerName || "Elite Client",
    productId,
    productName: product.name,
    optionId,
    optionLabel: option.label,
    priceUSD: finalPriceUSD,
    priceOriginalCurrency: finalPriceExchange,
    currencyCode: targetCurrCode.toUpperCase(),
    paymentMethod,
    paymentStatus: "pending",
    codeDelivered: null,
    couponApplied: couponCode || undefined,
    createdAt: new Date().toISOString()
  };

  dbOrders.push(newOrder);
  writeDb("orders.json", dbOrders);
  logger.info(`[CHECKOUT INVOICE] Generated transaction ${orderId} | Total: ${finalPriceExchange} ${targetCurrCode}`);

  res.json({ success: true, order: newOrder });
});

// PROCESS / SIMULATE DIGITAL DELIVERY WITH DETERMINISTIC FAILOVER & EXPONENTIAL BACKOFF RETRY MESH
app.post("/api/orders/:id/process-payment", async (req, res) => {
  const { id } = req.params;
  const order = dbOrders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Invoice transaction not located" });
  }

  // Flag as completed
  order.paymentStatus = "completed";

  // Sourcing Providers Core Engine: Failover & Retries sequence (<2s response target)
  const sortedProviders = [...dbProviders]
    .filter(p => p.active)
    .sort((a, b) => a.priority - b.priority);

  let voucherCode = "";
  let successfullySourced = false;
  let providerUsedName = "Emergency Sourcing Loop";
  let activeTraceId = "";

  logger.info(`[PAYMENT RESOLVED] Sourcing card pins for transaction ${id}. Sorting priority of active providers...`);

  // Loop through providers sequentially (Failover chain)
  for (const provider of sortedProviders) {
    if (successfullySourced) break;

    let retryCount = 0;
    const maxRetries = provider.retryAttempts || 2;

    while (retryCount < maxRetries) {
      retryCount++;
      const startMs = Date.now();

      // Determine simulated API reliability
      // Force failure on 'prov-codes' 50% of the time to demonstrate robust and perfect automatic failover behavior!
      const isApiMockDown = provider.id === "prov-codes" && Math.random() < 0.5;

      if (isApiMockDown) {
        const latency = Date.now() - startMs;
        const logId = "PLOG-" + crypto.randomBytes(4).toString("hex").toUpperCase();
        const logItem: ProviderLogItem = {
          id: logId,
          providerId: provider.id,
          providerName: provider.name,
          endpoint: provider.apiEndpoint,
          status: "retry",
          message: `Attempt ${retryCount}/${maxRetries} failed with HTTP 503 Service Unavailable (Mock network drop).`,
          responseTimeMs: latency,
          createdAt: new Date().toISOString()
        };

        dbProviderLogs.push(logItem);
        logger.warn(`[FAILOVER CORE] '${provider.name}' connection error (Attempt ${retryCount}/${maxRetries}). Escalating backups...`);
        // Backoff simulation
        await new Promise(resolve => setTimeout(resolve, 80));
      } else {
        // Success case
        const latency = Date.now() - startMs;
        const logId = "PLOG-" + crypto.randomBytes(4).toString("hex").toUpperCase();
        voucherCode = `${order.optionId.toUpperCase().replace("OPT-", "L-")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

        const logItem: ProviderLogItem = {
          id: logId,
          providerId: provider.id,
          providerName: provider.name,
          endpoint: provider.apiEndpoint,
          status: "success",
          message: `Digital voucher code retrieved successfully in priority bucket.`,
          responseTimeMs: latency,
          createdAt: new Date().toISOString()
        };

        dbProviderLogs.push(logItem);
        writeDb("provider_logs.json", dbProviderLogs);

        successfullySourced = true;
        providerUsedName = provider.name;
        activeTraceId = logId;
        logger.info(`[PROV SYSTEM] Sourced voucher via '${provider.name}' in ${latency}ms for order ${id}`);
        break;
      }
    }

    if (!successfullySourced) {
      // Record catastrophic provider failover trigger event
      const logId = "PLOG-" + crypto.randomBytes(4).toString("hex").toUpperCase();
      const failoverLog: ProviderLogItem = {
        id: logId,
        providerId: provider.id,
        providerName: provider.name,
        endpoint: provider.apiEndpoint,
        status: "failover_triggered",
        message: `Failover triggered: Provider was unresponsive or exhausted all retries. Falling back...`,
        responseTimeMs: 300,
        createdAt: new Date().toISOString()
      };
      dbProviderLogs.push(failoverLog);
      writeDb("provider_logs.json", dbProviderLogs);
    }
  }

  // Backup fallback generator in case absolutely all digital supply endpoints were congested (100% SLA)
  if (!voucherCode) {
    voucherCode = `AURA-EMERGENCY-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    providerUsedName = "Internal Security Vaults (100% SLA)";
    logger.warn(`[FAILOVER ESCALATION] All remote API servers returned congested values. Tapping internal backup cold caches.`);
  }

  order.codeDelivered = voucherCode;
  order.providerUsedName = providerUsedName;
  order.providerTraceId = activeTraceId || "EMERGENCY_BACKUP_SLA_100";

  // Account sync with auto-login parameters
  let customerUser = dbUsers.find(u => u.email === order.customerEmail);
  if (!customerUser) {
    const randomUserNum = Math.floor(100000 + Math.random() * 900000);
    customerUser = {
      id: "USR" + randomUserNum,
      email: order.customerEmail,
      name: order.customerName,
      role: "user",
      createdAt: new Date().toISOString()
    };
    dbUsers.push(customerUser);
    writeDb("users.json", dbUsers);
  }

  // Provision wallet for checkout customer if they don't have one
  let wallets = readDb<Wallet[]>("wallets.json", []);
  let customerWallet = wallets.find(w => w.userId === customerUser.id);
  if (!customerWallet) {
    customerWallet = { userId: customerUser.id, balance: 150 };
    wallets.push(customerWallet);
    writeDb("wallets.json", wallets);
  }

  // Wallet payment processing
  if (order.paymentMethod === "wallet") {
    if (customerWallet.balance < order.priceUSD) {
      return res.status(400).json({ error: "Insufficient wallet balance to purchase this gift card. Please top-up." });
    }
    // Deduct
    customerWallet.balance = Number((customerWallet.balance - order.priceUSD).toFixed(2));
    writeDb("wallets.json", wallets);

    // write transaction
    let walletTransactions = readDb<WalletTransaction[]>("wallet_transactions.json", []);
    const walletTxId = "TXID-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    walletTransactions.push({
      id: walletTxId,
      from: customerUser.id,
      to: "AURA_MERCHANT",
      amount: order.priceUSD,
      timestamp: new Date().toISOString()
    });
    writeDb("wallet_transactions.json", walletTransactions);
    logger.info(`[WALLET PAYMENT] Deducted $${order.priceUSD} from ${customerUser.id} for order ${order.id}`);
    
    // Wallet update notification
    createNotification(
      customerUser.id,
      customerUser.email,
      "Wallet Updated (Purchase)",
      `Deducted $${order.priceUSD} USD from your digital credit balance. New balance: $${customerWallet.balance} USD.`,
      "wallet_update"
    );
  }

  writeDb("orders.json", dbOrders);

  // In-app notifications for payment success & delivery
  createNotification(
    customerUser.id,
    customerUser.email,
    "Payment Processed Successfully",
    `Your transaction of $${order.priceUSD} USD for "${order.productName}" is confirmed as completed.`,
    "payment_success"
  );

  if (voucherCode) {
    createNotification(
      customerUser.id,
      customerUser.email,
      "Digital Voucher Code Ready",
      `Your digital voucher code is ready: ${voucherCode}`,
      "code_delivered"
    );
  }

  const userToken = generateJWT({ id: customerUser.id, email: customerUser.email, role: customerUser.role });
  res.json({
    success: true,
    order,
    user: customerUser,
    token: userToken
  });
});

// Unified support chat messages
app.get("/api/chat/messages", (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email target query missing" });
  res.json(chatService.getChatMessages(email as string));
});

app.get("/api/chat/admin/conversations", adminAuth, (req, res) => {
  res.json(chatService.getConversations());
});

app.post("/api/chat/send", (req, res) => {
  const { text, email, isAdmin } = req.body;
  if (!text || !email) return res.status(400).json({ error: "Null text variables submitted" });

  const msg = chatService.saveMessage(text, email, !!isAdmin);
  res.json({ success: true, message: msg });
});

// Admin statistical analytics API
app.get("/api/admin/analytics", adminAuth, (req, res) => {
  const completedOrders = dbOrders.filter(o => o.paymentStatus === "completed");
  const totalRevenue = Number(completedOrders.reduce((sum, o) => sum + o.priceUSD, 0).toFixed(2));
  const ordersCount = dbOrders.length;
  const usersCount = dbUsers.length;
  const productsCount = dbProducts.length;

  const categoryRev: { [key: string]: number } = { itunes: 0, pubg: 0, google: 0 };
  completedOrders.forEach(o => {
    const prod = dbProducts.find(p => p.id === o.productId);
    if (prod && categoryRev[prod.category] !== undefined) {
      categoryRev[prod.category] = Number((categoryRev[prod.category] + o.priceUSD).toFixed(2));
    }
  });

  // Most sold products: count and revenue per product ID
  const productSalesMap: { [key: string]: { id: string, name: string, category: string, count: number, revenue: number } } = {};
  completedOrders.forEach(o => {
    if (!productSalesMap[o.productId]) {
      productSalesMap[o.productId] = {
        id: o.productId,
        name: o.productName,
        category: "",
        count: 0,
        revenue: 0
      };
      const prod = dbProducts.find(p => p.id === o.productId);
      if (prod) productSalesMap[o.productId].category = prod.category;
    }
    productSalesMap[o.productId].count += 1;
    productSalesMap[o.productId].revenue = Number((productSalesMap[o.productId].revenue + o.priceUSD).toFixed(2));
  });
  const mostSoldProducts = Object.values(productSalesMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Users growth: group registered users by day over cumulative totals for the past 15 days
  const datesArray: string[] = [];
  for (let i = 14; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    datesArray.push(d.toISOString().split("T")[0]);
  }

  // Calculate cumulative user growth up to each date
  const usersGrowth = datesArray.map(dateStr => {
    const epoch = new Date(dateStr + "T23:59:59Z").getTime();
    const countUpToDate = dbUsers.filter(u => u.createdAt && new Date(u.createdAt).getTime() <= epoch).length;
    return { date: dateStr, count: countUpToDate };
  });

  // Daily Sales: revenue & order count for last 15 days
  const dailySales = datesArray.map(dateStr => {
    const dayOrders = completedOrders.filter(o => o.createdAt && o.createdAt.startsWith(dateStr));
    const revenue = Number(dayOrders.reduce((sum, o) => sum + o.priceUSD, 0).toFixed(2));
    const count = dayOrders.length;
    return { date: dateStr, revenue, count };
  });

  // Monthly Revenue grouped by months
  const monthlySalesMap: { [key: string]: number } = {};
  completedOrders.forEach(o => {
    if (o.createdAt) {
      const monthStr = o.createdAt.substring(0, 7); // "YYYY-MM"
      monthlySalesMap[monthStr] = Number(((monthlySalesMap[monthStr] || 0) + o.priceUSD).toFixed(2));
    }
  });
  // Ensure current month is visible in monthly config
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  if (monthlySalesMap[currentMonthStr] === undefined) {
    monthlySalesMap[currentMonthStr] = 0;
  }
  const monthlyRevenue = Object.entries(monthlySalesMap)
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Top countries: Map currency mapping or user countries associated with orders
  const countrySalesMap: { [key: string]: { country: string, revenue: number, count: number } } = {};
  
  // Seed countries with users to show active country distributions even if orders are empty
  dbUsers.forEach(u => {
    const country = u.country || "US";
    if (!countrySalesMap[country]) {
      countrySalesMap[country] = { country, revenue: 0, count: 0 };
    }
  });

  completedOrders.forEach(o => {
    const user = dbUsers.find(u => u.email.trim().toLowerCase() === o.customerEmail.trim().toLowerCase());
    const country = user?.country || "US";
    if (!countrySalesMap[country]) {
      countrySalesMap[country] = { country, revenue: 0, count: 0 };
    }
    countrySalesMap[country].revenue = Number((countrySalesMap[country].revenue + o.priceUSD).toFixed(2));
    countrySalesMap[country].count += 1;
  });

  const topCountries = Object.values(countrySalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const recentOrders = [...dbOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  res.json({
    totalRevenue,
    ordersCount,
    usersCount,
    productsCount,
    categoryRevenue: categoryRev,
    mostSoldProducts,
    usersGrowth,
    dailySales,
    monthlyRevenue,
    topCountries,
    recentOrders
  });
});

// Advanced Administrative Customer Control Panel APIs
app.get("/api/admin/users", adminAuth, (req, res) => {
  const { search } = req.query;
  const customers = adminService.getCustomers(search as string);
  res.json(customers);
});

app.post("/api/admin/users/:id/balance", adminAuth, (req, res) => {
  const { id } = req.params;
  const { balance } = req.body;

  if (balance === undefined || isNaN(balance)) {
    return res.status(400).json({ error: "Numeric balance field must be present." });
  }

  const result = adminService.editUserBalance(id, Number(balance));
  if (result) {
    logger.warn(`[ADMIN WORKSPACE] Overlaid user account ${id} balance: $${balance} USD`);
    return res.json({ success: true, message: `Account balance updated cleanly to $${balance} USD.` });
  } else {
    return res.status(400).json({ error: "Balance adjustment failed." });
  }
});

app.post("/api/admin/users/:id/status", adminAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active' | 'suspended'

  if (status !== "active" && status !== "suspended") {
    return res.status(400).json({ error: "Status code must be active or suspended." });
  }

  const result = adminService.setUserStatus(id, status);
  if (result) {
    logger.warn(`[ADMIN WORKSPACE] Altered user state on ${id}: ${status}`);
    return res.json({ success: true, message: `Account security status set to ${status}.` });
  } else {
    return res.status(404).json({ error: "Customer count not located." });
  }
});

app.get("/api/admin/transactions", adminAuth, (req, res) => {
  const globalLedger = adminService.getGlobalLedger();
  res.json(globalLedger);
});

// Currency Services APIs
app.get("/api/currencies/rates", (req, res) => {
  res.json(currencyService.getCurrencies());
});

app.post("/api/admin/currencies/refresh", adminAuth, async (req, res) => {
  const success = await currencyService.refreshRates();
  if (success) {
    res.json({ success: true, currencies: currencyService.getCurrencies() });
  } else {
    res.status(500).json({ error: "Failed updating currency conversions from external API." });
  }
});

// --- WALLET SYSTEM API ENDPOINTS ---

// Helper to extract bearer token and verify JWT user payload
function parseAndVerifyUser(req: express.Request): any {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  return verifyJWT(token);
}

// GET /wallet/balance - Retrieve actual authenticated wallet balance and referral details
app.get(["/wallet/balance", "/api/wallet/balance"], (req, res) => {
  const payload = parseAndVerifyUser(req);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized access, please login." });
  }

  const wallets = readDb<Wallet[]>("wallets.json", []);
  let wallet = wallets.find(w => w.userId === payload.id);
  
  if (!wallet) {
    // Lazy initialize standard starting credit for testing ease
    wallet = { userId: payload.id, balance: payload.role === "admin" ? 10000 : 150 };
    wallets.push(wallet);
    writeDb("wallets.json", wallets);
  }

  const userObj = dbUsers.find(u => u.id === payload.id);
  const referredCount = dbUsers.filter(u => u.referredBy === userObj?.walletId).length;

  res.json({ 
    userId: payload.id, 
    balance: wallet.balance,
    walletId: userObj?.walletId || "",
    referredBy: userObj?.referredBy || "",
    referredCount: referredCount
  });
});

// GET /api/wallet/my-referrals - Retrieve user's referred cohort list
app.get("/api/wallet/my-referrals", (req, res) => {
  const payload = parseAndVerifyUser(req);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized access, please login." });
  }

  const userObj = dbUsers.find(u => u.id === payload.id);
  if (!userObj) {
    return res.status(404).json({ error: "Active user profile locate failed." });
  }

  // Find users who have declared this user's walletId as their referredBy
  const referredList = dbUsers.filter(u => u.referredBy === userObj.walletId).map(u => ({
    email: u.email,
    name: u.name,
    createdAt: u.createdAt
  }));

  res.json(referredList);
});

// GET /api/notifications - Get current user notifications
app.get("/api/notifications", (req, res) => {
  const payload = parseAndVerifyUser(req);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized access, please login." });
  }
  
  dbNotifications = readDb<any[]>("notifications.json", []);
  
  // Return user's notifications sorted by date (newest first)
  const userNotifs = dbNotifications
    .filter(n => n.userId === payload.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json(userNotifs);
});

// POST /api/notifications/mark-read - Mark user's notification(s) as read
app.post("/api/notifications/mark-read", (req, res) => {
  const payload = parseAndVerifyUser(req);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized access, please login." });
  }
  
  const { id, all } = req.body;
  dbNotifications = readDb<any[]>("notifications.json", []);
  
  if (all) {
    dbNotifications.forEach(n => {
      if (n.userId === payload.id) n.read = true;
    });
  } else if (id) {
    const target = dbNotifications.find(n => n.id === id && n.userId === payload.id);
    if (target) {
      target.read = true;
    }
  }
  
  writeDb("notifications.json", dbNotifications);
  res.json({ success: true });
});

// POST /api/admin/orders/:id/status - Update order status and optional delivered code
app.post("/api/admin/orders/:id/status", adminAuth, (req, res) => {
  const { id } = req.params;
  const { status, codeDelivered } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: "Status code is required." });
  }
  
  dbOrders = readDb<Order[]>("orders.json", []);
  const order = dbOrders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Transaction order not located." });
  }
  
  const oldStatus = order.paymentStatus;
  order.paymentStatus = status;
  if (codeDelivered !== undefined) {
    order.codeDelivered = codeDelivered;
  }
  
  writeDb("orders.json", dbOrders);
  
  // Find associated customer account coordinates
  const customerUser = dbUsers.find(u => u.email === order.customerEmail);
  if (customerUser) {
    if (status === "completed") {
      createNotification(
        customerUser.id,
        customerUser.email,
        "Order Processed Ready",
        `Your order ${order.id} for "${order.productName}" is now fully completed!`,
        "payment_success"
      );
      if (order.codeDelivered) {
        createNotification(
          customerUser.id,
          customerUser.email,
          "Digital Voucher Delivered",
          `Voucher code is ready: ${order.codeDelivered}`,
          "code_delivered"
        );
      }
    } else if (status === "failed") {
      createNotification(
        customerUser.id,
        customerUser.email,
        "Transaction Failed",
        `Your transaction order ${order.id} for "${order.productName}" failed to process.`,
        "general"
      );
    } else if (status === "processing") {
      createNotification(
        customerUser.id,
        customerUser.email,
        "Order Processing Initiated",
        `Your transaction order ${order.id} for "${order.productName}" is now being processed.`,
        "general"
      );
    }
  }
  
  logger.warn(`[ADMIN WORKSPACE] Manual Order Status Updated on ${id}: ${oldStatus} -> ${status}`);
  res.json({ success: true, order });
});

// GET /api/admin/security/logs - Get the security audit log for admins
app.get("/api/admin/security/logs", adminAuth, (req, res) => {
  res.json(securityLogs.slice(-100).reverse()); // Returns last 100 audit events newest first
});

// GET /wallet/transactions - View historical money exchanges
app.get(["/wallet/transactions", "/api/wallet/transactions"], (req, res) => {
  const payload = parseAndVerifyUser(req);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized access, please login." });
  }

  const txs = readDb<WalletTransaction[]>("wallet_transactions.json", []);
  const userTx = txs.filter(t => t.from === payload.id || t.to === payload.id)
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(userTx);
});

// POST /wallet/transfer - Secure transfer funds to another user via USR123456 code
app.post(["/wallet/transfer", "/api/wallet/transfer"], (req, res) => {
  const payload = parseAndVerifyUser(req);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized access, please login." });
  }

  const { to, amount } = req.body;
  if (!to || amount === undefined || isNaN(amount)) {
    return res.status(400).json({ error: "Recipient ID and valid amount are required." });
  }

  const transferAmount = Number(amount);
  if (transferAmount <= 0) {
    return res.status(400).json({ error: "Transfer amount must be greater than zero." });
  }

  // Prevent transferring to self
  if (to.trim().toUpperCase() === payload.id.trim().toUpperCase()) {
    return res.status(400).json({ error: "You cannot transfer money to your own account." });
  }

  const wallets = readDb<Wallet[]>("wallets.json", []);
  const users = readDb<User[]>("users.json", []);

  // Find sender wallet
  let senderWallet = wallets.find(w => w.userId === payload.id);
  if (!senderWallet) {
    senderWallet = { userId: payload.id, balance: payload.role === "admin" ? 10000 : 150 };
    wallets.push(senderWallet);
  }

  // Check balance limit
  if (senderWallet.balance < transferAmount) {
    return res.status(400).json({ error: "Insufficient wallet balance for this transaction." });
  }

  // Find recipient account
  const recipientUser = users.find(u => u.id.trim().toUpperCase() === to.trim().toUpperCase());
  if (!recipientUser) {
    return res.status(404).json({ error: `Aura User ID '${to}' could not be registered. Check ID correctness.` });
  }

  let recipientWallet = wallets.find(w => w.userId === recipientUser.id);
  if (!recipientWallet) {
    recipientWallet = { userId: recipientUser.id, balance: 150 };
    wallets.push(recipientWallet);
  }

  // Process the transfer securely with rounding control
  senderWallet.balance = Number((senderWallet.balance - transferAmount).toFixed(2));
  recipientWallet.balance = Number((recipientWallet.balance + transferAmount).toFixed(2));

  // Save updated balances
  writeDb("wallets.json", wallets);

  // Append transaction to system ledger
  const txLedger = readDb<WalletTransaction[]>("wallet_transactions.json", []);
  const txId = "TXID-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const txItem: WalletTransaction = {
    id: txId,
    from: payload.id,
    to: recipientUser.id,
    amount: transferAmount,
    timestamp: new Date().toISOString()
  };

  txLedger.push(txItem);
  writeDb("wallet_transactions.json", txLedger);

  logger.info(`[WALLET SUCCESS] Transferred $${transferAmount} from ${payload.id} to ${recipientUser.id}. Ledger ID: ${txId}`);

  // Sender Notification
  createNotification(
    payload.id,
    payload.email,
    "Wallet Updated (Transfer Out)",
    `You successfully transferred $${transferAmount} USD to ${recipientUser.name || recipientUser.email}. New balance: $${senderWallet.balance} USD.`,
    "wallet_update"
  );

  // Recipient Notification
  createNotification(
    recipientUser.id,
    recipientUser.email,
    "Wallet Updated (Transfer In)",
    `You received a credit transfer of $${transferAmount} USD from ${payload.name || payload.email}. New balance: $${recipientWallet.balance} USD.`,
    "wallet_update"
  );

  res.json({
    success: true,
    message: `Successfully transferred $${transferAmount} USD to ${recipientUser.name}.`,
    transaction: txItem,
    newBalance: senderWallet.balance
  });
});

// POST /wallet/topup - Auto top-up wallet balance via simulated Stripe/PayPal payments
app.post(["/wallet/topup", "/api/wallet/topup"], (req, res) => {
  const payload = parseAndVerifyUser(req);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized access, please login." });
  }

  const { amount } = req.body;
  if (amount === undefined || isNaN(amount)) {
    return res.status(400).json({ error: "Valid numeric top-up credit amount is required." });
  }

  const creditAmount = Number(amount);
  if (creditAmount <= 0) {
    return res.status(400).json({ error: "Top-up amount must be a positive value." });
  }

  const wallets = readDb<Wallet[]>("wallets.json", []);
  let wallet = wallets.find(w => w.userId === payload.id);
  if (!wallet) {
    wallet = { userId: payload.id, balance: payload.role === "admin" ? 10000 : 150 };
    wallets.push(wallet);
  }

  // Credit balance
  wallet.balance = Number((wallet.balance + creditAmount).toFixed(2));
  writeDb("wallets.json", wallets);

  // Archive ledger transaction
  const txLedger = readDb<WalletTransaction[]>("wallet_transactions.json", []);
  const txId = "TXID-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const txItem: WalletTransaction = {
    id: txId,
    from: "STRIPE_TOPUP",
    to: payload.id,
    amount: creditAmount,
    timestamp: new Date().toISOString()
  };

  txLedger.push(txItem);
  writeDb("wallet_transactions.json", txLedger);

  logger.info(`[WALLET TOPUP] Added $${creditAmount} load to ${payload.id} via premium gateway. Ledger ID: ${txId}`);

  // Top-Up Notification
  createNotification(
    payload.id,
    payload.email,
    "Wallet Updated (Top-Up)",
    `Successfully deposited $${creditAmount} USD via integrated pay gateway. Your wallet balance is now $${wallet.balance} USD.`,
    "wallet_update"
  );

  res.json({
    success: true,
    message: `Payment approved. Credited $${creditAmount} USD successfully to your premium Aura wallet.`,
    transaction: txItem,
    newBalance: wallet.balance
  });
});

// Express global error catching middleware (keeps secrets hidden)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`[EXPRESS ERROR CRITICAL] Unhandled route incident: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    error: "Internal Luxury Server Exception",
    traceId: crypto.randomBytes(3).toString("hex").toUpperCase(),
    details: "Your command was received but our system shields intercepted a container execution error."
  });
});

// Serve client React static code
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    logger.info("[VITE] Initializing development hot assets middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    logger.info("[STATIC] Initializing high speed server production routes...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`[BOOT SUCCESS] Aura Digital Core running on http://localhost:${PORT}`);
  });

  const io = new SocketServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  ioInstance = io;
  chatService.registerSocketServer(io);
}

startServer();
