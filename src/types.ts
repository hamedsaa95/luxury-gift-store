/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  name_ar?: string;
  description: string;
  description_ar?: string;
  category: 'itunes' | 'pubg' | 'google';
  image: string; // Built-in SVG/Gradient key or placeholder URL
  options: {
    id: string;
    label: string; // e.g. "$10", "60 UC"
    priceUSD: number;
    value: string; // Actual value of the code deliverable
  }[];
  active: boolean;
}

export interface CodeProvider {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey: string;
  active: boolean;
  priority: number; // For failover priority routing (1 is highest)
  status: 'operational' | 'failing' | 'inactive';
  failoverEndpoint?: string;
  retryAttempts: number;
}

export interface ProviderLogItem {
  id: string;
  providerId: string;
  providerName: string;
  endpoint: string;
  status: 'success' | 'retry' | 'failover_triggered' | 'failed';
  message: string;
  responseTimeMs: number;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountPercent: number; // backwards compatibility, we'll synchronize this
  description: string;
  active: boolean;
  expiryDate?: string;
  assignedProductId?: string; // Specific product ID or undefined/all
}

export interface IPBlockItem {
  id: string;
  ip: string;
  reason: string;
  blockedAt: string;
}

export interface CurrencyConfig {
  code: string; // 'USD' | 'EUR' | 'AED' | 'GBP' | 'SAR'
  rate: number; // Conversion rate multiplier relative to USD
  symbol: string;
  label: string;
}

export interface PaymentGateway {
  id: 'stripe' | 'paypal' | 'crypto';
  name: string;
  enabled: boolean;
  publicKey?: string;
  secretKey?: string;
  applePayEnabled?: boolean;
  googlePayEnabled?: boolean;
}

export interface Order {
  id: string;
  customerEmail: string;
  customerName: string;
  productId: string;
  productName: string;
  optionId: string;
  optionLabel: string;
  priceUSD: number;
  priceOriginalCurrency: number;
  currencyCode: string;
  paymentMethod: 'stripe' | 'paypal' | 'crypto' | 'wallet';
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  codeDelivered: string | null;
  providerTraceId?: string; // Sourced provider log id
  providerUsedName?: string;
  couponApplied?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderEmail: string;
  isAdmin: boolean;
  text: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  walletId?: string; // Unique 8-digit ID
  country?: string; // Preferred Country (e.g. US, KW, JO)
  currency?: string; // Preferred Currency (e.g. USD, KWD, JOD)
  status?: 'active' | 'suspended'; // Suspend/activate indicator
  referredBy?: string; // The walletId of the referrer
}

export interface Wallet {
  userId: string;
  balance: number;
}

export interface WalletTransaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: string;
}

export type LanguageCode = 'ar' | 'en' | 'tr' | 'fr' | 'es' | 'de' | 'ru';

export interface TranslationDict {
  [key: string]: string;
  heroTitle: string;
  heroSub: string;
  categories: string;
  allProducts: string;
  buyNow: string;
  checkout: string;
  orderSummary: string;
  paymentMethod: string;
  stripePay: string;
  paypalPay: string;
  cryptoPay: string;
  completePayment: string;
  adminDashboard: string;
  orderStatus: string;
  orderCompleted: string;
  deliverySuccess: string;
  chatWithUs: string;
  email: string;
  name: string;
  phone: string;
  guestCheckout: string;
  instantDelivery: string;
  activeOrders: string;
  totalRevenue: string;
  productsCount: string;
  manageProducts: string;
  manageOrders: string;
  saveChanges: string;
  arabic: string;
  english: string;
  turkish: string;
  french: string;
  spanish: string;
  german: string;
  russian: string;
}

export interface Notification {
  id: string;
  userId: string;
  emailRecipient: string;
  title: string;
  message: string;
  type: 'payment_success' | 'code_delivered' | 'wallet_update' | 'referral_reward' | 'general';
  read: boolean;
  emailSent: boolean;
  createdAt: string;
}
