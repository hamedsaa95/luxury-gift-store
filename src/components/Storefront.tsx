/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { Product, Order, PaymentGateway, CurrencyConfig } from '../types';
import {
  Globe,
  ChevronDown,
  ShoppingBag,
  Ticket,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  User, Check, ArrowRight, Loader2, Sparkles, Coins, HelpCircle, Copy, Clock, BadgePercent, Heart,
  Menu, X, Send, ArrowUpRight, ArrowDownLeft, Plus, Info, MessageSquare, FileText, Gift, Bell
} from 'lucide-react';
import { LANGUAGES } from '../translations';
import { motion } from 'motion/react';
import { io } from 'socket.io-client';

export default function Storefront({
  onLoginSuccess,
  currentUserEmail,
  currentUserToken,
  onOpenAdminLink
}: {
  onLoginSuccess: (email: string, token: string, role: string) => void;
  currentUserEmail: string | null;
  currentUserToken: string | null;
  onOpenAdminLink: () => void;
}) {
  const { locale, setLocale, t, isRTL } = useLanguage();
  const [langDropdown, setLangDropdown] = useState(false);
  const [currencyDropdown, setCurrencyDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'itunes' | 'pubg' | 'google'>('all');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeOptionId, setActiveOptionId] = useState<string>('');
  
  // Checkout & Upsell states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutName, setCheckoutName] = useState('');
  const [selectedGateway, setSelectedGateway] = useState<'stripe' | 'paypal' | 'crypto'>('stripe');
  const [stripeMethod, setStripeMethod] = useState<'card' | 'apple-pay' | 'google-pay'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [autoAccountToken, setAutoAccountToken] = useState<string | null>(null);

  // Smart Selling Features
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; type: 'percentage' | 'fixed'; value: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [upsellSelected, setUpsellSelected] = useState(false);

  // Anti-Bot Quiz Challenge
  const [quizN1] = useState(() => Math.floor(Math.random() * 8) + 2);
  const [quizN2] = useState(() => Math.floor(Math.random() * 7) + 2);
  const [quizInput, setQuizInput] = useState('');
  const [quizError, setQuizError] = useState('');

  // Limited time offer state countdown state (e.g. counts down to mimic real urgency)
  const [timeLeft, setTimeLeft] = useState({ minutes: 14, seconds: 45 });

  // Multi-Currency list
  const [currencies, setCurrencies] = useState<CurrencyConfig[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyConfig>({ code: 'USD', rate: 1.0, symbol: '$', label: 'US Dollar' });

  // Authenticated customer historical orders
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [showOrderHistory, setShowOrderHistory] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);

  // Admin login screen overlay
  const [adminOverlay, setAdminOverlay] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminTotp, setAdminTotp] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [adminError, setAdminError] = useState('');

  // State for copied feedback ticks
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Advanced Page navigation & Sidebar states
  const [currentPage, setCurrentPage] = useState<'home' | 'gift-cards' | 'guidelines' | 'support' | 'wallet' | 'referral' | 'orders'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Unified Fintech Wallet state
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletUserId, setWalletUserId] = useState<string | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [walletId, setWalletId] = useState<string>('');
  const [referredCount, setReferredCount] = useState<number>(0);
  const [referredList, setReferredList] = useState<any[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  
  // Real-time notifications system parameters
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  
  // Wallet Interaction inputs
  const [transferToId, setTransferToId] = useState('');
  const [transferAmt, setTransferAmt] = useState('');
  const [topupAmt, setTopupAmt] = useState('');
  const [walletSuccess, setWalletSuccess] = useState('');
  const [walletError, setWalletError] = useState('');
  const [isWalletActionProcessing, setIsWalletActionProcessing] = useState(false);

  // Support Page Contact Form interactive parameters
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportTopic, setSupportTopic] = useState('billing');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSentSuccess, setSupportSentSuccess] = useState('');
  const [supportSending, setSupportSending] = useState(false);

  // Support Live-Chat panel inputs
  const [chatInputText, setChatInputText] = useState('');
  const [chatLogs, setChatLogs] = useState<any[]>([
    { id: 'initial-1', text: 'Welcome to Aura Concierge desk. How can we elevate your digital asset holdings today?', isAdmin: true, createdAt: new Date().toISOString() }
  ]);

  // Flash Countdown loop
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        } else {
          return { minutes: 14, seconds: 59 }; // Reset loop nicely
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sniff and capture incoming referral code from URL search parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const queryParams = new URLSearchParams(window.location.search);
      const inviteCode = queryParams.get('ref');
      if (inviteCode) {
        localStorage.setItem('aura_referral_code', inviteCode.trim());
        console.log('[AURA REFERRAL] Extracted active referrer wallet key:', inviteCode);
      }
    }
  }, []);

  // Fetch store dynamic assets
  const loadInitData = async () => {
    try {
      const res = await fetch('/api/init');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setCurrencies(data.currencies || []);
        
        // Auto Currency Selection via language/geo detection helpers
        if (data.currencies && data.currencies.length > 0) {
          const userZone = navigator.language.toLowerCase();
          let matchedGeoCurrency = data.currencies.find((c: any) => c.code === 'USD');
          if (userZone.includes('ar') || userZone.includes('sa')) {
            matchedGeoCurrency = data.currencies.find((c: any) => c.code === 'SAR') || data.currencies.find((c: any) => c.code === 'AED');
          } else if (userZone.includes('fr') || userZone.includes('de') || userZone.includes('es')) {
            matchedGeoCurrency = data.currencies.find((c: any) => c.code === 'EUR');
          } else if (userZone.includes('gb') || userZone.includes('uk')) {
            matchedGeoCurrency = data.currencies.find((c: any) => c.code === 'GBP');
          }
          if (matchedGeoCurrency) {
            setSelectedCurrency(matchedGeoCurrency);
          }
        }

        // Setup gateways
        const resGateways = await fetch('/api/gateways');
        if (resGateways.ok) {
          const gData = await resGateways.json();
          setGateways(gData);
          const firstEnabled = gData.find((g: any) => g.enabled);
          if (firstEnabled) {
            setSelectedGateway(firstEnabled.id);
          }
        }
      }
    } catch (e) {
      console.error("Initialize data loading errors: ", e);
    }
  };

  const handleCurrencyChange = async (curr: CurrencyConfig) => {
    setSelectedCurrency(curr);
    setCurrencyDropdown(false);
    if (!currentUserToken) return;

    let countryCode = "US";
    if (curr.code === "SAR") countryCode = "SA";
    else if (curr.code === "AED") countryCode = "AE";
    else if (curr.code === "EUR") countryCode = "FR";
    else if (curr.code === "GBP") countryCode = "GB";
    else if (curr.code === "KWD") countryCode = "KW";

    try {
      await fetch('/api/auth/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUserToken}`
        },
        body: JSON.stringify({
          country: countryCode,
          currency: curr.code
        })
      });
    } catch (err) {
      console.error("Failed saving preferred currency to server", err);
    }
  };

  useEffect(() => {
    loadInitData();
  }, []);

  // Sync personal logs for authenticated accounts
  useEffect(() => {
    if (currentUserToken) {
      const loadUserOrders = async () => {
        try {
          const r = await fetch('/api/orders', {
            headers: { Authorization: `Bearer ${currentUserToken}` }
          });
          if (r.ok) {
            setCustomerOrders(await r.json());
          }
        } catch (e) {
          console.error(e);
        }
      };
      loadUserOrders();
    }
  }, [currentUserToken, completedOrder]);

  // Load Wallet state
  const loadWalletInfo = async () => {
    if (!currentUserToken) return;
    setWalletLoading(true);
    try {
      const balRes = await fetch('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${currentUserToken}` }
      });
      if (balRes.ok) {
        const balData = await balRes.json();
        setWalletBalance(balData.balance);
        setWalletUserId(balData.userId);
        setWalletId(balData.walletId || '');
        setReferredCount(balData.referredCount || 0);
      }
      
      const txRes = await fetch('/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${currentUserToken}` }
      });
      if (txRes.ok) {
        setWalletTransactions(await txRes.json());
      }

      // Fetch dynamic list of referred users for the Invite panel
      const refListRes = await fetch('/api/wallet/my-referrals', {
        headers: { Authorization: `Bearer ${currentUserToken}` }
      });
      if (refListRes.ok) {
        setReferredList(await refListRes.json());
      }
    } catch (err) {
      console.error("Wallet loading error:", err);
    } finally {
      setWalletLoading(false);
    }
  };

  // Real-time notifications loader & listener
  const loadNotifications = async () => {
    if (!currentUserToken) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${currentUserToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        const unreadCount = data.filter((n: any) => !n.read).length;
        setUnreadNotifCount(unreadCount);
      }
    } catch (err) {
      console.error("Notifications loader error:", err);
    }
  };

  const markNotificationRead = async (id?: string, all?: boolean) => {
    if (!currentUserToken) return;
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUserToken}`
        },
        body: JSON.stringify({ id, all })
      });
      if (res.ok) {
        if (all) {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          setUnreadNotifCount(0);
        } else if (id) {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
          setUnreadNotifCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUserToken) {
      loadWalletInfo();
      loadNotifications();
    }
  }, [currentUserToken]);

  // Socket connection for notifications (and custom refresh triggers)
  useEffect(() => {
    if (!currentUserToken || !walletUserId) return;

    // Connect socket safely with fallback port configurations
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    // Listen to custom notification updates for current logged in userId
    const userChannel = `notification_${walletUserId}`;
    socket.on(userChannel, (newNotif: any) => {
      console.log("[SOCKET NOTIFICATION RECEIVED]", newNotif);
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadNotifCount(prev => prev + 1);

      // Trigger standard data updates depending on notification type to enable smooth real-time dashboard updates!
      if (newNotif.type === 'wallet_update' || newNotif.type === 'referral_reward') {
        loadWalletInfo();
      }
      
      // Auto refresh user orders roster if payment / code deliver confirms
      if (newNotif.type === 'payment_success' || newNotif.type === 'code_delivered') {
        // Fetch fresh list
        const loadFreshOrders = async () => {
          try {
            const r = await fetch('/api/orders', {
              headers: { Authorization: `Bearer ${currentUserToken}` }
            });
            if (r.ok) {
              setCustomerOrders(await r.json());
            }
          } catch (e) {
            console.error(e);
          }
        };
        loadFreshOrders();
      }
    });

    return () => {
      socket.off(userChannel);
      socket.disconnect();
    };
  }, [currentUserToken, walletUserId]);

  // Handle direct money transfer
  const handleTransferMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletError('');
    setWalletSuccess('');
    if (!transferToId.trim() || !transferAmt.trim()) {
      setWalletError("All fields are required.");
      return;
    }
    const amt = parseFloat(transferAmt);
    if (isNaN(amt) || amt <= 0) {
      setWalletError("Amount must be a positive number.");
      return;
    }
    
    setIsWalletActionProcessing(true);
    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUserToken}`
        },
        body: JSON.stringify({
          to: transferToId.trim(),
          amount: amt
        })
      });
      const data = await res.json();
      if (res.ok) {
        setWalletSuccess(data.message || `Transferred $${amt} successfully!`);
        setTransferToId('');
        setTransferAmt('');
        loadWalletInfo(); // reload actual fresh balances
      } else {
        setWalletError(data.error || "Transfer failed.");
      }
    } catch (err) {
      setWalletError("Network error during transfer.");
    } finally {
      setIsWalletActionProcessing(false);
    }
  };

  // Handle top-up wallet
  const handleTopupWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletError('');
    setWalletSuccess('');
    if (!topupAmt.trim()) {
      setWalletError("Amount is required.");
      return;
    }
    const amt = parseFloat(topupAmt);
    if (isNaN(amt) || amt <= 0) {
      setWalletError("Amount must be a positive number.");
      return;
    }

    setIsWalletActionProcessing(true);
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUserToken}`
        },
        body: JSON.stringify({ amount: amt })
      });
      const data = await res.json();
      if (res.ok) {
        setWalletSuccess(data.message || `Topped up $${amt} successfully!`);
        setTopupAmt('');
        loadWalletInfo(); // reload actual fresh balances
      } else {
        setWalletError(data.error || "Top-up failed.");
      }
    } catch (err) {
      setWalletError("Network error during top-up.");
    } finally {
      setIsWalletActionProcessing(false);
    }
  };

  // Handle Support Contact form
  const handleSendSupportMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportSentSuccess('');
    if (!supportName.trim() || !supportEmail.trim() || !supportMessage.trim()) {
      return;
    }
    
    setSupportSending(true);
    // Simulate premium support service integration with brief loading delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    setSupportSentSuccess("Your ticket was successfully registered inside Aura Concierge vaults! Check your email or live chat history for followups.");
    setSupportMessage('');
    setSupportSending(false);
  };

  // Handle Support Interactive Chat console
  const handleSendSupportChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;

    const userMsg = {
      id: "msg-" + Math.random().toString(36).substring(2, 9),
      text: chatInputText,
      isAdmin: false,
      createdAt: new Date().toISOString()
    };
    
    setChatLogs(prev => [...prev, userMsg]);
    const txtToSend = chatInputText;
    setChatInputText('');

    // Fetch live bot response simulation from actual backend endpoints to keep server and client chats robustly aligned!
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: txtToSend, email: currentUserEmail || "anonymous_concierge" })
      });
      if (res.ok) {
        // Since backend bot message responds with 1.1s lag, we can load fresh messages as they come!
        setTimeout(async () => {
          try {
            const freshRes = await fetch(`/api/chat/messages?email=${encodeURIComponent(currentUserEmail || "anonymous_concierge")}`);
            if (freshRes.ok) {
              const freshMsgs = await freshRes.json();
              if (freshMsgs && freshMsgs.length > 0) {
                // Update local chatLogs with unique messages by appending the latest
                setChatLogs(prev => {
                  const merged = [...prev];
                  freshMsgs.forEach((m: any) => {
                    if (!merged.some(msg => msg.text === m.text && Math.abs(new Date(msg.createdAt).getTime() - new Date(m.createdAt).getTime()) < 5000)) {
                      merged.push({ id: m.id, text: m.text, isAdmin: m.isAdmin, createdAt: m.createdAt });
                    }
                  });
                  return merged;
                });
              }
            }
          } catch (rErr) {
            console.error(rErr);
          }
        }, 1500);
      }
    } catch (e) {
      // Offline fallback bot replies
      setTimeout(() => {
        setChatLogs(prev => [...prev, {
          id: "msgBot-" + Math.random().toString(36).substring(2, 9),
          text: "Help desk operator queue verified. Aura is on SLA alignment.",
          isAdmin: true,
          createdAt: new Date().toISOString()
        }]);
      }, 1000);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPass,
          totpCode: adminTotp || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.twoFactorRequired) {
          setTotpRequired(true);
          return;
        }
        if (data.user?.role === 'admin') {
          onLoginSuccess(data.user.email, data.token, 'admin');
          setAdminOverlay(false);
          onOpenAdminLink();
        } else {
          setAdminError('Access Denied: Elite clearance credentials required.');
        }
      } else {
        setAdminError(data.error || 'Identity verification lookup failed.');
      }
    } catch (err) {
      setAdminError('API network response timed-out.');
    }
  };

  const handleInitiateBuyNow = (prod: Product) => {
    setActiveProduct(prod);
    setAppliedDiscount(null);
    setCouponCode('');
    setCouponSuccess('');
    setCouponError('');
    setUpsellSelected(false);
    setQuizInput('');
    setQuizError('');
    
    if (prod.options && prod.options.length > 0) {
      setActiveOptionId(prod.options[0].id);
    }
    setIsCheckoutOpen(true);
    setCompletedOrder(null);
  };

  // Submit Coupons for active discounts check
  const handleValidateCoupon = async () => {
    setCouponError('');
    setCouponSuccess('');
    if (!couponCode.trim()) return;

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, productId: activeProduct?.id })
      });
      const data = await res.json();
      if (res.ok) {
        setAppliedDiscount({ 
          code: data.code, 
          type: data.discountType || 'percentage', 
          value: data.discountValue 
        });
        if (data.discountType === 'fixed') {
          setCouponSuccess(`Coupon approved! -$${data.discountValue} USD flat discount applied.`);
        } else {
          setCouponSuccess(`Coupon approved! -${data.discountValue}% VIP discount applied.`);
        }
      } else {
        setCouponError(data.error || 'Unknown coupon tag.');
        setAppliedDiscount(null);
      }
    } catch (e) {
      setCouponError('Error syncing validation checks.');
      setAppliedDiscount(null);
    }
  };

  // Checkout process with interactive anti-bot evaluation quiz
  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct || !activeOptionId || !checkoutEmail) return;

    // Quiz Verification check matches user intent anti-bot criteria
    const solution = quizN1 + quizN2;
    if (parseInt(quizInput.trim() || '0', 10) !== solution) {
      setQuizError(`Security Verification Failed. What is ${quizN1} + ${quizN2}?`);
      return;
    }
    setQuizError('');
    setIsProcessing(true);

    try {
      // Create pending database record
      const checkoutRes = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerEmail: checkoutEmail,
          customerName: checkoutName || "Elite Client",
          productId: activeProduct.id,
          optionId: activeOptionId,
          paymentMethod: selectedGateway,
          currencyCode: selectedCurrency.code,
          couponCode: appliedDiscount ? appliedDiscount.code : couponCode || undefined
        })
      });

      if (!checkoutRes.ok) {
        const errObj = await checkoutRes.json();
        throw new Error(errObj.error || "Invoice checkout declined.");
      }

      const checkoutData = await checkoutRes.json();
      const order = checkoutData.order;

      // Settle simulated pipeline latency for anti-fraud scanning logs
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Trigger automatic failover sourcing endpoint from providers
      const payRes = await fetch(`/api/orders/${order.id}/process-payment`, {
        method: 'POST'
      });

      if (payRes.ok) {
        const payData = await payRes.json();
        setCompletedOrder(payData.order);
        setAutoAccountToken(payData.token);
        
        if (payData.token && payData.user) {
          onLoginSuccess(payData.user.email, payData.token, 'user');
        }
      }
    } catch (err: any) {
      alert(err.message || "An exception occurred during secure routing.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Sourced selections variables
  const activeOption = activeProduct?.options.find(o => o.id === activeOptionId);
  const activeLanguageName = LANGUAGES.find(l => l.code === locale)?.name || 'Arabic';

  // Compute calculated pricing matrix
  const getCalculatedPrice = () => {
    if (!activeOption) return 0;
    let price = activeOption.priceUSD;
    if (appliedDiscount) {
      if (appliedDiscount.type === 'fixed') {
        price = Math.max(0, price - appliedDiscount.value);
      } else {
        price = price * (1 - appliedDiscount.value / 100);
      }
    }
    // Auto volume deduction
    if (activeOption.priceUSD >= 100) {
      price = price * 0.98;
    }
    // High premium checkout cross-sell up-sell
    if (upsellSelected) {
      price = price + 4.25; // adds highly discounted complementary asset
    }
    return Number((price * selectedCurrency.rate).toFixed(2));
  };

  const formattedTime = `${timeLeft.minutes.toString().padStart(2, '0')}:${timeLeft.seconds.toString().padStart(2, '0')}`;

  return (
    <div className="w-full relative min-h-screen bg-[#070707] text-gray-100 font-sans luxury-ambient-bg selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]" dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Dynamic Midnight Urgency Urge Banner */}
      <div className="w-full bg-gradient-to-r from-[#D4AF37] via-[#8A2BE2] to-[#00C9A7] text-black font-semibold text-center text-xs py-2 px-4 shadow-[0_4px_15px_rgba(138,43,226,0.25)] flex flex-wrap justify-center items-center gap-2 relative z-50">
        <Clock className="w-4 h-4 animate-pulse" />
        <span>LIMITED-TIME PROMOTION: Use coupon <strong className="font-mono bg-black/10 px-1.5 py-0.5 rounded">FLASH50</strong> to claim 50% discount on dynamic store inventory. Vault closing in:</span>
        <span className="font-mono bg-black text-[#D4AF37] px-2 py-0.5 rounded font-black tracking-widest">{formattedTime}</span>
      </div>

      {/* Luxury Navigation Header */}
      <header className="relative z-40 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-black/25">
        <div className="flex items-center gap-2">
          <div className="p-2 border border-[#D4AF37] rounded font-display font-black text-xl tracking-widest text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)]">
            AURA
          </div>
          <span className="text-[10px] font-mono tracking-widest text-gray-400 font-medium select-none ml-2 hidden sm:inline">HIGH-END DIGITAL VAULTS</span>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-4">

          {/* Real-time Notification Bell Icon & Live Dropdown list */}
          {currentUserEmail && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                  setCurrencyDropdown(false);
                  setLangDropdown(false);
                }}
                className="relative p-2 bg-[#121212] hover:bg-white/5 border border-white/10 hover:border-[#D4AF37]/50 rounded text-gray-300 transition-all cursor-pointer flex items-center justify-center"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-[9px] text-white rounded-full flex items-center justify-center font-bold animate-pulse">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className={`absolute top-full mt-2 w-80 bg-[#0C0C0C] border border-[#D4AF37]/35 rounded-xl shadow-[0_12px_45px_rgba(0,0,0,0.95)] z-50 overflow-hidden font-sans ${locale === 'ar' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'}`}>
                  <div className="p-3 bg-[#121212] border-b border-white/5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      {locale === 'ar' ? 'الإشعارات الفورية' : 'Live Notifications'}
                    </span>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={() => markNotificationRead(undefined, true)}
                        className="text-[10px] text-[#D4AF37] hover:underline cursor-pointer"
                      >
                        {locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-500 italic">
                        {locale === 'ar' ? 'لا توجد إشعارات جديدة حالياً.' : 'No active alerts in registry.'}
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const iconMap = {
                          payment_success: '💰',
                          code_delivered: '🔑',
                          wallet_update: '💳',
                          referral_reward: '🎁',
                          general: 'ℹ️'
                        };
                        const emoji = iconMap[notif.type as keyof typeof iconMap] || '🔔';

                        return (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (!notif.read) markNotificationRead(notif.id);
                            }}
                            className={`p-3 text-xs transition-colors hover:bg-white/5 cursor-pointer flex items-start gap-2.5 ${!notif.read ? 'bg-white/5 font-medium' : 'text-gray-400'}`}
                          >
                            <span className="text-sm select-none">{emoji}</span>
                            <div className="flex-1 space-y-0.5 min-w-0">
                              <div className="flex justify-between items-baseline gap-2">
                                <span className={`truncate text-[11px] ${!notif.read ? 'text-[#D4AF37]' : 'text-gray-300'}`}>
                                  {notif.heading}
                                </span>
                                <span className="text-[8px] text-gray-500 whitespace-nowrap">
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 leading-normal break-words">
                                {notif.message}
                              </p>
                            </div>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full self-center flex-shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Geo-Based Currency Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setCurrencyDropdown(!currencyDropdown);
                setLangDropdown(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121212] border border-white/10 hover:border-[#D4AF37]/50 rounded text-xs text-gray-300 transition-all font-mono"
            >
              <Coins className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{selectedCurrency.code} ({selectedCurrency.symbol})</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {currencyDropdown && (
              <div className="absolute top-full mt-2 right-0 w-52 bg-[#0B0B0B] border border-[#D4AF37]/30 rounded-lg shadow-[0_8px_25px_rgba(0,0,0,0.85)] z-50 py-1.5 overflow-hidden">
                {currencies.map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => {
                      handleCurrencyChange(curr);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-[#8A2BE2]/20 hover:text-[#D4AF37] flex items-center justify-between ${selectedCurrency.code === curr.code ? 'text-[#D4AF37] font-bold bg-[#D4AF37]/5' : 'text-gray-400'}`}
                  >
                    <span className="font-mono font-medium">{curr.label}</span>
                    <span className="font-mono text-[10px] bg-white/5 py-0.5 px-1.5 rounded text-white">{curr.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Multi-language Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setLangDropdown(!langDropdown);
                setCurrencyDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#121212] border border-white/10 hover:border-[#D4AF37]/50 rounded text-xs text-gray-300 transition-all font-mono"
            >
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>{activeLanguageName}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {langDropdown && (
              <div className="absolute top-full mt-2 right-0 w-44 bg-[#0B0B0B] border border-[#D4AF37]/20 rounded-lg shadow-[0_8px_25px_rgba(0,0,0,0.85)] z-50 py-1.5 overflow-hidden">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLocale(lang.code);
                      setLangDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] flex items-center justify-between ${locale === lang.code ? 'text-[#D4AF37] font-semibold bg-[#D4AF37]/5' : 'text-gray-400'}`}
                  >
                    <span>{lang.name}</span>
                    {locale === lang.code && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Active Session checking */}
          {currentUserEmail ? (
            <button
              onClick={() => setShowOrderHistory(!showOrderHistory)}
              className="px-3.5 py-1.5 bg-[#180F30] hover:bg-[#251A47] border border-[#8A2BE2]/40 text-[#D4AF37] rounded text-xs font-mono flex items-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(138,43,226,0.2)]"
            >
              <User className="w-3.5 h-3.5" />
              <span>{currentUserEmail.split('@')[0].toUpperCase()}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setAdminOverlay(true);
                setTotpRequired(false);
                setAdminTotp('');
              }}
              className="px-3.5 py-1.5 border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs font-display font-semibold rounded text-[#D4AF37] transition-all"
            >
              Elite Vault Desk
            </button>
          )}

          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-[#121212] hover:bg-[#1a1a1a] border border-white/10 hover:border-[#D4AF37]/60 rounded text-gray-300 hover:text-[#D4AF37] transition-all flex items-center justify-center shadow-lg"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Animated Modern Sidebar (Dark Luxury UI) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar drawer card */}
          <div className="absolute inset-y-0 right-0 w-80 max-w-full bg-[#0a0a0a] border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col justify-between z-50 p-6">
            <div className="space-y-8">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 border border-[#D4AF37] rounded font-display font-bold text-sm tracking-widest text-[#D4AF37]">
                    AURA
                  </div>
                  <span className="text-[9px] font-mono tracking-widest text-gray-400 font-bold uppercase animate-pulse">Vault Menu</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-[#D4AF37] rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-3">
                {[
                  { id: 'home', label: locale === 'ar' ? 'البوابة الرئيسية' : 'Home Portal', icon: Sparkles },
                  { id: 'gift-cards', label: locale === 'ar' ? 'خزانة بطاقات الهدايا' : 'Gift Card Vault', icon: ShoppingBag },
                  { id: 'guidelines', label: locale === 'ar' ? 'إجراءات العمل و SLA' : 'Guidelines & SLA', icon: HelpCircle },
                  { id: 'support', label: locale === 'ar' ? 'الدعم التلقائي والكونسيرج' : 'Concierge Support', icon: MessageSquare },
                  { id: 'wallet', label: locale === 'ar' ? 'المحفظة الرقمية والتحاويل' : 'Fintech Wallet', icon: Coins },
                  { id: 'referral', label: locale === 'ar' ? 'دعوة الأصدقاء واربح 15$' : 'Invite & Earn $15', icon: Gift },
                  { id: 'orders', label: locale === 'ar' ? 'طلباتي ومتابعتها' : 'My Orders Portal', icon: Ticket }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentPage(item.id as any);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 bg-black/30 border text-xs font-display tracking-widest uppercase transition-all py-3 rounded-lg ${
                        isActive
                          ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_15px_rgba(212,175,55,0.15)] font-bold'
                          : 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Footer with Active Wallet Quick Glance */}
            <div className="border-t border-white/5 pt-6 space-y-4">
              {currentUserEmail ? (
                <div className="p-3 bg-[#111111] rounded-lg border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                    <span>WALLED USER</span>
                    <span className="text-gray-400 font-semibold">{walletUserId || "Loading..."}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-400">Balance:</span>
                    <span className="text-xs font-mono font-bold text-[#D4AF37]">
                      {walletBalance !== null ? `$${walletBalance.toFixed(2)}` : 'Loading...'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentPage('wallet');
                      setIsSidebarOpen(false);
                    }}
                    className="w-full mt-2 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black text-[10px] font-mono uppercase tracking-widest font-bold border border-[#D4AF37]/35 rounded transition-colors"
                  >
                    Open Wallet
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-[#121212] rounded-lg border border-white/5 space-y-2">
                  <span className="text-[10px] text-gray-400 block tracking-tight font-light">Join the Elite vaults today to lock dynamic starting credits.</span>
                  <button
                    onClick={() => {
                      setAdminOverlay(true);
                      setIsSidebarOpen(false);
                    }}
                    className="w-full py-2 bg-gradient-to-r from-[#D4AF37] to-[#8A2BE2] text-black font-display font-semibold text-[10px] tracking-wider uppercase rounded-md shadow-lg"
                  >
                    Authenticate Desk
                  </button>
                </div>
              )}

              <div className="text-center text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                AURA PLATFORM © 2026
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Historical Vault Orders tab */}
      {showOrderHistory && currentUserEmail && (
        <div className="relative z-40 max-w-7xl mx-auto px-6 mt-4">
          <div className="p-6 bg-[#0E0E0E]/95 border border-[#8A2BE2]/30 rounded-xl space-y-4 premium-purple-glow backdrop-blur-xl">
            <h3 className="text-sm font-display font-semibold tracking-wider text-[#D4AF37] uppercase border-b border-white/5 pb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Historical Delivery Vault Registry
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
              {customerOrders.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No voucher delivery records logged in cache.</p>
              ) : (
                customerOrders.map(ord => (
                  <div key={ord.id} className="p-4 bg-black/40 border border-white/5 rounded-lg flex flex-col justify-between hover:border-[#D4AF37]/30 transition-all">
                    <div>
                      <div className="flex justify-between items-center text-xs font-mono mb-1">
                        <span className="font-bold text-white text-xs">{ord.id}</span>
                        <span className="text-gray-500">{new Date(ord.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs font-medium text-gray-300">
                        {ord.productName} ({ord.optionLabel})
                        {ord.couponApplied && <span className="ml-2.5 text-[9px] text-[#D4AF37] bg-[#D4AF37]/10 py-0.5 px-2 rounded">Applied coupon: {ord.couponApplied}</span>}
                      </p>
                      <span className="text-[10px] font-mono text-gray-500">Processed Sourcing SLA: {ord.providerUsedName || "High-Priority Queue"}</span>
                    </div>
                    {ord.codeDelivered && (
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[9px] text-[#D4AF37] font-mono">DELIVERED PIN</span>
                        <code className="text-xs text-white bg-black/80 px-2 py-1 rounded border border-[#D4AF37]/10 select-text font-mono truncate max-w-[200px]">
                          {ord.codeDelivered}
                        </code>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Content Switching Panels */}
      {currentPage === 'home' && (
        <div className="space-y-16 pb-20">
          {/* Luxury Hero banner */}
          <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full text-xs text-[#D4AF37]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-mono uppercase tracking-widest text-[9px] font-semibold">{t.instantDelivery}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-6xl font-display font-light tracking-tight leading-tight"
            >
              <span className="luxury-text-gradient font-medium">{t.heroTitle}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-2xl mx-auto text-sm md:text-sm text-gray-400 font-light leading-relaxed font-sans"
            >
              {t.heroSub}
            </motion.p>

            <div className="pt-4 flex justify-center gap-4">
              <button
                onClick={() => setCurrentPage('gift-cards')}
                className="px-6 py-3 bg-[#D4AF37] hover:bg-[#c29d2f] text-black font-display font-semibold rounded-lg text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(212,175,55,0.35)] flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Explore Gift Card Vault</span>
              </button>
              <button
                onClick={() => setCurrentPage('wallet')}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold rounded-lg hover:border-[#D4AF37] text-[#D4AF37] transition-all flex items-center gap-2 cursor-pointer"
              >
                <Coins className="w-4 h-4" />
                <span>Access Fintech Wallet</span>
              </button>
            </div>
          </section>

          {/* Premium Loyalty tier highlights & SLA Badges */}
          <section className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-2">
                <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
                <h4 className="text-sm font-bold text-white font-display">100% Secure Custody</h4>
                <p className="text-xs text-gray-400 font-light font-sans">Every voucher generated is cryptographically signed and sourced from direct API provider keys.</p>
              </div>
              <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-2">
                <Clock className="w-6 h-6 text-purple-400" />
                <h4 className="text-sm font-bold text-white font-display">2-Sec Guaranteed SLA</h4>
                <p className="text-xs text-gray-400 font-light font-sans">Automatic failover systems trigger alternate backup routes instantly to maintain fast code dispatch.</p>
              </div>
              <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-2">
                <Coins className="w-6 h-6 text-emerald-400" />
                <h4 className="text-sm font-bold text-white font-display">Aura Member Trials</h4>
                <p className="text-xs text-gray-400 font-light font-sans">Unlock a premium wallet with credit balances pre-allocated upon register verification.</p>
              </div>
            </div>
          </section>

          {/* Featured Highlights / HOT PROMOS */}
          <section className="max-w-7xl mx-auto px-6 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#D4AF37]">HOT VAULT INVENTORY</h3>
                <h2 className="text-lg font-bold text-white font-display mt-1">Featured Dynamic Products</h2>
              </div>
              <button 
                onClick={() => setCurrentPage('gift-cards')}
                className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-mono cursor-pointer"
              >
                <span>View Full Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.slice(0, 3).map((prod) => (
                <div key={prod.id} className="p-6 bg-[#0E0E0E] border border-white/5 rounded-xl flex flex-col justify-between hover:border-[#D4AF37]/45 transition-all">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest px-2.5 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] uppercase">{prod.category}</span>
                    <h4 className="text-sm font-bold mt-3 text-white font-display">
                      {locale === 'ar' && prod.name_ar ? prod.name_ar : prod.name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1.5 font-light leading-relaxed line-clamp-2">
                      {locale === 'ar' && prod.description_ar ? prod.description_ar : prod.description}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleInitiateBuyNow(prod)}
                    className="w-full mt-4 py-2 bg-black hover:bg-[#D4AF37] border border-[#D4AF37]/30 text-[#D4AF37] hover:text-black font-display font-semibold rounded text-xs transition-all cursor-pointer"
                  >
                    {locale === 'ar' ? 'تهيئة فئات الشراء' : 'Configure Denomination'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Slipped complementary tailored bundle pairings */}
          <section className="max-w-7xl mx-auto px-6 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-base font-display font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Sourced Tailored Bundles & Pairings
                </h2>
                <p className="text-xs text-gray-400">Our engine frequently pairs these vouchers for complete region platform access.</p>
              </div>
              <span className="text-[9px] font-mono text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded">REAL-TIME AUTO-RECOMMENDATIONS</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#120C1F] to-[#0A0712] border border-[#8A2BE2]/30 flex flex-col md:flex-row gap-5 items-center justify-between">
                <div className="space-y-1.5 flex-1">
                  <span className="text-[10px] uppercase font-mono text-[#D4AF37] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Best Seller Match
                  </span>
                  <h4 className="text-sm font-bold text-white font-sans">Apple iTunes US + Google Play Starter Load</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Combine iOS access and Google Play store accounts with complementary pricing. Save 5% extra automatically during midnight checkout.</p>
                </div>
                <button
                  onClick={() => {
                    const playStore = products.find(p => p.category === 'google');
                    if (playStore) handleInitiateBuyNow(playStore);
                  }}
                  className="px-4 py-2 bg-[#121212] hover:bg-[#8A2BE2] text-[#D4AF37] hover:text-white rounded border border-[#8A2BE2]/40 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                >
                  Get Bundle
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1F190C] to-[#0E0B05] border border-[#D4AF37]/30 flex flex-col md:flex-row gap-5 items-center justify-between">
                <div className="space-y-1.5 flex-1">
                  <span className="text-[10px] uppercase font-mono text-purple-400 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" /> Gamer's Pick
                  </span>
                  <h4 className="text-sm font-bold text-white font-sans">PUBG Mobile Elite Royale Companion</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Unlock complete elite seasonal cosmetic packages. Sourced dynamically from direct global failover providers for instant loadout access.</p>
                </div>
                <button
                  onClick={() => {
                    const pubg = products.find(p => p.category === 'pubg');
                    if (pubg) handleInitiateBuyNow(pubg);
                  }}
                  className="px-4 py-2 bg-[#121212] hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black rounded border border-[#D4AF37]/40 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                >
                  Get UC
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* GIFT CARDS TABBED FULL CATALOG RENDER */}
      {currentPage === 'gift-cards' && (
        <div className="space-y-8 pb-20">
          {/* Premium Categories Filter list */}
          <section className="relative z-10 max-w-7xl mx-auto px-6 pt-10">
            <div className="flex flex-col items-center gap-6">
              <h2 className="text-xs font-mono tracking-widest uppercase text-[#D4AF37] font-bold">{t.categories}</h2>
              <div className="flex flex-wrap gap-2.5 justify-center">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-5 py-2.5 rounded text-xs transition-all font-display tracking-wider border cursor-pointer ${selectedCategory === 'all' ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-semibold shadow-[0_0_20px_rgba(212,175,55,0.4)] hover-gold-text' : 'bg-[#121212]/90 border-white/5 text-gray-400 hover:text-white hover:border-white/20'}`}
                >
                  All Assets
                </button>
                <button
                  onClick={() => setSelectedCategory('itunes')}
                  className={`px-5 py-2.5 rounded text-xs transition-all font-display tracking-wider border cursor-pointer ${selectedCategory === 'itunes' ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-semibold shadow-[0_0_20px_rgba(212,175,55,0.4)] hover-gold-text' : 'bg-[#121212]/90 border-white/5 text-gray-400 hover:text-white hover:border-white/20'}`}
                >
                  Apple iTunes Store
                </button>
                <button
                  onClick={() => setSelectedCategory('pubg')}
                  className={`px-5 py-2.5 rounded text-xs transition-all font-display tracking-wider border cursor-pointer ${selectedCategory === 'pubg' ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-semibold shadow-[0_0_20px_rgba(212,175,55,0.4)] hover-gold-text' : 'bg-[#121212]/90 border-white/5 text-gray-400 hover:text-white hover:border-white/20'}`}
                >
                  PUBG Mobile UC
                </button>
                <button
                  onClick={() => setSelectedCategory('google')}
                  className={`px-5 py-2.5 rounded text-xs transition-all font-display tracking-wider border cursor-pointer ${selectedCategory === 'google' ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-semibold shadow-[0_0_20px_rgba(212,175,55,0.4)] hover-gold-text' : 'bg-[#121212]/90 border-white/5 text-gray-400 hover:text-white hover:border-white/20'}`}
                >
                  Google Play Reserve
                </button>
              </div>
            </div>
          </section>

          {/* Luxury Product Listing GRID */}
          <section className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {products.filter(p => selectedCategory === 'all' || p.category === selectedCategory).map((prod) => (
                <div
                  key={prod.id}
                  className="relative p-6 rounded-2xl bg-[#0E0E0E]/95 border border-white/10 hover:border-[#D4AF37]/50 shadow-[0_15px_35px_rgba(0,0,0,0.8)] neon-border-pulse transition-all duration-300 flex flex-col justify-between group overflow-hidden"
                >
                  <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br from-[#8A2BE2]/5 to-transparent blur-2xl group-hover:from-[#D4AF37]/10 transition-all duration-500"></div>

                  <div>
                    {/* Custom Gradient Thumbnail */}
                    <div className={`w-full h-44 rounded-xl mb-6 relative overflow-hidden flex items-center justify-center border border-white/5 ${
                      prod.category === 'itunes' ? 'bg-gradient-to-tr from-[#6C1CD3] to-[#250953]' :
                      prod.category === 'pubg' ? 'bg-gradient-to-tr from-[#9B7D25] to-[#403108]' :
                      'bg-gradient-to-tr from-[#00A86B] to-[#013520]'
                    }`}>
                      <Ticket className="w-16 h-16 text-white/10 absolute -bottom-4 -right-4 transform rotate-12" />
                      <div className="text-center z-10">
                        <span className="text-[9px] font-mono tracking-widest text-[#D4AF37] uppercase bg-black/70 px-3 py-1 rounded-full border border-white/10">{prod.category}</span>
                        <h3 className="text-base font-display font-bold text-white tracking-wide mt-3">
                          {locale === 'ar' && prod.name_ar ? prod.name_ar : prod.name}
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-display font-medium text-white text-sm tracking-wide">
                        {locale === 'ar' && prod.name_ar ? prod.name_ar : prod.name}
                      </h3>
                      <p className="text-xs text-gray-400 font-light leading-relaxed h-14 overflow-hidden line-clamp-3">
                        {locale === 'ar' && prod.description_ar ? prod.description_ar : prod.description}
                      </p>
                    </div>

                    {/* Range values display */}
                    <div className="mt-5 space-y-1.5 pt-4 border-t border-white/5">
                      <span className="text-[9px] font-mono tracking-wider text-[#D4AF37] uppercase">Interactive options:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {prod.options?.map(opt => (
                          <span key={opt.id} className="text-[10px] px-2 py-0.5 bg-[#141414] text-gray-400 rounded hover:text-white border border-white/5 font-mono">
                            {selectedCurrency.symbol}{(opt.priceUSD * selectedCurrency.rate).toFixed(2)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 pt-4 border-t border-white/5">
                    <button
                      onClick={() => handleInitiateBuyNow(prod)}
                      className="w-full py-3 bg-[#121212] hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#070707] font-display font-semibold rounded-lg text-xs tracking-wider transition-all duration-300 border border-[#D4AF37]/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] cursor-pointer"
                    >
                      Buy Instantly
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* GUIDELINES TAB PAGE */}
      {currentPage === 'guidelines' && (
        <section className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-12 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full text-xs text-[#D4AF37]">
              <Info className="w-3 h-3" />
              <span className="font-mono uppercase tracking-widest text-[9px] font-bold">Standard Operating SLAs</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-light luxury-text-gradient">Registry Guidelines & Terms</h1>
            <p className="max-w-2xl mx-auto text-xs text-gray-400 font-light font-sans">
              Review operating guidelines, secure sourcing channels, and digital redemption security benchmarks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Purchase Roadmap */}
            <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl hover:border-[#D4AF37]/30 transition-all space-y-4">
              <h3 className="text-sm font-display font-semibold text-[#D4AF37] uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" /> How to Secure Vouchers
              </h3>
              <ol className="space-y-3 pl-4 list-decimal text-xs text-gray-400 font-sans leading-relaxed">
                <li>Select your high-priority denomination within the digital cards catalog page.</li>
                <li>Set your active geo-currency to apply dynamic, real-time conversion rates matching local exchange indices.</li>
                <li>Initiate secure checkout by providing a verified email location.</li>
                <li>Choose from Stripe credit cards, PayPal premium pools, Liquid Crypto, or use your secure Aura Wallet.</li>
                <li>Upon instant payment validation, your delivery code is generated dynamically from provider APIs.</li>
              </ol>
            </div>

            {/* Payment methods */}
            <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl hover:border-[#D4AF37]/30 transition-all space-y-4">
              <h3 className="text-sm font-display font-semibold text-[#D4AF37] uppercase flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#D4AF37]" /> Accepted Settlement Gateways
              </h3>
              <ul className="space-y-2.5 text-xs text-gray-400 font-sans leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] font-mono mt-0.5">•</span>
                  <span><strong>Stripe Credit Interface:</strong> Direct VISA/Mastercard checkout processing with advanced 3D Secure verification protocol layers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] font-mono mt-0.5">•</span>
                  <span><strong>Mobile Gateways:</strong> Seamless checkout authorization via Google Pay or Apple Pay biometric keys.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] font-mono mt-0.5">•</span>
                  <span><strong>Cryptographic Wallets:</strong> Peer-to-peer decentralized settlement utilizing major cryptographic assets.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] font-mono mt-0.5">•</span>
                  <span><strong>Aura Fintech Wallet:</strong> Use platform credit values for 100% free, single-click order fulfillment.</span>
                </li>
              </ul>
            </div>

            {/* SLA Delivery time */}
            <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl hover:border-[#D4AF37]/30 transition-all space-y-4">
              <h3 className="text-sm font-display font-semibold text-[#D4AF37] uppercase flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D4AF37]" /> Sourcing & Delivery SLA
              </h3>
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                Aura enforces a strict <strong>2-second Guaranteed Delivery SLA</strong> on all digital acquisitions. Our server is tied directly to digital API providers. If our primary canal fails, our failover protocols trigger alternate channels instantly. Check delivery archives dynamically under your organic buyer session.
              </p>
            </div>

            {/* Refund terms */}
            <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl hover:border-[#D4AF37]/30 transition-all space-y-4">
              <h3 className="text-sm font-display font-semibold text-[#D4AF37] uppercase flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Refund & Revocation Policy
              </h3>
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                Due to the instant, high-priority nature of digital keys, <strong>all voucher sales are strictly non-refundable and final once a PIN code has been revealed or generated</strong>. In case of payment interruptions, please immediately dial our support concierge terminal.
              </p>
            </div>

            {/* Terms of use & Security */}
            <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl hover:border-[#D4AF37]/30 transition-all space-y-4 md:col-span-2">
              <h3 className="text-sm font-display font-semibold text-[#D4AF37] uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" /> Platform Security & Cyber Guidelines
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400 font-sans leading-relaxed">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">1. AVOID DIGITAL SCAMS</span>
                  <p>Never share your deliverable PIN codes or vault secrets with third-party buyers or online chat brokers. Aura representatives will never ask you to reveal or paste raw voucher credentials details.</p>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">2. AUTHENTICATION PROTECTION</span>
                  <p>Ensure your logged buyers email uses multi-factor authentications. Activate "Elite Vault Desk" authentications to review, transfer, or fund store ledger values securely.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SUPPORT TAB PAGE */}
      {currentPage === 'support' && (
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-10 animate-fade-in">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#8A2BE2]/10 border border-[#8A2BE2]/25 rounded-full text-xs text-purple-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-mono uppercase tracking-widest text-[9px] font-bold">24/7 Premium Assistance</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-light luxury-text-gradient">Aura Concierge Desk</h1>
            <p className="max-w-xl mx-auto text-xs text-gray-400 font-light font-sans">
              Interface directly with our executive automated support queues or register a formal security audit query.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Contact ticket form */}
            <div className="lg:col-span-5 p-6 bg-[#0E0E0E]/95 border border-white/5 rounded-2xl flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-display font-semibold text-[#D4AF37] uppercase tracking-wider pb-2 border-b border-white/5">
                  Register Formal Audit Query
                </h3>
                <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
                  Our priority service desk responds within 15 minutes for validated VIP ticket requests. Please populate all parameters securely.
                </p>

                {supportSentSuccess ? (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-sans leading-normal animate-fade-in">
                    {supportSentSuccess}
                  </div>
                ) : (
                  <form onSubmit={handleSendSupportMessage} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Full Identity Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Richard Hendricks"
                        value={supportName}
                        onChange={e => setSupportName(e.target.value)}
                        className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Active Email Location</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. richard@piedpiper.com"
                        value={supportEmail}
                        onChange={e => setSupportEmail(e.target.value)}
                        className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Service Concern Category</label>
                      <select
                        value={supportTopic}
                        onChange={e => setSupportTopic(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#121212] border border-white/10 rounded-lg text-xs text-gray-300 outline-none focus:border-[#D4AF37]"
                      >
                        <option value="billing">Settlement & Wallet Deposits</option>
                        <option value="delivery">PIN Code Delivery Failover</option>
                        <option value="security">Elite Desk Authenticator Error</option>
                        <option value="corporate">Custom Corporate Purchases</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Detailed Diagnostic Message</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Tell us what you would like to request or inquire about..."
                        value={supportMessage}
                        onChange={e => setSupportMessage(e.target.value)}
                        className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37] resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={supportSending}
                      className="w-full py-3 bg-[#D4AF37] hover:bg-[#c29d2f] text-black font-display font-semibold rounded-lg text-xs tracking-widest uppercase transition-all cursor-pointer"
                    >
                      {supportSending ? "Encrypting Priority Ticket..." : "File VIP Support Ticket"}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Simulated Live-Chat terminal */}
            <div className="lg:col-span-7 p-6 bg-[#0E0E0E] border border-[#8A2BE2]/20 rounded-2xl flex flex-col justify-between h-[520px] shadow-[0_0_25px_rgba(138,43,226,0.1)]">
              <div className="flex flex-col h-full justify-between">
                {/* Terminal header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse col-span-2"></div>
                    <div>
                      <div className="text-xs font-bold text-white font-display">AURA_BOT SYSTEM CORE</div>
                      <div className="text-[9px] font-mono text-emerald-400">STATUS: INTERACTIVE CLIENT PORTAL ACTIVE</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-gray-500">PROVIDER SLA // LOW LATENCY</span>
                </div>

                {/* Message scroll container */}
                <div className="flex-1 my-4 space-y-3 overflow-y-auto pr-2 max-h-[340px]">
                  {chatLogs.map((log) => (
                    <div key={log.id} className={`flex ${log.isAdmin ? 'justify-start' : 'justify-end'}`}>
                      <div className={`p-3 max-w-[85%] rounded-xl text-xs font-sans space-y-1 flex flex-col ${
                        log.isAdmin 
                          ? 'bg-[#121212] text-gray-300 rounded-tl-none border border-white/5 shadow-md' 
                          : 'bg-[#8A2BE2]/15 text-white border border-[#8A2BE2]/30 rounded-tr-none'
                      }`}>
                        <span className="text-[11px] leading-relaxed break-words">{log.text}</span>
                        <span className="text-[8px] font-mono self-end text-gray-500">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick preset chips */}
                <div className="flex flex-wrap gap-2 mb-3 font-sans">
                  {[
                    "Why hasn't my PUBG UC arrived?",
                    "Authorize $150 credit",
                    "Is Stripe fully secure here?",
                    "Refund rules clarification"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setChatInputText(preset)}
                      className="text-[9px] font-mono px-2.5 py-1 rounded bg-black/60 border border-white/5 hover:border-[#D4AF37] text-gray-400 hover:text-white transition-all cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Send console inputs */}
                <form onSubmit={handleSendSupportChatMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Input your concern..."
                    value={chatInputText}
                    onChange={e => setChatInputText(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#8A2BE2] hover:bg-[#7b24cc] text-white rounded-lg flex items-center justify-center transition-colors shadow-md cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* WALLET TAB PAGE */}
      {currentPage === 'wallet' && (
        <section className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-10 animate-fade-in">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/25 rounded-full text-xs text-[#D4AF37]">
              <Coins className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="font-mono uppercase tracking-widest text-[9px] font-bold">Aura Premium Fintech Ledger</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-light luxury-text-gradient">Secure Digital Wallet</h1>
            <p className="max-w-xl mx-auto text-xs text-gray-400 font-light font-sans">
              Review ledger balances, execute peer-to-peer credit transfers, and perform card top-ups instantly.
            </p>
          </div>

          {!currentUserEmail ? (
            /* Auth Guard Card */
            <div className="max-w-md mx-auto p-8 bg-[#0E0E0E] border border-white/5 rounded-3xl space-y-6 text-center shadow-2xl relative overflow-hidden animate-fade-in">
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-2xl font-mono"></div>
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mx-auto mb-4">
                <User className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-display font-medium text-white">Identify Your Buyer Coordinate</h3>
                <p className="text-[11px] text-gray-400">
                  Aura provisions a fintech wallet with an automatic <strong>$150.00 USD trial credit</strong> for all registered buyers. Enter your email coordinate to unlock your wallet.
                </p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!checkoutEmail.trim()) return;
                setIsProcessing(true);
                try {
                  const refCode = localStorage.getItem('aura_referral_code') || undefined;
                  const loginRes = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      email: checkoutEmail.trim(), 
                      name: 'Aura Premium Member',
                      referredBy: refCode
                    })
                  });
                  if (loginRes.ok) {
                    const resData = await loginRes.json();
                    onLoginSuccess(resData.user.email, resData.token, 'user');
                    setCheckoutEmail('');
                    setTimeout(() => {
                      loadWalletInfo();
                    }, 200);
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsProcessing(false);
                }
              }} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Email Coordinate *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. buyer@luxuryvault.com"
                    value={checkoutEmail}
                    onChange={e => setCheckoutEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 bg-[#D4AF37] hover:bg-[#c29d2f] text-black font-display font-semibold rounded-lg text-xs tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)] disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? "Configuring Ledger Terminal..." : "Provision Vault Wallet"}
                </button>
              </form>
            </div>
          ) : (
            /* Logged Walled Dashboard layout */
            <div className="space-y-8 animate-fade-in">
              
              {/* Balance Showcase Card */}
              <div className="p-8 bg-[#0E0E0E] border border-[#D4AF37]/20 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-[#8A2BE2]/10 rounded-full blur-2xl"></div>
                
                <div className="space-y-2">
                  <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase block font-semibold animate-pulse">Available Sourced Balance</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-mono font-bold text-white tracking-tight">
                      {walletBalance !== null ? `$${walletBalance.toFixed(2)}` : 'Loading...'}
                    </span>
                    <span className="text-xs text-gray-400 uppercase font-mono font-bold">USD</span>
                  </div>
                  
                  {/* Copyable User ID */}
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-[10px] font-mono text-gray-500">LEDGER USER ARCHIVE CODE:</span>
                    <span className="text-xs font-mono font-bold text-gray-200 bg-white/5 px-2.5 py-1 rounded border border-white/5 flex items-center gap-1.5 hover:border-[#D4AF37]/50 transition-colors">
                      {walletUserId || "Loading..."}
                      <button 
                        type="button"
                        onClick={() => {
                          if (walletUserId) {
                            navigator.clipboard.writeText(walletUserId);
                            setCopiedAddress(true);
                            setTimeout(() => setCopiedAddress(false), 2000);
                          }
                        }}
                        className="text-[#D4AF37] hover:text-white transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </span>
                    {copiedAddress && <span className="text-[9px] font-mono text-emerald-400 lowercase">Copied!</span>}
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="text-[10px] font-mono text-[#D4AF37] border border-[#D4AF37]/20 bg-[#D4AF37]/5 py-1 px-3 rounded uppercase font-bold">
                    PLATFORM VERIFIED
                  </span>
                </div>
              </div>

              {/* Feedback Messages */}
              {walletSuccess && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-sans text-center">
                  {walletSuccess}
                </div>
              )}
              {walletError && (
                <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl font-sans text-center">
                  {walletError}
                </div>
              )}

              {/* Transfer and Top Up Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Peer to Peer Transfer Panel */}
                <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-4">
                  <h3 className="text-sm font-display font-semibold text-[#D4AF37] uppercase flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#D4AF37]" /> Settle Transfer (P2P Send)
                  </h3>
                  <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
                    Transfer store credits instantly to any other user registered on Aura. Use their secure 9-letter USR code.
                  </p>
                  
                  <form onSubmit={handleTransferMoney} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">RECIPIENT USER ID ARCHIVE *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. USR123456"
                        value={transferToId}
                        onChange={e => setTransferToId(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37] font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Transfer Credit Value (USD) *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2 text-gray-400 text-xs font-mono">$</span>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 50"
                          min="1"
                          value={transferAmt}
                          onChange={e => setTransferAmt(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 bg-black/60 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37] font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isWalletActionProcessing}
                      className="w-full py-2.5 bg-[#8A2BE2] hover:bg-[#7b24cc] text-white font-display font-semibold rounded-lg text-xs tracking-wider uppercase transition-colors cursor-pointer"
                    >
                      {isWalletActionProcessing ? "Interfacing blockchain SLA..." : "Authorize Credit Transfer"}
                    </button>
                  </form>
                </div>

                {/* Sourced Top-Up Panel */}
                <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-4">
                  <h3 className="text-sm font-display font-semibold text-[#D4AF37] uppercase flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" /> Sourced Wallet Top-Up
                  </h3>
                  <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
                    Add credits securely using top financial processors. Supported via Stripe cards, instant PayPal balances, and local crypto networks.
                  </p>

                  <form onSubmit={handleTopupWallet} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Funding Top-Up Value (USD) *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2 text-gray-400 text-xs font-mono">$</span>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 100"
                          min="1"
                          value={topupAmt}
                          onChange={e => setTopupAmt(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 bg-black/60 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37] font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Dynamic Sourced Channel</label>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="p-2 border border-[#D4AF37] text-[#D4AF37] text-[10px] text-center font-bold bg-[#D4AF37]/5 rounded tracking-wide uppercase font-mono">Stripe API</span>
                        <span className="p-2 border border-white/5 text-gray-500 text-[10px] text-center font-bold bg-transparent rounded tracking-wide uppercase font-mono">PayPal Direct</span>
                        <span className="p-2 border border-white/5 text-gray-500 text-[10px] text-center font-bold bg-transparent rounded tracking-wide uppercase font-mono">Crypto Liquidity</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isWalletActionProcessing}
                      className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#c29d2f] text-black font-display font-semibold rounded-lg text-xs tracking-wider uppercase transition-colors cursor-pointer"
                    >
                      {isWalletActionProcessing ? "Securing payment routing..." : "Initiate Secure Deposit"}
                    </button>
                  </form>
                </div>

              </div>

              {/* Dynamic Ledger Transaction Registry */}
              <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-4 font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="text-xs uppercase font-bold text-[#D4AF37] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Ledger Transaction Chronicles
                  </h3>
                  <span className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded font-mono">LEDGER ACTIVE</span>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {walletTransactions.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-4 text-center">No transaction chronicles registered in ledger.</p>
                  ) : (
                    walletTransactions.map((tx, idx) => {
                      const isSent = tx.from === walletUserId;
                      return (
                        <div key={tx.id || idx} className="p-3.5 bg-black/40 border border-white/5 rounded-lg flex items-center justify-between hover:border-white/10 transition-colors">
                          <div className="flex items-center gap-3 font-sans">
                            <div className={`p-1.5 rounded-full ${isSent ? 'bg-red-950/40 text-red-100' : 'bg-emerald-950/40 text-emerald-100'}`}>
                              {isSent ? <ArrowUpRight className="w-3 h-3 text-red-400" /> : <ArrowDownLeft className="w-3 h-3 text-emerald-400" />}
                            </div>
                            <div>
                              <div className="text-xs text-gray-300 font-bold">
                                {isSent ? `Transfer to ID: ${tx.to}` : `Receipt from ID: ${tx.from}`}
                              </div>
                              <div className="text-[9px] text-gray-500 font-mono">
                                {new Date(tx.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className={`text-xs font-bold font-mono ${isSent ? 'text-red-400' : 'text-emerald-400'}`}>
                            {isSent ? '-' : '+'}${tx.amount.toFixed(2)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}
        </section>
      )}

      {/* REFERRAL SYSTEM TAB PAGE */}
      {currentPage === 'referral' && (
        <section className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-10 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full text-xs text-[#D4AF37]">
              <Gift className="w-3.5 h-3.5" />
              <span className="font-mono uppercase tracking-widest text-[9px] font-bold">
                {locale === 'ar' ? 'برنامج تسويق بالعمولة نخبوي' : 'Elite Affiliate Invitation'}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-light luxury-text-gradient">
              {locale === 'ar' ? 'ادعُ أصدقاءك واربح 15$' : 'Invite Friends & Earn $15.00'}
            </h1>
            <p className="max-w-2xl mx-auto text-xs text-gray-400 font-light font-sans">
              {locale === 'ar' 
                ? 'شارك رابط الإحالة الفاخر الخاص بك مع أصدقائك. عند قيامهم بالتسجيل وفتح محفظتهم، سنقوم تلقائياً بإيداع 15.00 دولار أمريكي في رصيد محفظتك الرقمية مجاناً!'
                : 'Share your exclusive invitation address with friends. When they register and activate their ledger, we will instantly deposit $15.00 USD securely into your Aura Fintech balance!'}
            </p>
          </div>

          {!currentUserEmail ? (
            /* Auth Guard */
            <div className="max-w-md mx-auto p-8 bg-[#0E0E0E] border border-white/5 rounded-3xl text-center space-y-6">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mx-auto">
                <Gift className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-display font-medium text-white">
                  {locale === 'ar' ? 'قم بتسجيل الدخول للحصول على رابطك' : 'Secure Authenticate Required'}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {locale === 'ar' 
                    ? 'يرجى الانتقال إلى تبويب المحفظة المالي وتسجيل بريدك الإلكتروني أولاً لتوليد رابط الإحالة الخاص بك ومراقبة أرباحك.'
                    : 'Please access the Fintech Wallet tab and enter your active coordinate address to authorize your invite link tracker.'}
                </p>
              </div>
              <button
                onClick={() => setCurrentPage('wallet')}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#c29d2f] text-black font-display font-semibold rounded-lg text-xs tracking-widest uppercase transition-all"
              >
                {locale === 'ar' ? 'فتح المحفظة للتسجيل' : 'Access Fintech Wallet'}
              </button>
            </div>
          ) : (
            /* Dashboard */
            <div className="space-y-8">
              {/* Stats & Link row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Total Cohort stats */}
                <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="absolute right-4 top-4 text-white/5 font-mono text-6xl select-none">01</div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">
                    {locale === 'ar' ? 'إجمالي الأصدقاء المدعوين' : 'Referred Customers'}
                  </span>
                  <div className="text-3xl font-display font-light text-[#D4AF37]">{referredCount}</div>
                  <p className="text-[10px] text-gray-400 font-sans">
                    {locale === 'ar' ? 'أعضاء مسجلون في شبكتك' : 'Successfully validated member profiles'}
                  </p>
                </div>

                {/* Rewards earned */}
                <div className="p-6 bg-[#0E0E0E] border border-[#D4AF37]/15 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="absolute right-4 top-4 text-[#D4AF37]/5 font-mono text-6xl select-none">$$</div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">
                    {locale === 'ar' ? 'أرباح الإحالة المستلمة' : 'Direct Referral Rewards'}
                  </span>
                  <div className="text-3xl font-display font-light text-emerald-400">
                    ${(referredCount * 15).toFixed(2)} USD
                  </div>
                  <p className="text-[10px] text-gray-400 font-sans">
                    {locale === 'ar' ? 'تم إيداعها تلقائياً بالدولار' : 'Instantly credited fee-free currency'}
                  </p>
                </div>

                {/* Unique Wallet link copy card */}
                <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-xl space-y-2 col-span-1 md:col-span-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">
                    {locale === 'ar' ? 'معرف دعوتك الفريد' : 'Referral Affiliate Token ID'}
                  </span>
                  <div className="text-xl font-mono text-white tracking-widest">{walletId || '---'}</div>
                  <p className="text-[10px] text-gray-400 font-sans">
                    {locale === 'ar' ? 'رمز حماية الحساب الموقت' : 'Your permanent unique ledger ID'}
                  </p>
                </div>

              </div>

              {/* Referral link Copy Banner */}
              <div className="p-6 bg-[#0E0E0E]/95 border border-[#D4AF37]/25 rounded-2xl space-y-3 relative overflow-hidden">
                <h3 className="text-sm font-display font-semibold text-[#D4AF37] uppercase">
                  {locale === 'ar' ? 'رابط الإحالة الفاخر الخاص بك' : 'Your Platinum Referral Link'}
                </h3>
                <div className="flex flex-col sm:flex-row items-stretch gap-2 font-mono">
                  <div className="flex-1 bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-xs text-gray-300 break-all select-all flex items-center">
                    {typeof window !== 'undefined' ? `${window.location.origin}/?ref=${walletId}` : `/?ref=${walletId}`}
                  </div>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(`${window.location.origin}/?ref=${walletId}`);
                        setCopiedAddress(true);
                        setTimeout(() => setCopiedAddress(false), 2000);
                      }
                    }}
                    className="px-6 py-3 bg-[#D4AF37] hover:bg-[#c29d2f] text-black font-display font-semibold rounded-lg text-xs tracking-widest uppercase transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>
                      {copiedAddress 
                        ? (locale === 'ar' ? 'تم النسخ!' : 'Copied!') 
                        : (locale === 'ar' ? 'نسخ الرابط الفاخر' : 'Copy Invitation Link')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Invitation map */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* How it works */}
                <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-4">
                  <h3 className="text-sm font-display font-semibold text-[#D4AF37] uppercase flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" /> {locale === 'ar' ? 'بروتوكول المكافآت' : 'Program Operating SLA'}
                  </h3>
                  <ol className="space-y-4 text-xs text-gray-400 font-sans list-decimal pl-4 leading-relaxed">
                    <li>
                      <strong>{locale === 'ar' ? 'مشاركة الرابط:' : 'Broadcast Address:'}</strong>{' '}
                      {locale === 'ar' ? 'انسخ رابطك المالي وشاركه مع الأصدقاء المهتمين.' : 'Copy and issue your unique platinum URL to direct associates.'}
                    </li>
                    <li>
                      <strong>{locale === 'ar' ? 'تحقق الهوية:' : 'Secure Onboarding:'}</strong>{' '}
                      {locale === 'ar' ? 'يقوم أصدقاؤك بتسجيل حساب بريدي في المنصة لبدء المعاملات.' : 'They trigger explicit ledger provisioning on our secure network.'}
                    </li>
                    <li>
                      <strong>{locale === 'ar' ? 'تسوية فورية:' : 'Instant Settled Fee:'}</strong>{' '}
                      {locale === 'ar' ? 'يتم إيداع $15.00 USD في محفظتك فوراً. بالإضافة إلى ذلك، يحصل صديقك على $150.00 رصيد تجريبي ترحيبي!' : 'Earn $15.00 USD automatically on registration. Your invitee also receives $150.00 free credit instantly!'}
                    </li>
                  </ol>
                </div>

                {/* Referred list cohort table */}
                <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-4 font-mono">
                  <h3 className="text-xs uppercase font-bold text-[#D4AF37] pb-2 border-b border-white/5 flex items-center gap-1.5 font-sans">
                    <User className="w-4 h-4 text-[#D4AF37]" /> {locale === 'ar' ? 'سجل الأصدقاء المنضمين' : 'Sourced Cohort List'}
                  </h3>
                  
                  <div className="space-y-2.5 max-h-60 overflow-y-auto">
                    {referredList.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-6 text-center font-sans">
                        {locale === 'ar' ? 'لم يتم الانضمام عن طريق الرابط بعد.' : 'No cohort members registered under your ID yet.'}
                      </p>
                    ) : (
                      referredList.map((refUser, idx) => (
                        <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-lg flex justify-between items-center text-xs font-sans hover:border-white/15 transition-all">
                          <div>
                            <div className="text-gray-200 font-semibold">{refUser.email}</div>
                            <div className="text-[9px] text-gray-500 font-mono">
                              {new Date(refUser.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-full font-mono text-[10px] uppercase font-bold tracking-widest">
                            {locale === 'ar' ? 'نشط: +15$' : 'ACTIVE: +$15'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}
        </section>
      )}

      {/* MY ORDERS PORTAL TAB PAGE */}
      {currentPage === 'orders' && (
        <section className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-10 animate-fade-in" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full text-xs text-[#D4AF37]">
              <Ticket className="w-3.5 h-3.5" />
              <span className="font-mono uppercase tracking-widest text-[9px] font-bold">
                {locale === 'ar' ? 'البوابة الفاخرة لتتبع المشتريات والطلبات' : 'Elite Order Sourcing Portal'}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-light luxury-text-gradient">
              {locale === 'ar' ? 'سجل طلباتك وحالتها الفورية' : 'My Orders & Real-time Tracking'}
            </h1>
            <p className="max-w-2xl mx-auto text-xs text-gray-400 font-light font-sans">
              {locale === 'ar' 
                ? 'تابع جميع طلبياتك الرقمية وحالة الكود بشكل لحظي وبأقصى درجات الأمان والسرية.'
                : 'Track the life-cycle of your digital vouchers, process pending key deliveries, and monitor overall transactional safety in real-time.'}
            </p>
          </div>

          {!currentUserEmail ? (
            /* Auth Guard */
            <div className="max-w-md mx-auto p-8 bg-[#0E0E0E] border border-white/5 rounded-3xl text-center space-y-6">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mx-auto">
                <Ticket className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 font-sans">
                <h3 className="text-base font-display font-medium text-white">
                  {locale === 'ar' ? 'يرجى تسجيل الدخول لعرض طلبياتك' : 'Authentication Required'}
                </h3>
                <p className="text-xs text-gray-400">
                  {locale === 'ar' ? 'يجب تسجيل الدخول بالرمز البريدي أو الحساب لعرض الطلبيات والرموز المستلمة.' : 'Please connect your secure wallet or personal email account to list transaction histories.'}
                </p>
              </div>
              <button
                onClick={() => setCurrentPage('wallet')}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#c29d2f] text-black font-display font-semibold rounded-lg text-xs tracking-widest uppercase transition-all"
              >
                {locale === 'ar' ? 'الذهاب لتسجيل الدخول الفوري' : 'Access Ledger Account'}
              </button>
            </div>
          ) : (
            /* Orders dashboard board */
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-black/50 p-4 rounded-xl border border-white/5 balance-stat-bg">
                <span className="text-xs text-gray-300 font-sans">
                  {locale === 'ar' 
                    ? `إجمالي الطلبيات المسجلة: ${customerOrders.length}` 
                    : `Total Orders Tracked: ${customerOrders.length}`}
                </span>
                <button
                  onClick={async () => {
                    try {
                      const r = await fetch('/api/orders', {
                        headers: { Authorization: `Bearer ${currentUserToken}` }
                      });
                      if (r.ok) {
                        setCustomerOrders(await r.json());
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded border border-white/10 text-[10px] font-mono uppercase tracking-wider"
                >
                  {locale === 'ar' ? 'تحديث لحظي لقائمة المشتريات' : 'Sync Real-time Ledger'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {customerOrders.length === 0 ? (
                  <div className="col-span-full py-16 text-center border border-white/5 bg-[#0E0E0E] rounded-2xl">
                    <Clock className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-xs text-gray-400 italic font-sans">
                      {locale === 'ar' ? 'لا يوجد أي سجل مشتريات أو طلبيات مسجلة لمطالباتك الحالية.' : 'No active purchase structures has been logged under your login session address.'}
                    </p>
                  </div>
                ) : (
                  customerOrders.map(ord => {
                    const statusColors = {
                      pending: 'bg-yellow-950/40 text-yellow-400 border border-yellow-800/40',
                      processing: 'bg-blue-950/40 text-blue-400 border border-blue-800/40',
                      completed: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40',
                      failed: 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                    };

                    const statusLabelsAr = {
                      pending: 'قيد الانتظار الدائن',
                      processing: 'تحضير الرموز عبر السيرفر',
                      completed: 'تم تسليم الكود بنجاح',
                      failed: 'فشل الفحص الأمني'
                    };

                    return (
                      <div key={ord.id} className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl flex flex-col justify-between hover:border-[#D4AF37]/30 transition-all gap-5">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-xs font-mono border-b border-white/5 pb-3">
                            <div>
                              <span className="font-bold text-[#D4AF37] text-xs bg-[#D4AF37]/5 px-2.5 py-1 rounded border border-[#D4AF37]/10">{ord.id}</span>
                              <span className="block text-[10px] text-gray-500 mt-1">{new Date(ord.createdAt).toLocaleString()}</span>
                            </div>
                            <span className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider ${statusColors[ord.paymentStatus as keyof typeof statusColors] || 'bg-gray-800 text-gray-400'}`}>
                              {locale === 'ar' 
                                ? statusLabelsAr[ord.paymentStatus as keyof typeof statusLabelsAr] || ord.paymentStatus 
                                : ord.paymentStatus}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-sm font-sans font-bold text-white leading-snug">
                              {ord.productName}
                            </h3>
                            <p className="text-xs text-gray-400">
                              {locale === 'ar' ? 'قيمة اسمية: ' : 'Voucher Face Value: '}
                              <span className="text-gray-200 font-mono font-medium">{ord.optionLabel}</span>
                            </p>
                            <p className="text-xs text-gray-400">
                              {locale === 'ar' ? 'سعر الشراء: ' : 'Purchase Charge: '}
                              <span className="text-[#D4AF37] font-mono font-semibold">${ord.priceUSD.toFixed(2)} USD</span>
                            </p>
                            <p className="text-[10px] text-gray-500 font-mono">
                              Sourcing Proxy Route: {ord.providerUsedName || (locale === 'ar' ? 'آلة التوزيع التلقائية الفائقة' : 'Dynamic Sourcing Bridge')}
                            </p>
                          </div>
                        </div>

                        {/* Delivered Pin box */}
                        {ord.paymentStatus === 'completed' && ord.codeDelivered ? (
                          <div className="pt-4 border-t border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-mono text-[#D4AF37]">
                              <span>{locale === 'ar' ? 'رمز تفعيل القسيمة الرقمية' : 'ACTIVE DIGITAL VOUCHER PIN'}</span>
                              <span className="px-1.5 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 rounded text-[9px] uppercase tracking-widest font-bold font-mono font-mono">SECURE</span>
                            </div>
                            <div className="flex gap-2 items-stretch" dir="ltr">
                              <code className="flex-1 text-xs text-white bg-black/60 px-3 py-2.5 rounded-lg border border-[#D4AF37]/20 select-text font-mono tracking-wider break-all leading-relaxed">
                                {ord.codeDelivered}
                              </code>
                              <button
                                onClick={() => {
                                  if (typeof navigator !== 'undefined') {
                                    navigator.clipboard.writeText(ord.codeDelivered || '');
                                    alert(locale === 'ar' ? 'تم نسخ الرمز الفاخر إلى الحافظة بنجاح!' : 'Voucher code successfully copied to clipboard!');
                                  }
                                }}
                                className="px-3 bg-[#D4AF37] hover:bg-[#c29d2f] text-black font-semibold rounded-lg text-xs uppercase transition-all flex items-center justify-center cursor-pointer"
                                title={locale === 'ar' ? 'نسخ رمز القسيمة الفاخر' : 'Copy Voucher Code'}
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : ord.paymentStatus === 'processing' ? (
                          <div className="pt-4 border-t border-white/5 flex items-center gap-2.5 text-blue-400 text-xs font-sans">
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
                            <span>
                              {locale === 'ar' 
                                ? 'يتم سحب وتشفير الرمز الآن عبر منافذ القسائم... انتظر قليلاً' 
                                : 'Voucher is being securely fetched and encrypted. Please wait.'}
                            </span>
                          </div>
                        ) : ord.paymentStatus === 'failed' ? (
                          <div className="pt-4 border-t border-white/5 text-rose-500 text-xs font-sans">
                            <span>
                              {locale === 'ar' 
                                ? 'فشلت عملية الدفع أو تم إلغاؤها أمنياً. اتصل بالتحقق والدعم.' 
                                : 'We were unable to approve this voucher delivery. Contact concierge support.'}
                            </span>
                          </div>
                        ) : (
                          <div className="pt-4 border-t border-white/5 text-yellow-500 text-xs font-sans">
                            <span>
                              {locale === 'ar' 
                                ? 'في انتظار استلام قيمة الدفعة وسحب البطاقات.' 
                                : 'Awaiting confirmation from routing ledger channels.'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Dynamic Checkout Dialog with Caching & Sourcing Failovers */}
      {isCheckoutOpen && activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-[#0C0C0C] border border-[#D4AF37]/40 rounded-3xl shadow-[0_15px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            
            {/* Header control */}
            <div className="px-6 py-5 bg-[#121212] border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold tracking-wide text-white text-sm">Luxury Checkout Portal</h3>
                <p className="text-[9px] font-mono tracking-wider text-[#D4AF37]">TRANSACTION PROTOCOL ENCRYPTED // ANTI-FRAUD ON</p>
              </div>
              <button
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setCompletedOrder(null);
                  setAutoAccountToken(null);
                }}
                className="text-gray-400 hover:text-white transition-colors text-xs font-mono border border-white/5 bg-white/5 px-2.5 py-1 rounded-md"
                disabled={isProcessing}
              >
                Exit Portal
              </button>
            </div>

            {/* Standard Checkout Panel vs Invoice Accomplished Screen */}
            {!completedOrder ? (
              <form onSubmit={handleProcessCheckout} className="p-6 space-y-5">
                
                {/* Product Summary */}
                <div className="p-4 bg-[#141414] border border-white/5 rounded-xl flex justify-between items-center relative overflow-hidden">
                  <div className="absolute -left-12 -top-12 w-24 h-24 bg-gradient-to-br from-[#8A2BE2]/10 to-transparent rounded-full blur-xl pointer-events-none"></div>
                  <div>
                    <span className="text-[9px] font-mono text-purple-400 uppercase">Selected Asset Sourcing</span>
                    <h4 className="font-sans font-bold text-sm text-white">{activeProduct.name}</h4>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-gray-500 uppercase block text-right">Raw Denomination</span>
                    <span className="text-sm font-semibold text-[#D4AF37] font-mono">
                      {selectedCurrency.symbol}{((activeProduct.options.find(o => o.id === activeOptionId)?.priceUSD || 0) * selectedCurrency.rate).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Option Toggles */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider">Select Denomination Value</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activeProduct.options?.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setActiveOptionId(opt.id)}
                        className={`p-2.5 rounded-lg text-[11px] font-mono transition-all flex flex-col items-center justify-center border ${activeOptionId === opt.id ? 'bg-[#8A2BE2]/10 border-[#8A2BE2] text-white shadow-[0_0_15px_rgba(138,43,226,0.2)]' : 'bg-black/40 border-white/5 text-gray-400 hover:text-white'}`}
                      >
                        <span className="text-[10px] font-bold text-white">{opt.label}</span>
                        <span className="text-[10px] text-[#D4AF37] mt-0.5">{selectedCurrency.symbol}{(opt.priceUSD * selectedCurrency.rate).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coupon tags verification code */}
                <div className="space-y-2 pb-2">
                  <label className="block text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider">Claim Promotion Coupon Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. FLASH50"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 bg-[#121212] text-xs text-white rounded-lg border border-white/10 outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      onClick={handleValidateCoupon}
                      className="px-4 py-2 bg-[#1C1C1C] text-xs text-[#D4AF37] font-mono border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-lg transition-all"
                    >
                      Authenticate Tag
                    </button>
                  </div>
                  {couponError && <p className="text-[10px] text-red-400 italic">{couponError}</p>}
                  {couponSuccess && <p className="text-[10px] text-emerald-400 font-semibold">{couponSuccess}</p>}
                </div>

                {/* COMPLIMENTARY UP-SELL / BUNDLE CHECK BOX */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#120B20] to-[#0B0614] border border-[#8A2BE2]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full uppercase font-bold tracking-widest">EXCLUSIVE CO-SOURCED DEAL</span>
                    <strong className="text-[11px] text-emerald-400 font-mono">SAVE 60%</strong>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="upsellBox"
                      checked={upsellSelected}
                      onChange={e => setUpsellSelected(e.target.checked)}
                      className="w-4.5 h-4.5 accent-[#8A2BE2] cursor-pointer rounded"
                    />
                    <label htmlFor="upsellBox" className="text-xs text-gray-300 font-medium cursor-pointer select-none">
                      Add a highly discounted <span className="text-white font-bold">$10 Google Play Sourcing Voucher</span> to this package for only {selectedCurrency.symbol}{(4.25).toFixed(2)} extra!
                    </label>
                  </div>
                </div>

                {/* Identity information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider mb-1.5">{t.email} *</label>
                    <input
                      type="email"
                      required
                      placeholder="elite@vouchervault.com"
                      value={checkoutEmail}
                      onChange={e => setCheckoutEmail(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#121212] text-xs text-white rounded-lg border border-white/10 focus:border-[#D4AF37] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider mb-1.5">{t.name} (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Duke Winston"
                      value={checkoutName}
                      onChange={e => setCheckoutName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#121212] text-xs text-white rounded-lg border border-white/10 focus:border-[#D4AF37] outline-none"
                    />
                  </div>
                </div>

                {/* Available Payment Channel choices */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider">Select Secure Payment Channel</label>
                  <div className="grid grid-cols-3 gap-2">
                    {gateways.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGateway(g.id as any)}
                        className={`p-3 rounded-xl text-[10px] font-display font-semibold transition-all flex flex-col items-center justify-center gap-1.5 border ${selectedGateway === g.id ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-black/30 border-white/5 text-gray-500 hover:text-white'}`}
                      >
                        {g.id === 'crypto' ? <Coins className="w-4 h-4 text-[#D4AF37]" /> : <ShieldCheck className="w-4 h-4 text-purple-400" />}
                        <span>{g.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* APPLE PAY / GOOGLE PAY NESTED LAYOUT WHEN STRIPE CHOSEN */}
                {selectedGateway === 'stripe' && (
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-3">
                    <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest block">Stripe Direct Integration Tab Selection</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setStripeMethod('card')}
                        className={`py-1.5 text-[9px] font-mono rounded font-bold transition-all border ${stripeMethod === 'card' ? 'bg-white/10 border-white text-white' : 'bg-[#121212]/50 border-white/5 text-gray-500'}`}
                      >
                        Credit Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setStripeMethod('apple-pay')}
                        className={`py-1.5 text-[9px] font-mono rounded font-bold transition-all border ${stripeMethod === 'apple-pay' ? 'bg-black text-[#D4AF37] border-[#D4AF37]' : 'bg-[#121212]/50 border-white/5 text-gray-500'}`}
                      >
                        Apple Pay 
                      </button>
                      <button
                        type="button"
                        onClick={() => setStripeMethod('google-pay')}
                        className={`py-1.5 text-[9px] font-mono rounded font-bold transition-all border ${stripeMethod === 'google-pay' ? 'bg-dark text-cyan-400 border-cyan-400/40' : 'bg-[#121212]/50 border-white/5 text-gray-500'}`}
                      >
                        Google Pay G
                      </button>
                    </div>

                    {stripeMethod === 'card' ? (
                      <div className="space-y-2 mt-2">
                        <input
                          type="text"
                          disabled
                          placeholder="••••  ••••  ••••  4242   - Stripe Test Mode Only"
                          className="w-full px-3 py-2 bg-black/25 text-xs text-gray-500 rounded border border-white/5 font-mono cursor-not-allowed"
                        />
                      </div>
                    ) : (
                      <div className="text-center py-2 px-3 bg-white/5 rounded border border-[#D4AF37]/20">
                        <span className="text-[10px] text-white">Selected high-tier rapid mobile wallet checkout authorized. Complete buy flow to authorize.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* CRYPTO LEDGER ADDRESS DISPLAY */}
                {selectedGateway === 'crypto' && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-teal-950/20 to-black border border-teal-950 text-left space-y-2">
                    <span className="text-[9px] font-mono text-teal-400 uppercase tracking-widest block font-bold">Liquid Cryptographic Token Ledger Settle</span>
                    
                    <div className="flex items-center justify-between gap-1 bg-black/60 p-2.5 rounded border border-white/5 overflow-hidden">
                      <code className="text-[10px] text-gray-300 font-mono select-all truncate">
                        3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
                          setCopiedAddress(true);
                          setTimeout(() => setCopiedAddress(false), 2000);
                        }}
                        className="p-1 px-2.5 rounded bg-[#1C1C1C] hover:bg-[#2C2C2C] text-[#D4AF37] text-[10px] flex items-center gap-1 font-mono hover:text-white"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedAddress ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                    
                    <p className="text-[10px] text-gray-400">
                      Transfer exact value corresponding to <strong className="text-white">BTC/USDT</strong>. Aura cryptographic network monitors mempool registers of this hash natively. Codes deliver instantly when 1 confirmation index hits.
                    </p>
                  </div>
                )}

                {/* ANTI-BOT CHALLENGE QUIZ TO GUARD AGAINST HEAVY SCRIPTS CHEATS */}
                <div className="p-3.5 bg-black border border-white/5 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-[10px] uppercase font-mono text-[#D4AF37] font-semibold tracking-wide">Interactive Anti-Bot Shield</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Prove you are a real buyer. Complete the simple arithmetic query below:</p>
                  <div className="flex gap-3 items-center">
                    <span className="text-sm font-mono font-black text-white bg-white/5 py-1 px-3.5 border border-white/10 rounded">
                      {quizN1} + {quizN2} = ?
                    </span>
                    <input
                      type="number"
                      required
                      placeholder="Sum..."
                      value={quizInput}
                      onChange={e => setQuizInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-[#121212] text-xs text-white rounded-lg border border-white/10 outline-none focus:border-[#D4AF37] max-w-[120px]"
                    />
                  </div>
                  {quizError && <p className="text-[10px] text-red-400 font-semibold">{quizError}</p>}
                </div>

                {/* Final Submit action */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 bg-[#D4AF37] text-black font-display font-semibold rounded-lg text-xs tracking-widest uppercase transition-all hover:bg-[#c29d2f] hover:shadow-[0_0_15px_rgba(212,175,55,0.45)] flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      Interfacing Gateway Routing Failover SLA...
                    </>
                  ) : (
                    <>
                      Verify & Settle Voucher ({selectedCurrency.symbol}{getCalculatedPrice()})
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* SUCCESS SCREEN DELIVERING VAULT KEY */
              <div className="p-6 space-y-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 animate-bounce" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-display font-black text-lg text-white">Voucher Delivered Successfully</h3>
                  <p className="text-xs text-gray-400">Order Ref: {completedOrder.id} - Sourced via {completedOrder.providerUsedName || "High-Priority"}</p>
                </div>

                {/* Real-time Code box */}
                <div className="p-5 bg-black/50 border border-[#D4AF37] rounded-xl space-y-3 shadow-[0_0_20px_rgba(212,175,55,0.25)] max-w-sm mx-auto">
                  <span className="text-[9px] font-mono tracking-widest text-[#D4AF37] uppercase block font-bold">DIGITAL REDEEM PIN CODE</span>
                  <code className="block text-sm text-white font-mono bg-black/60 px-3 py-2 border border-white/10 select-all tracking-wider rounded select-text">
                    {completedOrder.codeDelivered}
                  </code>
                </div>

                {/* Auto login feedback */}
                <div className="p-4 bg-[#121212] border border-white/5 rounded-lg text-left inline-block max-w-md">
                  <p className="text-[11px] text-[#D4AF37] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Digital Profile Synced
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Your dynamic buyer coordinate has been synchronized! Registered on email <span className="font-mono text-white">{checkoutEmail}</span>. Access delivery archives at any time via Profile.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setCompletedOrder(null);
                    setAutoAccountToken(null);
                  }}
                  className="w-full py-3 bg-[#121212] hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black font-display font-medium rounded-lg text-xs border border-[#D4AF37]/30 transition-all"
                >
                  Close Secure Receipt
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Verification screen */}
      {adminOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/90">
          <div className="w-full max-w-md p-6 bg-[#0E0E0E] border border-[#8A2BE2]/40 rounded-2xl space-y-6 shadow-[0_0_30px_rgba(138,43,226,0.3)]">
            <div className="text-center">
              <h3 className="font-display font-bold text-white text-lg tracking-widest">AURA EXECUTIVE AUTH</h3>
              <p className="text-[10px] font-mono text-[#D4AF37] uppercase mt-1">RESTRICTED SHELL PORT KEY</p>
            </div>

            {adminError && (
              <div className="p-3 bg-red-950/40 border border-red-900/30 text-red-400 text-xs text-center rounded">
                {adminError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              
              {!totpRequired ? (
                <>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Email Coordinate *</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@luxurycards.com"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#121212] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Secure Password Key *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={adminPass}
                      onChange={e => setAdminPass(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#121212] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]"
                    />
                    <span className="text-[9px] text-[#D4AF37] font-mono block mt-1 hover:underline cursor-pointer">Default keys: admin@luxurycards.com / admin123</span>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-950/30 border border-indigo-900/30 text-indigo-300 text-[10px] rounded leading-relaxed">
                    <strong>2FA MULTI-FACTOR AUDIT ACTIVE:</strong> Input secure dynamic code.
                    <span className="font-mono text-white block mt-1">Simulated authenticator token: <strong className="text-[#D4AF37] text-sm font-bold bg-black/60 py-0.5 px-2 rounded ml-1 tracking-widest">883291</strong></span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#D4AF37] mb-1">6-Digit 2FA Token Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 883291"
                      maxLength={6}
                      value={adminTotp}
                      onChange={e => setAdminTotp(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2.5 bg-[#121212] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37] text-center tracking-widest font-mono text-lg font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setAdminOverlay(false);
                    setTotpRequired(false);
                    setAdminTotp('');
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400 font-mono"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#c29d2f] text-black font-display font-semibold rounded-lg text-xs"
                >
                  {!totpRequired ? 'Submit Credentials' : 'Verify Secure Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
