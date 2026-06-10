/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { User, Wallet, WalletTransaction, Order } from "../types";
import { logger } from "../utils/logger";

const DB_DIR = path.join(process.cwd(), ".data");

export interface CustomerDetail {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  createdAt: string;
  walletId: string;    // 8-digit unique wallet ID
  country: string;     // Country code (e.g. US, KW, JO, EG, SY, EU, SA, AE)
  currency: string;    // Selected currency code
  status: "active" | "suspended"; // Account status
  balance: number;     // Wallet balance in USD
  totalOrders: number;  // Count of total orders placed
  totalPaidAmountUSD: number; // Sum of total completed orders in USD
  transactions: WalletTransaction[]; // All transactions associated with this wallet
  orderHistory: Order[]; // Complete list of past orders
}

export class AdminService {
  private ensureDBFile(filename: string, defaultVal: any) {
    const file = path.join(DB_DIR, filename);
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultVal, null, 2), "utf8");
    }
  }

  constructor() {
    this.ensureDBFile("users.json", []);
    this.ensureDBFile("wallets.json", []);
    this.ensureDBFile("orders.json", []);
    this.ensureDBFile("wallet_transactions.json", []);
  }

  private readJson<T>(filename: string): T {
    const file = path.join(DB_DIR, filename);
    try {
      return JSON.parse(fs.readFileSync(file, "utf8")) as T;
    } catch {
      return [] as any as T;
    }
  }

  private writeJson<T>(filename: string, data: T) {
    const file = path.join(DB_DIR, filename);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  }

  public getCustomers(searchQuery?: string): CustomerDetail[] {
    const users = this.readJson<User[]>("users.json");
    const wallets = this.readJson<Wallet[]>("wallets.json");
    const orders = this.readJson<Order[]>("orders.json");
    const transactions = this.readJson<WalletTransaction[]>("wallet_transactions.json");

    logger.info(`[ADMIN SERVICE] Re-evaluating customer catalog. Total users on ledger: ${users.length}`);

    // Build enhanced details for each user
    const customerList: CustomerDetail[] = users.map(u => {
      // Find wallet
      let userWallet = wallets.find(w => w.userId === u.id);
      if (!userWallet) {
        userWallet = { userId: u.id, balance: u.role === "admin" ? 10000 : 150 };
      }

      // Assign fallback 8-digit wallet ID, country, currency, status if not defined on user
      const userExtended = u as any;
      const walletId = userExtended.walletId || this.generateDeterministicWalletId(u.id);
      const country = userExtended.country || "US";
      const currency = userExtended.currency || "USD";
      const status = userExtended.status || "active";

      // Orders summaries
      const userOrders = orders.filter(o => o.customerEmail.toLowerCase() === u.email.toLowerCase());
      const completedOrders = userOrders.filter(o => o.paymentStatus === "completed");
      const totalPaidAmountUSD = completedOrders.reduce((sum, o) => sum + o.priceUSD, 0);

      // Sourced Ledger Transactions
      const userTxs = transactions.filter(t => t.from === u.id || t.to === u.id)
                                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        walletId,
        country,
        currency,
        status,
        balance: userWallet.balance,
        totalOrders: userOrders.length,
        totalPaidAmountUSD,
        transactions: userTxs,
        orderHistory: userOrders
      };
    });

    // Handle filter query (searches by User ID, email, name, walletId, country, or currency)
    if (searchQuery && searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      return customerList.filter(c => 
        c.id.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.walletId.includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q)
      );
    }

    return customerList;
  }

  public editUserBalance(userId: string, newBalance: number): boolean {
    if (newBalance < 0) return false;
    const wallets = this.readJson<Wallet[]>("wallets.json");
    const walletIndex = wallets.findIndex(w => w.userId === userId);

    const oldBalance = walletIndex > -1 ? wallets[walletIndex].balance : 150;
    
    if (walletIndex > -1) {
      wallets[walletIndex].balance = Number(newBalance.toFixed(2));
    } else {
      wallets.push({ userId, balance: Number(newBalance.toFixed(2)) });
    }
    
    this.writeJson("wallets.json", wallets);

    // Record adjustment transaction in ledger
    const transactions = this.readJson<WalletTransaction[]>("wallet_transactions.json");
    const diff = newBalance - oldBalance;
    const txId = "TXID-ADJ-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    
    transactions.push({
      id: txId,
      from: diff >= 0 ? "ADMIN_CREDIT_INJECTION" : "ADMIN_RECOVERY_DEFLATION",
      to: userId,
      amount: Math.abs(diff),
      timestamp: new Date().toISOString()
    });

    this.writeJson("wallet_transactions.json", transactions);
    logger.warn(`[ADMIN ACTION] Manually changed User ID '${userId}' wallet balance: $${oldBalance} -> $${newBalance}. Ledger: ${txId}`);
    return true;
  }

  public setUserStatus(userId: string, status: "active" | "suspended"): boolean {
    const users = this.readJson<User[]>("users.json");
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex > -1) {
      const u = users[userIndex] as any;
      u.status = status;
      this.writeJson("users.json", users);
      logger.warn(`[ADMIN SECURITY] Handled User State Modifier on '${userId}': status toggled to '${status}'`);
      return true;
    }
    return false;
  }

  public getGlobalLedger(): WalletTransaction[] {
    const txs = this.readJson<WalletTransaction[]>("wallet_transactions.json");
    return txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private generateDeterministicWalletId(userId: string): string {
    // Generate a beautiful, stable, unique 8-digit string mapped deterministically to current user id
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absVal = Math.abs(hash);
    const result = (absVal % 90000000) + 10000000; // Force 8 digit length (starts with 10M to 99M)
    return result.toString();
  }
}

export const adminService = new AdminService();
