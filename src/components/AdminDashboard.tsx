/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import { Product, Order, PaymentGateway, CodeProvider, ChatMessage, Coupon, IPBlockItem, ProviderLogItem } from '../types';
import { io } from 'socket.io-client';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Users,
  Layers,
  Settings,
  MessageCircle,
  Plus,
  Trash2,
  RefreshCw,
  LogOut,
  Sliders,
  DollarSign, Check, AlertCircle, ShieldAlert, Tags, Activity, ShieldCheck, HelpCircle, UserCheck, Shield, Eye, Search, ToggleLeft, ToggleRight, Scale
} from 'lucide-react';

export default function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'analytics' | 'customers' | 'products' | 'orders' | 'gateways' | 'providers' | 'coupons' | 'shields' | 'chats'>('analytics');

  // Core database states
  const [analytics, setAnalytics] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [providers, setProviders] = useState<CodeProvider[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<IPBlockItem[]>([]);
  const [providerLogs, setProviderLogs] = useState<ProviderLogItem[]>([]);

  // Supporting interaction state loaders
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
  const [adminChatText, setAdminChatText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fintech Customers States
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [balanceOverrideInput, setBalanceOverrideInput] = useState('');
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  // Live WebSocket Presence States
  const [onlineEmails, setOnlineEmails] = useState<string[]>([]);
  const adminSocketRef = useRef<any>(null);

  // New forms states
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    discountPercent: 10,
    description: '',
    active: true,
    expiryDate: '',
    assignedProductId: 'all'
  });
  const [newBlockIP, setNewBlockIP] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  // Operational notification feeds
  const [activeAlerts, setActiveAlerts] = useState<{ id: string; text: string; type: 'warn' | 'success' | 'alert' }[]>([
    { id: '1', text: '[SECURITY] Global anti-bot filters actively guarding payment queues.', type: 'success' },
    { id: '2', text: '[FAILOVER SLA] 100% Core supply availability maintained via regional backup servers.', type: 'success' }
  ]);

  // Fetch admin states
  const fetchAllStates = async () => {
    try {
      // 1. Fetch analytics
      const r1 = await fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } });
      if (r1.ok) setAnalytics(await r1.json());

      // 2. Fetch products
      const r2 = await fetch('/api/products');
      if (r2.ok) setProducts(await r2.json());

      // 3. Fetch orders
      const r3 = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
      if (r3.ok) setOrders(await r3.json());

      // 4. Fetch gateways
      const r4 = await fetch('/api/admin/gateways', { headers: { Authorization: `Bearer ${token}` } });
      if (r4.ok) setGateways(await r4.json());

      // 5. Fetch code providers
      const r5 = await fetch('/api/admin/providers', { headers: { Authorization: `Bearer ${token}` } });
      if (r5.ok) setProviders(await r5.json());

      // 6. Fetch conversations
      const r6 = await fetch('/api/chat/admin/conversations', { headers: { Authorization: `Bearer ${token}` } });
      if (r6.ok) setConversations(await r6.json());

      // 7. Fetch Coupons
      const r7 = await fetch('/api/admin/coupons', { headers: { Authorization: `Bearer ${token}` } });
      if (r7.ok) setCoupons(await r7.json());

      // 8. Fetch Blocked IPs
      const r8 = await fetch('/api/admin/security/blocked-ips', { headers: { Authorization: `Bearer ${token}` } });
      if (r8.ok) setBlockedIPs(await r8.json());

      // 9. Fetch Provider Sourcing logs
      const r9 = await fetch('/api/admin/provider-logs', { headers: { Authorization: `Bearer ${token}` } });
      if (r9.ok) {
        const pLogs = await r9.json();
        setProviderLogs(pLogs);
        
        // Scan for recent supplier failure incidents to inform the dynamic alert tray
        const failingLogs = pLogs.filter((l: any) => l.status === 'retry' || l.status === 'failover_triggered').slice(0, 2);
        if (failingLogs.length > 0) {
          const freshAlerts = failingLogs.map((l: any, i: number) => ({
            id: `fail-${l.id}`,
            text: `[SLA ESCALATION] Provider '${l.providerName}' threshold timeout. Failover mechanism automatically triggered fallback.`,
            type: 'warn' as const
          }));
          setActiveAlerts(prev => {
            const staticAlerts = prev.filter(a => !a.id.startsWith('fail-'));
            return [...staticAlerts, ...freshAlerts];
          });
        }
      }

      // 10. Fetch fintech customers lists
      const r10 = await fetch(`/api/admin/users?search=${encodeURIComponent(customerSearch)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r10.ok) {
        const custData = await r10.json();
        setCustomers(custData);
      }
    } catch (e) {
      console.error("Communication errors fetching admin console state: ", e);
    }
  };

  // Trigger loading of customers whenever search changes
  useEffect(() => {
    if (token) {
      const fetchCustOnly = async () => {
        try {
          const res = await fetch(`/api/admin/users?search=${encodeURIComponent(customerSearch)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) setCustomers(await res.json());
        } catch (err) {
          console.error(err);
        }
      };
      fetchCustOnly();
    }
  }, [customerSearch, token]);

  // Integrated Admin Support Websocket connection
  useEffect(() => {
    if (!token) return;

    const socket = io();
    adminSocketRef.current = socket;

    socket.emit('register', { email: 'admin@aura.com', isAdmin: true });

    // Instantly catch messaging activities
    socket.on('new_message', (msg: ChatMessage) => {
      // reload support rooms cache
      const fetchConvs = async () => {
        const r = await fetch('/api/chat/admin/conversations', { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) setConversations(await r.json());
      };
      fetchConvs();
    });

    socket.on('presence_update', (data: { onlineUsers: string[]; adminOnline: boolean }) => {
      setOnlineEmails(data.onlineUsers || []);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAllStates();
      const interval = setInterval(fetchAllStates, 9000); // Poll panel parameters
      return () => clearInterval(interval);
    }
  }, [token]);

  // Toggle dynamic Google/Apple payments directly
  const handleToggleSubGateways = async (gatewayId: 'stripe' | 'paypal' | 'crypto', methodKey: 'applePayEnabled' | 'googlePayEnabled', val: boolean) => {
    const updated = gateways.map(g => {
      if (g.id === gatewayId) {
        return { ...g, [methodKey]: val };
      }
      return g;
    });
    setGateways(updated);
    try {
      await fetch('/api/admin/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle master gate state
  const handleToggleGateway = async (gatewayId: string, enabled: boolean) => {
    const updated = gateways.map(g => g.id === gatewayId ? { ...g, enabled } : g);
    setGateways(updated);
    try {
      await fetch('/api/admin/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Handle provider changes (with Priority config updates)
  const handleSaveProviders = async (updatedList: CodeProvider[]) => {
    setProviders(updatedList);
    try {
      await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updatedList)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateBalance = async (userId: string, balance: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ balance })
      });
      if (res.ok) {
        // reload stats
        const r10 = await fetch(`/api/admin/users?search=${encodeURIComponent(customerSearch)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (r10.ok) {
          const custData = await r10.json();
          setCustomers(custData);
          const currentCust = custData.find((cu: any) => cu.id === userId);
          if (currentCust) setSelectedCustomer(currentCust);
        }
        await fetchAllStates();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to adjust balance.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: 'active' | 'suspended') => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const r10 = await fetch(`/api/admin/users?search=${encodeURIComponent(customerSearch)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (r10.ok) {
          const custData = await r10.json();
          setCustomers(custData);
          const currentCust = custData.find((cu: any) => cu.id === userId);
          if (currentCust) setSelectedCustomer(currentCust);
        }
        await fetchAllStates();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed updates status.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit and save custom item settings
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editingProduct)
      });
      if (response.ok) {
        setEditingProduct(null);
        await fetchAllStates();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Remove this premium digital form permanently?")) return;
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchAllStates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Coupons Manager
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code) return;
    try {
      // Synchronize discountPercent with discountValue for retro compatibility if using percentage
      const discountVal = Number(newCoupon.discountValue) || 0;
      const discountPct = newCoupon.discountType === 'percentage' ? discountVal : 0;
      const payload = {
        ...newCoupon,
        discountPercent: discountPct,
        discountValue: discountVal
      };

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewCoupon({
          code: '',
          discountType: 'percentage',
          discountValue: 10,
          discountPercent: 10,
          description: '',
          active: true,
          expiryDate: '',
          assignedProductId: 'all'
        });
        await fetchAllStates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchAllStates();
    } catch (e) {
      console.error(e);
    }
  };

  // Anti-Fraud Manual Blacklists
  const handleRegisterIPBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockIP.trim()) return;
    try {
      const res = await fetch('/api/admin/security/blocked-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ip: newBlockIP, reason: newBlockReason })
      });
      if (res.ok) {
        setNewBlockIP('');
        setNewBlockReason('');
        await fetchAllStates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteIPBlock = async (id: string) => {
    try {
      await fetch(`/api/admin/security/blocked-ips/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchAllStates();
    } catch (e) {
      console.error(e);
    }
  };

  // Help-desk chat responder
  const handleSendAdminChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatUser || !adminChatText.trim()) return;

    const textToSend = adminChatText;
    setAdminChatText('');

    if (adminSocketRef.current && adminSocketRef.current.connected) {
      adminSocketRef.current.emit("send_message", {
        text: textToSend,
        email: selectedChatUser,
        isAdmin: true
      });
      // Delay slightly and refresh conversations
      setTimeout(async () => {
        const r6 = await fetch('/api/chat/admin/conversations', { headers: { Authorization: `Bearer ${token}` } });
        if (r6.ok) {
          setConversations(await r6.json());
        }
      }, 80);
    } else {
      // Fallback
      try {
        const res = await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSend,
            email: selectedChatUser,
            name: "Luxury Concierge Officer",
            isAdmin: true
          })
        });

        if (res.ok) {
          const r6 = await fetch('/api/chat/admin/conversations', { headers: { Authorization: `Bearer ${token}` } });
          if (r6.ok) {
            setConversations(await r6.json());
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const activeChatThread = conversations.find(c => c.email === selectedChatUser)?.messages || [];

  return (
    <div className="min-h-screen bg-[#070707] text-gray-100 flex flex-col font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Dynamic Alerts system TRAY */}
      {activeAlerts.length > 0 && (
        <div className="bg-[#120C1F] border-b border-purple-500/30 text-xs py-2 px-6 flex flex-col gap-1 z-50">
          {activeAlerts.map(alert => (
            <div key={alert.id} className="flex gap-2 items-center text-purple-300 font-mono text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span>{alert.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Admin Nav Bar */}
      <header className="px-8 py-5 border-b border-[#D4AF37]/10 bg-[#0E0E0E] flex items-center justify-between relative z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 border border-[#D4AF37] rounded font-display font-black text-lg select-none tracking-widest text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            AURA
          </div>
          <div>
            <h1 className="text-xs font-display font-bold uppercase tracking-widest text-white">CONCIERGE CORES CORE PANEL</h1>
            <p className="text-[9px] text-[#D4AF37] font-mono">SECURE HIGH-LEVEL OPERATIONS DESK // 2FA SECURED</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchAllStates}
            className="p-2 bg-[#121212] border border-white/5 hover:border-[#D4AF37]/30 rounded-lg transition-all text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-950/20 border border-red-900/40 text-red-400 hover:bg-red-900/40 rounded-lg transition-all text-xs font-mono"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out Desk
          </button>
        </div>
      </header>

      {/* Workspace Grid */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side Tab Navigation */}
        <nav className="w-64 bg-[#0E0E0E]/90 border-r border-[#D4AF37]/10 p-6 flex flex-col gap-1 shrink-0">
          <span className="text-[9px] text-[#D4AF37] tracking-widest uppercase font-mono mb-3 block opacity-70">METRICS & REGISTER</span>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs transition-all font-display uppercase tracking-wider ${activeTab === 'analytics' ? 'bg-[#D4AF37]/10 border-l-2 border-[#D4AF37] text-[#D4AF37] font-semibold shadow-[0_0_10px_rgba(212,175,55,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <TrendingUp className="w-4 h-4" />
            Audit Overview
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs transition-all font-display uppercase tracking-wider ${activeTab === 'customers' ? 'bg-[#D4AF37]/10 border-l-2 border-[#D4AF37] text-[#D4AF37] font-semibold shadow-[0_0_10px_rgba(212,175,55,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Users className="w-4 h-4" />
            Fintech Customers
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs transition-all font-display uppercase tracking-wider ${activeTab === 'products' ? 'bg-[#D4AF37]/10 border-l-2 border-[#D4AF37] text-[#D4AF37] font-semibold shadow-[0_0_10px_rgba(212,175,55,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Layers className="w-4 h-4" />
            Product Vault cards
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs transition-all font-display uppercase tracking-wider ${activeTab === 'orders' ? 'bg-[#D4AF37]/10 border-l-2 border-[#D4AF37] text-[#D4AF37] font-semibold shadow-[0_0_10px_rgba(212,175,55,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <ShoppingBag className="w-4 h-4" />
            Invoice Register
          </button>

          <span className="text-[9px] text-[#D4AF37] tracking-widest uppercase font-mono mt-6 mb-3 block opacity-70">CORE CHANNELS</span>

          <button
            onClick={() => setActiveTab('gateways')}
            className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs transition-all font-display uppercase tracking-wider ${activeTab === 'gateways' ? 'bg-[#D4AF37]/10 border-l-2 border-[#D4AF37] text-[#D4AF37] font-semibold shadow-[0_0_10px_rgba(212,175,55,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <CreditCard className="w-4 h-4" />
            Billing Modules
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs transition-all font-display uppercase tracking-wider ${activeTab === 'providers' ? 'bg-[#D4AF37]/10 border-l-2 border-[#D4AF37] text-[#D4AF37] font-semibold shadow-[0_0_10px_rgba(212,175,55,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Sliders className="w-4 h-4" />
            API Code Suppliers
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs transition-all font-display uppercase tracking-wider ${activeTab === 'coupons' ? 'bg-[#D4AF37]/10 border-l-2 border-[#D4AF37] text-[#D4AF37] font-semibold shadow-[0_0_10px_rgba(212,175,55,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Tags className="w-4 h-4" />
            VIP Coupons
          </button>

          <button
            onClick={() => setActiveTab('shields')}
            className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs transition-all font-display uppercase tracking-wider ${activeTab === 'shields' ? 'bg-[#D4AF37]/10 border-l-2 border-[#D4AF37] text-[#D4AF37] font-semibold shadow-[0_0_10px_rgba(212,175,55,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <ShieldAlert className="w-4 h-4" />
            Anti-Fraud System
          </button>

          <button
            onClick={() => setActiveTab('chats')}
            className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs transition-all font-display uppercase tracking-wider ${activeTab === 'chats' ? 'bg-[#D4AF37]/10 border-l-2 border-[#D4AF37] text-[#D4AF37] font-semibold shadow-[0_0_10px_rgba(212,175,55,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <MessageCircle className="w-4 h-4" />
            Operator Support
          </button>
        </nav>

        {/* Tab Content Canvas */}
        <main className="flex-1 p-8 overflow-y-auto bg-[#070707] premium-purple-glow">
          
          {/* TAB: FINTECH CUSTOMERS CONTROL PANEL */}
          {activeTab === 'customers' && (
            <div className="space-y-8 animate-in fade-in-50 duration-200">
              <div className="border-b border-white/5 pb-4 flex justify-between items-end">
                <div>
                  <h2 className="text-lg font-display font-bold text-white uppercase tracking-widest">Fintech Asset Registries</h2>
                  <p className="text-xs text-gray-400 mt-1">Audit multi-currency wallets, adjust ledger balances, and enforce account shield statuses.</p>
                </div>
                
                {/* Search Panel */}
                <div className="relative w-80">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="Search by ID, Email, or Wallet..."
                    className="w-full pl-9 pr-4 py-2 bg-[#0E0E0E] text-xs text-white rounded-lg border border-white/10 focus:border-[#D4AF37] outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Customer Ledger Table */}
                <div className="lg:col-span-2 bg-[#0E0E0E] border border-white/5 rounded-xl overflow-hidden shadow-xl">
                  <div className="px-5 py-4 bg-black/40 border-b border-white/5 flex justify-between items-center">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D4AF37]">Active Portfolio Accounts ({customers.length})</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] uppercase font-mono tracking-wider text-gray-500 bg-black/50">
                          <th className="py-4 px-5">Customer Profile</th>
                          <th className="py-4 px-4">Registry Identifiers</th>
                          <th className="py-4 px-4 text-right">Preferred Denom</th>
                          <th className="py-4 px-4 text-right">Ledger Balance</th>
                          <th className="py-4 px-5 text-center">Status Shield</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {customers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-500 font-mono">No customer accounts registered.</td>
                          </tr>
                        ) : (
                          customers.map(c => {
                            const isOnline = onlineEmails.some(email => email.toLowerCase() === c.email.toLowerCase());
                            return (
                              <tr 
                                key={c.id} 
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setBalanceOverrideInput(c.balance !== undefined ? c.balance.toFixed(2) : '150.00');
                                  setAdjustingId(null);
                                }}
                                className={`cursor-pointer transition-colors ${selectedCustomer?.id === c.id ? 'bg-[#D4AF37]/5' : 'hover:bg-white/5'}`}
                              >
                                <td className="py-4 px-5">
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1F1F1F] to-[#0A0A0A] border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-[#D4AF37]">
                                        {c.name ? c.name.substring(0, 2).toUpperCase() : "G"}
                                      </div>
                                      {isOnline && (
                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#0E0E0E] animate-pulse"></span>
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-bold text-white font-sans flex items-center gap-1.5">
                                        {c.name || "Elite Client"}
                                        {isOnline && <span className="text-[9px] text-emerald-400 font-mono px-1 bg-emerald-900/20 border border-emerald-500/20 rounded">ONLINE</span>}
                                      </p>
                                      <p className="text-[10px] text-gray-500 font-mono">{c.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-mono text-gray-400">ID: <span className="text-[#D4AF37]">{c.id}</span></p>
                                    <p className="text-[10px] font-mono text-gray-400 font-semibold">Wallet: <span>{c.walletId || "Pending"}</span></p>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <div className="space-y-1">
                                    <p className="font-bold text-white uppercase font-sans">{c.currency || "USD"}</p>
                                    <p className="text-[10px] text-gray-500 font-mono">{c.country || "US"}</p>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <p className="font-mono font-semibold text-[#D4AF37] text-sm">
                                    ${c.balance !== undefined ? Number(c.balance).toFixed(2) : "150.00"}
                                  </p>
                                  <p className="text-[9px] text-gray-500 font-mono">Orders: {c.totalOrders || 0}</p>
                                </td>
                                <td className="py-4 px-5">
                                  <div className="flex justify-center">
                                    {c.status === 'suspended' ? (
                                      <span className="px-2 py-0.5 bg-red-950/40 border border-red-500/30 text-red-400 text-[10px] rounded font-mono font-bold tracking-wider">SUSPENDED</span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] rounded font-mono font-bold tracking-wider">ACTIVE</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Side Inspector Profile Drawer */}
                <div className="bg-[#0E0E0E] border border-white/5 rounded-xl p-6 shadow-xl h-fit space-y-6">
                  {selectedCustomer ? (
                    <div className="space-y-6">
                      <div className="border-b border-white/5 pb-4 flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">Security Inspector</h3>
                          <p className="text-[9px] text-[#D4AF37] font-mono uppercase tracking-widest mt-0.5">VAULT LEDGER VERIFICATION</p>
                        </div>
                        <button 
                          onClick={() => setSelectedCustomer(null)}
                          className="text-gray-500 hover:text-white text-xs font-mono border border-white/10 px-2 py-1 rounded"
                        >
                          Clear
                        </button>
                      </div>

                      {/* Header Summary */}
                      <div className="flex items-center gap-4 bg-black/40 p-4 border border-white/5 rounded-lg">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-[#D4AF37]/30 flex items-center justify-center text-sm font-mono font-bold text-[#D4AF37]">
                          {selectedCustomer.name ? selectedCustomer.name.substring(0, 2).toUpperCase() : "G"}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{selectedCustomer.name}</h4>
                          <p className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]">{selectedCustomer.email}</p>
                          <p className="text-[9px] text-gray-500 font-mono">Registered: {new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Client Attributes */}
                      <div className="grid grid-cols-2 gap-3.5 bg-white/[0.02] p-4 border border-white/5 rounded-lg text-[11px]">
                        <div>
                          <p className="text-gray-500 uppercase font-mono text-[9px]">ID TARGET</p>
                          <p className="font-bold text-[#D4AF37] font-mono mt-0.5">{selectedCustomer.id}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 uppercase font-mono text-[9px]">WALLET KEY (8-DIGIT)</p>
                          <p className="font-bold text-white font-mono mt-0.5">{selectedCustomer.walletId || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 uppercase font-mono text-[9px]">PREFERRED TAX INDEX</p>
                          <p className="font-bold text-white mt-0.5">{selectedCustomer.currency || "USD"} ({selectedCustomer.country || "US"})</p>
                        </div>
                        <div>
                          <p className="text-gray-500 uppercase font-mono text-[9px]">TOTAL DIGITAL ORDERS</p>
                          <p className="font-bold text-white mt-0.5">{selectedCustomer.totalOrders || 0} Transactions</p>
                        </div>
                      </div>

                      {/* Manual Balance Overriding form */}
                      <div className="space-y-3 bg-[#120F10] border border-red-950/50 p-4 rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs text-red-400 font-mono font-bold uppercase tracking-wider">
                          <Scale className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Override Wallet Balance</span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                          Force-rewrite the customer's available funding balance. A systematic ledger item will automatically document this adjustment.
                        </p>

                        <div className="flex gap-2.5 mt-2">
                          <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-gray-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={balanceOverrideInput}
                              onChange={e => setBalanceOverrideInput(e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-7 pr-3 py-2 bg-[#0E0E0E] text-xs text-white rounded border border-white/10 focus:border-[#D4AF37] outline-none"
                            />
                          </div>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Overwriting wallet of user ${selectedCustomer.id} to $${balanceOverrideInput} USD. Approve index write?`)) {
                                setActionLoading(true);
                                try {
                                  await handleUpdateBalance(selectedCustomer.id, Number(balanceOverrideInput));
                                } finally {
                                  setActionLoading(false);
                                }
                              }
                            }}
                            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c29d2f] text-[#0B0B0B] text-[11px] font-mono font-bold rounded transition-colors"
                          >
                            Rewrite
                          </button>
                        </div>
                      </div>

                      {/* Security Status Blocks */}
                      <div className="flex justify-between items-center bg-[#101010] p-4 border border-white/5 rounded-lg text-xs">
                        <div>
                          <p className="font-bold text-white">Status Security Shield</p>
                          <p className="text-[9px] text-gray-400">Suspend trading access instantly on alert.</p>
                        </div>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Vary security status for client ${selectedCustomer.id}?`)) {
                              setActionLoading(true);
                              try {
                                await handleToggleStatus(selectedCustomer.id, selectedCustomer.status || 'active');
                              } finally {
                                setActionLoading(false);
                              }
                            }
                          }}
                          className={`px-4 py-2 rounded font-mono font-bold text-[10px] tracking-wider uppercase transition-colors ${
                            selectedCustomer.status === 'suspended'
                              ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-400'
                              : 'bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-400'
                          }`}
                        >
                          {selectedCustomer.status === 'suspended' ? 'Unsuspended' : 'Suspend'}
                        </button>
                      </div>

                      {/* Ledger History details */}
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-500 block">Ledger Logs</span>
                        <div className="bg-[#0A0A0A] border border-white/5 p-3 rounded-lg max-h-40 overflow-y-auto space-y-2.5">
                          {!selectedCustomer.ledger || selectedCustomer.ledger.length === 0 ? (
                            <p className="text-[10px] text-gray-600 font-mono text-center py-2.5">No ledger load lines recorded.</p>
                          ) : (
                            selectedCustomer.ledger.map((log: any, idx: number) => (
                              <div key={idx} className="border-b border-white/5 pb-2 last:border-b-0 last:pb-0 font-mono text-[9px] leading-relaxed">
                                <div className="flex justify-between text-[#D4AF37] mb-0.5">
                                  <span>{log.id || `TXID-${idx}`}</span>
                                  <span className="font-bold">${Number(log.amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                  <span>From: {log.from}</span>
                                  <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-600 space-y-2">
                      <Scale className="w-8 h-8 text-gray-700 mx-auto" />
                      <p className="text-xs font-mono uppercase tracking-wider text-gray-500">Inspector Panel Standby</p>
                      <p className="text-[10px] text-gray-600 leading-relaxed max-w-[200px] mx-auto">
                        Click on any portfolio registry line in the left table to load comprehensive client variables.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ANALYTICS OVERVIEW WITH DYNAMIC VECTOR CHARTS */}
          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in fade-in-50 duration-200">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-lg font-display font-bold text-white uppercase tracking-widest">Global Sourcing Financial Sheets</h2>
                <p className="text-xs text-gray-400 mt-1">SLA response timers, regional volume distribution, and ledger pipelines.</p>
              </div>

              {/* Statistical Bento Card Column values */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="p-5 bg-[#0E0E0E] border border-[#D4AF37]/35 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-[#D4AF37]/5 rounded-full"></div>
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-gray-400">LEDGER REVENUE</span>
                    <DollarSign className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <p className="text-2xl font-display font-medium text-[#D4AF37] tracking-wider">
                    ${analytics?.totalRevenue?.toFixed(2) || "0.00"}
                  </p>
                </div>

                <div className="p-5 bg-[#0E0E0E] border border-white/10 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-gray-400">TRANSACTION INDEX</span>
                    <ShoppingBag className="w-4 h-4 text-[#8A2BE2]" />
                  </div>
                  <p className="text-2xl font-display font-medium text-white tracking-wider">
                    {analytics?.ordersCount || 0}
                  </p>
                </div>

                <div className="p-5 bg-[#0E0E0E] border border-white/10 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-gray-400">EXECUTIVE USERS</span>
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-display font-medium text-white tracking-wider">
                    {analytics?.usersCount || 0}
                  </p>
                </div>

                <div className="p-5 bg-[#0E0E0E] border border-white/10 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-gray-400">VOUCHER TEMPLATES</span>
                    <Layers className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-display font-medium text-white tracking-wider">
                    {analytics?.productsCount || 0}
                  </p>
                </div>
              </div>

              {/* HIGH LEVEL INTEGRATIVE RECHARTS GRAPHIC SHEET */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Daily Revenue & Sales Volume */}
                <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-4 shadow-lg">
                  <div>
                    <h3 className="text-xs font-display font-bold text-[#D4AF37] tracking-widest uppercase flex items-center gap-1.5">
                      <Activity className="w-4 h-4" /> Daily Sales & Revenue (Last 15 Days)
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Real-time incoming orders, total checkout volume, and gross billing values.</p>
                  </div>
                  <div className="w-full h-64 bg-black/40 rounded-xl border border-white/5 p-2 overflow-hidden">
                    {analytics?.dailySales && analytics.dailySales.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.dailySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                          <XAxis dataKey="date" stroke="#666" fontSize={9} tickLine={false} />
                          <YAxis stroke="#666" fontSize={9} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }}
                            labelStyle={{ color: '#aaa', fontSize: '10px', fontFamily: 'monospace' }}
                            itemStyle={{ color: '#D4AF37', fontSize: '11px' }}
                          />
                          <Area type="monotone" dataKey="revenue" name="Revenue (USD)" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#revenueGrad)" />
                          <Line type="monotone" dataKey="count" name="Orders Count" stroke="#8A2BE2" strokeWidth={1.5} dot={{ r: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-600 italic">No Sales Data recorded.</div>
                    )}
                  </div>
                </div>

                {/* Chart 2: Cumulative Customer Signups Growth */}
                <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-4 shadow-lg">
                  <div>
                    <h3 className="text-xs font-display font-bold text-purple-400 tracking-widest uppercase flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> Cumulative User Base Growth (Last 15 Days)
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Aggregated unique account registrations history and active portfolios.</p>
                  </div>
                  <div className="w-full h-64 bg-black/40 rounded-xl border border-white/5 p-2 overflow-hidden">
                    {analytics?.usersGrowth && analytics.usersGrowth.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.usersGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                          <XAxis dataKey="date" stroke="#666" fontSize={9} tickLine={false} />
                          <YAxis stroke="#666" fontSize={9} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }}
                            labelStyle={{ color: '#aaa', fontSize: '10px', fontFamily: 'monospace' }}
                            itemStyle={{ color: '#a855f7', fontSize: '11px' }}
                          />
                          <Line type="monotone" dataKey="count" name="Total Users Registered" stroke="#8A2BE2" strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-600 italic">No user demographics recorded.</div>
                    )}
                  </div>
                </div>

                {/* Chart 3: Monthly Net Performance */}
                <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-4 shadow-lg">
                  <div>
                    <h3 className="text-xs font-display font-bold text-emerald-400 tracking-widest uppercase flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" /> Monthly Revenue Comparison
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Compounded income streams distributed per active calendar month.</p>
                  </div>
                  <div className="w-full h-64 bg-black/40 rounded-xl border border-white/5 p-2 overflow-hidden">
                    {analytics?.monthlyRevenue && analytics.monthlyRevenue.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.monthlyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                          <XAxis dataKey="month" stroke="#666" fontSize={9} tickLine={false} />
                          <YAxis stroke="#666" fontSize={9} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }}
                            labelStyle={{ color: '#aaa', fontSize: '10px', fontFamily: 'monospace' }}
                            itemStyle={{ color: '#10b981', fontSize: '11px' }}
                          />
                          <Bar dataKey="revenue" name="Revenue (USD)" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-600 italic">No monthly logs recorded.</div>
                    )}
                  </div>
                </div>

                {/* Chart 4: Sourcing Regional Demographics */}
                <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-4 shadow-lg">
                  <div>
                    <h3 className="text-xs font-display font-bold text-[#8A2BE2] tracking-widest uppercase flex items-center gap-1.5">
                      <Layers className="w-4 h-4" /> Geographical Region Demographics (Revenue)
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Distribution maps showing premium digital orders across regional markets.</p>
                  </div>
                  <div className="w-full h-64 bg-black/40 rounded-xl border border-white/5 p-2 overflow-hidden">
                    {analytics?.topCountries && analytics.topCountries.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.topCountries} layout="vertical" margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                          <XAxis type="number" stroke="#666" fontSize={9} tickLine={false} />
                          <YAxis dataKey="country" type="category" stroke="#666" fontSize={9} width={60} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }}
                            labelStyle={{ color: '#aaa', fontSize: '10px', fontFamily: 'monospace' }}
                            itemStyle={{ color: '#8A2BE2', fontSize: '11px' }}
                          />
                          <Bar dataKey="revenue" name="Revenue (USD)" fill="#8A2BE2" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-600 italic">No geographic data recorded.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* MOST SOLD PRODUCTS TABLE & SHARE SPLITS Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Most Sold Products Container */}
                <div className="xl:col-span-2 p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-4 shadow-lg">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">🔥 MOST POPULAR CATALOG PRODUCTS</h3>
                    <span className="text-[9px] font-mono bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-2 py-0.5 rounded uppercase font-bold">Top Selling Products</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-gray-500 uppercase tracking-widest text-[8px] font-mono">
                          <th className="py-2">PRODUCT NAME</th>
                          <th className="py-2">CATEGORY</th>
                          <th className="py-2 text-right">UNITS SOLD</th>
                          <th className="py-2 text-right">REVENUE GENERATED</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {!analytics?.mostSoldProducts || analytics.mostSoldProducts.length === 0 ? (
                          <tr><td colSpan={4} className="text-center py-8 text-gray-600 italic">No purchases generated yet.</td></tr>
                        ) : (
                          analytics.mostSoldProducts.map((prod: any, idx: number) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 font-semibold text-white flex items-center gap-2">
                                <span className="text-[10px] bg-[#121212] px-1.5 py-0.5 rounded text-gray-400 font-mono">#{idx+1}</span>
                                {prod.name}
                              </td>
                              <td className="py-3 text-purple-400 font-mono text-[10px] uppercase">{prod.category}</td>
                              <td className="py-3 text-right text-gray-300 font-mono font-bold">{prod.count} items</td>
                              <td className="py-3 text-right text-[#D4AF37] font-mono font-bold">${Number(prod.revenue).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Left Side Category Split and Sourced SLA latency metrics */}
                <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-6 shadow-lg">
                  <div>
                    <h3 className="text-xs font-display font-bold border-b border-white/5 pb-2.5 text-[#D4AF37] uppercase tracking-wider">SHARE SPLIT MULTIPLIERS</h3>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">Percentage value share distribution categorized by brand segment tags.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1 text-gray-400">
                        <span>Apple iTunes Vault</span>
                        <span>${analytics?.categoryRevenue?.itunes?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="w-full h-1.5 bg-black rounded overflow-hidden">
                        <div className="bg-[#8A2BE2] h-full" style={{ width: `${(analytics?.categoryRevenue?.itunes / (analytics?.totalRevenue || 1)) * 100 || 0}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1 text-gray-400">
                        <span>PUBG UC Gamer's Block</span>
                        <span>${analytics?.categoryRevenue?.pubg?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="w-full h-1.5 bg-black rounded overflow-hidden">
                        <div className="bg-[#D4AF37] h-full" style={{ width: `${(analytics?.categoryRevenue?.pubg / (analytics?.totalRevenue || 1)) * 100 || 0}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1 text-gray-400">
                        <span>Google Play Reserve</span>
                        <span>${analytics?.categoryRevenue?.google?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="w-full h-1.5 bg-black rounded overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${(analytics?.categoryRevenue?.google / (analytics?.totalRevenue || 1)) * 100 || 0}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Sourced API Provider SLA logs status indicator */}
                  <div className="pt-3 border-t border-white/5 space-y-2">
                    <span className="text-[9px] font-mono text-purple-400 tracking-widest font-bold uppercase block">API LATENCY INDEX SLA</span>
                    <div className="flex justify-between items-center text-[11px] font-mono text-gray-400">
                      <span>CodesExpress Gateway</span>
                      <span className="text-emerald-400 font-bold">240ms (SLA OK)</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-mono text-gray-400">
                      <span>PrimeVouchers Gateway</span>
                      <span className="text-emerald-400 font-bold">110ms (SLA OK)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* LATEST TRANSACTION LEDGER */}
              <div className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl space-y-4 shadow-lg">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">RECENT TRANSACTION REGISTER INDEX</h3>
                  <span className="text-[8px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded uppercase font-bold">Billing Ledgers</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 uppercase tracking-widest text-[8px]">
                        <th className="py-2">BILLING ID</th>
                        <th className="py-2">CLIENT EMAIL</th>
                        <th className="py-2">COST (USD)</th>
                        <th className="py-2">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!analytics?.recentOrders || analytics?.recentOrders?.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-6 text-gray-600">No active invoices found.</td></tr>
                      ) : (
                        analytics?.recentOrders?.map((ord: Order) => (
                          <tr key={ord.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-2.5 font-bold text-gray-300">{ord.id}</td>
                            <td className="py-2.5 text-gray-400">{ord.customerEmail}</td>
                            <td className="py-2.5 text-[#D4AF37] font-semibold">${ord.priceUSD.toFixed(2)}</td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${ord.paymentStatus === 'completed' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-amber-950/40 text-amber-400 border border-amber-900/40'}`}>
                                {ord.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS MANAGER */}
          {activeTab === 'products' && (
            <div className="space-y-8 animate-in fade-in-50 duration-200">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-lg font-display font-bold text-white uppercase tracking-widest">Defined Product Assets</h2>
                  <p className="text-xs text-gray-400 mt-1">Configure active gift card categories, denomination arrays, and custom values.</p>
                </div>
                <button
                  onClick={() => setEditingProduct({
                    name: '',
                    description: '',
                    category: 'itunes',
                    image: 'purple-gradient',
                    options: [{ id: 'opt-' + Date.now(), label: '$10 USD', priceUSD: 10, value: 'VOUCHER-DEFAULT-SECRET-VALUE-PIN' }],
                    active: true
                  })}
                  className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black font-display font-semibold rounded-lg text-xs tracking-wider uppercase hover:bg-[#c29d2f] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Define Gift Card SKU
                </button>
              </div>

              {editingProduct && (
                <div className="p-6 bg-[#0E0E0E] border border-[#D4AF37]/35 rounded-xl space-y-4 max-w-2xl">
                  <h3 className="font-display text-xs font-bold text-[#D4AF37] uppercase tracking-widest">
                    {editingProduct.id ? "Alter Existing Asset Option" : "Define New Luxury Digital Asset"}
                  </h3>

                  <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Product Name</label>
                        <input
                          type="text"
                          required
                          value={editingProduct.name || ''}
                          onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                          className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white focus:border-[#D4AF37] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Asset Class Category</label>
                        <select
                          value={editingProduct.category || 'itunes'}
                          onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                          className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]"
                        >
                          <option value="itunes">Apple iTunes Store</option>
                          <option value="pubg">PUBG UC Mobile Tokens</option>
                          <option value="google">Google Play Reserve</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Description</label>
                      <textarea
                        value={editingProduct.description || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-1.5 bg-[#121212] border border-white/10 rounded-lg text-xs text-white focus:border-[#D4AF37] outline-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-mono uppercase text-gray-500">Denominational Options</label>
                        <button
                          type="button"
                          onClick={() => {
                            const currentOpts = editingProduct.options || [];
                            setEditingProduct({
                              ...editingProduct,
                              options: [...currentOpts, { id: 'opt-' + Date.now(), label: '$25 USD', priceUSD: 25, value: 'VOUCHER-PIN-SOURCE-VALUE' }]
                            });
                          }}
                          className="text-[9px] font-mono text-[#D4AF37] hover:underline"
                        >
                          + Add Nominal Tier
                        </button>
                      </div>
                      {editingProduct.options?.map((opt, oIdx) => (
                        <div key={opt.id} className="grid grid-cols-4 gap-2 items-center">
                          <input
                            type="text"
                            placeholder="e.g. $50 USD"
                            required
                            value={opt.label}
                            onChange={e => {
                              const newOpts = [...(editingProduct.options || [])];
                              newOpts[oIdx].label = e.target.value;
                              setEditingProduct({ ...editingProduct, options: newOpts });
                            }}
                            className="px-3 py-2 bg-[#121212] border border-white/5 rounded-lg text-xs text-white"
                          />
                          <input
                            type="number"
                            step="any"
                            placeholder="Price USD"
                            required
                            value={opt.priceUSD}
                            onChange={e => {
                              const newOpts = [...(editingProduct.options || [])];
                              newOpts[oIdx].priceUSD = parseFloat(e.target.value) || 0;
                              setEditingProduct({ ...editingProduct, options: newOpts });
                            }}
                            className="px-3 py-2 bg-[#121212] border border-white/5 rounded-lg text-xs text-white"
                          />
                          <input
                            type="text"
                            placeholder="Voucher Pin Value"
                            required
                            value={opt.value}
                            onChange={e => {
                              const newOpts = [...(editingProduct.options || [])];
                              newOpts[oIdx].value = e.target.value;
                              setEditingProduct({ ...editingProduct, options: newOpts });
                            }}
                            className="px-3 py-2 bg-[#121212] border border-white/5 rounded-lg text-xs text-white col-span-2"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(null)}
                        className="px-4 py-2 bg-white/5 rounded-lg text-xs hover:bg-white/10 text-gray-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-4 py-2 bg-[#D4AF37] text-black font-display font-semibold rounded-lg text-xs hover:bg-[#c29d2f]"
                      >
                        Commit Card SKU
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Products list Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {products.map(prod => (
                  <div key={prod.id} className="p-5 bg-[#0E0E0E] border border-white/5 rounded-xl space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-display font-bold text-white text-sm tracking-wide">{prod.name}</h3>
                        <span className="text-[9px] font-mono py-0.5 px-2 bg-black border border-[#D4AF37]/20 rounded text-[#D4AF37] uppercase">
                          {prod.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{prod.description}</p>
                      
                      <div className="mt-4 space-y-2 border-t border-white/5 pt-2">
                        <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Configured Nominal Options:</span>
                        <div className="flex flex-wrap gap-2">
                          {prod.options.map(opt => (
                            <span key={opt.id} className="text-[10px] font-mono px-2 py-0.5 bg-[#121212] text-gray-300 rounded border border-white/10">
                              {opt.label} - ${opt.priceUSD}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5 justify-end mt-4 border-t border-white/5 pt-4">
                      <button
                        onClick={() => setEditingProduct(prod)}
                        className="px-3.5 py-1.5 border border-white/10 text-gray-300 rounded hover:border-[#D4AF37]/50 text-xs transition-colors"
                      >
                        Edit Options
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 border border-red-950 text-red-500 hover:bg-red-950/20 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTION ORDERS VIEW */}
          {activeTab === 'orders' && (
            <div className="space-y-8 animate-in fade-in-50 duration-200">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-lg font-display font-bold text-white uppercase tracking-widest">Full Financial Invoice Log</h2>
                <p className="text-xs text-gray-400 mt-1">Audit billing paths, geo-currency options, delivery suppliers traces, and voucher pins.</p>
              </div>

              <div className="bg-[#0E0E0E] border border-white/5 rounded-2xl overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500 uppercase tracking-widest text-[8px] bg-black/40">
                      <th className="p-4">TRANSACTION BLOCK</th>
                      <th className="p-4">CLIENT IDENT</th>
                      <th className="p-4">PROCURED VOUCHER</th>
                      <th className="p-4">EXCHANGED TOTAL</th>
                      <th className="p-4">FAILOVER TRACE ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-gray-600 font-mono">No active invoices stored.</td></tr>
                    ) : (
                      orders.map(ord => (
                        <tr key={ord.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-gray-200 font-mono">{ord.id}</span>
                            <span className="block text-[9px] text-[#D4AF37] mt-0.5">{new Date(ord.createdAt).toLocaleString()}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-sans font-bold text-gray-300 block">{ord.customerName}</span>
                            <span className="text-[10px] text-gray-400">{ord.customerEmail}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-sans font-semibold text-white block">{ord.productName}</span>
                            <span className="text-[10px] text-gray-500">Nominal: {ord.optionLabel}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-[#D4AF37] font-semibold text-sm">${ord.priceUSD.toFixed(2)}</span>
                            <span className="block text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">{ord.paymentMethod} {ord.currencyCode !== 'USD' ? `(${ord.currencyCode})` : ''}</span>
                          </td>
                          <td className="p-4 space-y-2 pb-5">
                            <div className="flex flex-col gap-2 min-w-[200px]">
                              {/* Interactive Status Selector */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400 uppercase font-mono">Status:</span>
                                <select
                                  value={ord.paymentStatus}
                                  onChange={async (e) => {
                                    const nextStatus = e.target.value as any;
                                    try {
                                      const res = await fetch(`/api/admin/orders/${ord.id}/status`, {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${token}`
                                        },
                                        body: JSON.stringify({ status: nextStatus })
                                      });
                                      if (res.ok) {
                                        setOrders(prev => prev.map(o => o.id === ord.id ? { ...o, paymentStatus: nextStatus } : o));
                                      } else {
                                        alert("Failed to modify order status.");
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className="bg-black text-[10px] text-[#D4AF37] border border-[#D4AF37]/30 rounded px-1.5 py-0.5 focus:outline-none focus:border-[#D4AF37] font-semibold font-mono"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="processing">Processing</option>
                                  <option value="completed">Completed</option>
                                  <option value="failed">Failed</option>
                                </select>
                                {ord.providerUsedName && (
                                  <span className="text-[9px] text-gray-500 font-mono">[{ord.providerUsedName}]</span>
                                )}
                              </div>

                              {/* Interactive Voucher Code editing */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400 uppercase font-mono">Code:</span>
                                <input
                                  type="text"
                                  defaultValue={ord.codeDelivered || ''}
                                  placeholder="Voucher code..."
                                  onBlur={async (e) => {
                                    const nextCode = e.target.value.trim();
                                    if (nextCode === (ord.codeDelivered || '')) return;
                                    try {
                                      const res = await fetch(`/api/admin/orders/${ord.id}/status`, {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${token}`
                                        },
                                        body: JSON.stringify({ status: ord.paymentStatus, codeDelivered: nextCode || null })
                                      });
                                      if (res.ok) {
                                        setOrders(prev => prev.map(o => o.id === ord.id ? { ...o, codeDelivered: nextCode || null } : o));
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className="bg-black/95 border border-white/10 rounded px-2 py-0.5 text-[10px] max-w-xs text-white focus:outline-none focus:border-[#D4AF37] font-mono flex-1"
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT SECTIONS ENABLE / DISABLE */}
          {activeTab === 'gateways' && (
            <div className="space-y-8 animate-in fade-in-50 duration-200">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-lg font-display font-bold text-white uppercase tracking-widest">Active Biling Modules Configurations</h2>
                <p className="text-xs text-gray-400 mt-1">Direct client payment tunnels setup. Enabled gates instantly populate storefront portals.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {gateways.map(gt => (
                  <div key={gt.id} className="p-6 bg-[#0E0E0E] border border-white/5 rounded-2xl flex flex-col justify-between space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h3 className="font-display font-semibold text-white tracking-widest uppercase text-xs">{gt.name}</h3>
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gt.enabled}
                            onChange={e => handleToggleGateway(gt.id, e.target.checked)}
                            className="sr-only peer"
                            id={`gateway-chk-${gt.id}`}
                          />
                          <label
                            htmlFor={`gateway-chk-${gt.id}`}
                            className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#D4AF37]"
                          ></label>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-[#D4AF37]">Active checkouts: {gt.enabled ? "ACTIVE" : "STANDBY"}</p>
                    </div>

                    {/* Apple Pay & Google Pay toggles checklist */}
                    {gt.id === 'stripe' && (
                      <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-3 font-mono text-[10px] text-gray-400">
                        <span className="block text-[8px] text-[#D4AF37] uppercase tracking-widest font-bold">Mobile Wallet Direct Controls</span>
                        <div className="flex justify-between items-center">
                          <span>Enable Apple Pay Toggles </span>
                          <input
                            type="checkbox"
                            checked={gt.applePayEnabled}
                            onChange={e => handleToggleSubGateways('stripe', 'applePayEnabled', e.target.checked)}
                            className="accent-[#D4AF37] w-4 h-4 cursor-pointer"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Enable Google Pay Controls G</span>
                          <input
                            type="checkbox"
                            checked={gt.googlePayEnabled}
                            onChange={e => handleToggleSubGateways('stripe', 'googlePayEnabled', e.target.checked)}
                            className="accent-[#D4AF37] w-4 h-4 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 font-mono text-xs text-gray-500">
                      <div>
                        <span className="block text-[8px] text-gray-600 uppercase tracking-widest">GATEWAY LINK ENDPOINT</span>
                        <code className="text-[10px] text-gray-400 bg-black/40 px-2 py-1 rounded block mt-1 truncate">
                          {gt.publicKey || "0xCryptographicSecureHardwareDirectWallet"}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SUPPLIER APIS & FAILOVERS MONITOR */}
          {activeTab === 'providers' && (
            <div className="space-y-8 animate-in fade-in-50 duration-200">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-lg font-display font-bold text-white uppercase tracking-widest">API 공급자 Sourcing Failover Registry</h2>
                <p className="text-xs text-gray-400 mt-1">Manage external digital suppliers, routing queue priority ranks, retry attempts and track live failover logs.</p>
              </div>

              {/* Dynamic Providers priority configuration */}
              <div className="space-y-4">
                {providers.map(pv => (
                  <div key={pv.id} className="p-5 bg-[#0E0E0E] border border-white/5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-display font-bold text-white text-xs tracking-wide uppercase">{pv.name}</h3>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${pv.active ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-zinc-800 text-zinc-500'}`}>
                          {pv.active ? `PRIORITY RANGE RANK: ${pv.priority}` : 'SUSPENDED'}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-gray-500 space-y-1">
                        <div>Server API Host: <span className="text-gray-300 font-bold">{pv.apiEndpoint}</span></div>
                        <div>Assigned Timeout Retry Limit: <span className="text-yellow-400 font-bold">{pv.retryAttempts} Attempts</span></div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {/* Priority toggle */}
                      <button
                        onClick={() => {
                          const newList = providers.map(p => {
                            if (p.id === pv.id) {
                              const nextPriority = p.priority === 1 ? 3 : p.priority - 1;
                              return { ...p, priority: nextPriority };
                            }
                            return p;
                          });
                          handleSaveProviders(newList);
                        }}
                        className="px-3.5 py-1.5 bg-black hover:bg-white/5 rounded-lg border border-white/10 text-[10px] font-mono text-gray-400 hover:text-white"
                      >
                        Adjust Failover Rank ({pv.priority})
                      </button>

                      <button
                        onClick={() => {
                          const updated = providers.map(p => p.id === pv.id ? { ...p, active: !p.active } : p);
                          handleSaveProviders(updated);
                        }}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-mono transition-all font-semibold ${pv.active ? 'bg-white/5 border border-white/10 text-red-400 hover:bg-red-950/20' : 'bg-[#D4AF37] text-black'}`}
                      >
                        {pv.active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* FAILOVER LOG TRACES FROM THE SYSTEM (Matches user failover requirement) */}
              <div className="space-y-4 pt-4">
                <h3 className="text-xs font-display font-bold text-white tracking-widest uppercase">Live Sourcing Failover incident Logs</h3>
                <div className="p-4 bg-black/60 border border-white/5 rounded-2xl max-h-60 overflow-y-auto space-y-3">
                  {providerLogs.length === 0 ? (
                    <p className="text-xs text-gray-500 italic font-mono p-4 text-center">No sourcing API errors logged inside server stack combined registries.</p>
                  ) : (
                    [...providerLogs].reverse().map(log => (
                      <div key={log.id} className="p-3 bg-[#0E0E0E] rounded border border-white/5 font-mono text-[10px] flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 font-bold">{new Date(log.createdAt).toLocaleTimeString()}</span>
                            <span className="font-extrabold text-white">[{log.providerName}]</span>
                            <span className={`px-1 rounded text-[8px] ${log.status === 'success' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400 animate-pulse'}`}>
                              {log.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-400">{log.message}</p>
                          <span className="text-gray-600 block text-[8px]">LOG ID: {log.id} // RESOLUTION LATENCY: {log.responseTimeMs}ms</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: VIP COUPONS CREATOR */}
          {activeTab === 'coupons' && (
            <div className="space-y-8 animate-in fade-in-50 duration-200">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-lg font-display font-bold text-white uppercase tracking-widest">Coupons & VIP Discounts Generator</h2>
                <p className="text-xs text-gray-400 mt-1">Configure promotional discount coupons tag to boost active customer conversions.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coupon Create form box */}
                <div className="p-6 bg-[#0E0E0E] border border-[#D4AF37]/35 rounded-2xl space-y-4 h-fit">
                  <span className="text-[9px] font-mono text-[#D4AF37] uppercase tracking-widest font-bold">Generate New Ticket Tag</span>
                  <form onSubmit={handleCreateCoupon} className="space-y-3 font-sans">
                    <div>
                      <label className="block text-[8px] font-mono uppercase text-gray-500 mb-1">Coupon Tag *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. FLASH40"
                        value={newCoupon.code || ''}
                        onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                        className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white uppercase font-bold outline-none focus:border-[#D4AF37]/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] font-mono uppercase text-gray-500 mb-1">Discount Type</label>
                        <select
                          value={newCoupon.discountType || 'percentage'}
                          onChange={e => setNewCoupon({ ...newCoupon, discountType: e.target.value as 'percentage' | 'fixed' })}
                          className="w-full px-2.5 py-2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]/50"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed (USD $)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] font-mono uppercase text-gray-500 mb-1">
                          {newCoupon.discountType === 'fixed' ? 'Discount Core ($) *' : 'Discount Rate (%) *'}
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder={newCoupon.discountType === 'fixed' ? '5.00' : '15'}
                          value={newCoupon.discountValue !== undefined ? newCoupon.discountValue : 10}
                          onChange={e => setNewCoupon({ ...newCoupon, discountValue: parseFloat(e.target.value) || 10 })}
                          className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] font-mono uppercase text-gray-500 mb-1">Assign to product scope</label>
                      <select
                        value={newCoupon.assignedProductId || 'all'}
                        onChange={e => setNewCoupon({ ...newCoupon, assignedProductId: e.target.value })}
                        className="w-full px-2.5 py-2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]/50"
                      >
                        <option value="all">Apply to All Products</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.category.toUpperCase()})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-mono uppercase text-gray-500 mb-1">Expiration time (Optional)</label>
                      <input
                        type="datetime-local"
                        value={newCoupon.expiryDate || ''}
                        onChange={e => setNewCoupon({ ...newCoupon, expiryDate: e.target.value })}
                        className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]/50 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-mono uppercase text-gray-500 mb-1">Description Label *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Black Friday Special VIP voucher"
                        value={newCoupon.description || ''}
                        onChange={e => setNewCoupon({ ...newCoupon, description: e.target.value })}
                        className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]/50"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-[#D4AF37] hover:bg-[#c29d2f] text-black font-display font-semibold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Deploy Coupon Code
                    </button>
                  </form>
                </div>

                {/* Coupons list box */}
                <div className="lg:col-span-2 p-6 bg-[#0E0E0E] rounded-2xl border border-white/5 space-y-4">
                  <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold block">Active VIP Registry Labels</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {coupons.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-xs text-gray-500 italic">
                        No coupons generated yet. Design one using the registry tool!
                      </div>
                    ) : (
                      coupons.map(cpn => {
                        const isExpired = cpn.expiryDate ? new Date(cpn.expiryDate).getTime() < Date.now() : false;
                        const specProduct = products.find(p => p.id === cpn.assignedProductId);
                        
                        return (
                          <div
                            key={cpn.id}
                            className={`p-4 bg-black/45 rounded-xl border flex justify-between items-start transition-all duration-200 hover:border-[#D4AF37]/45 cursor-default ${
                              isExpired ? 'opacity-40 border-dashed border-red-900' : 'border-white/5'
                            }`}
                          >
                            <div className="space-y-1.5 min-w-0 font-sans">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs font-mono font-bold text-white tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                  {cpn.code}
                                </h4>
                                {isExpired && (
                                  <span className="text-[8px] font-mono bg-rose-950/60 text-rose-400 border border-rose-900/40 px-1 py-0.5 rounded font-bold uppercase">
                                    Expired
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-white font-semibold font-mono">
                                {cpn.discountType === 'percentage' || !cpn.discountType ? (
                                  <span className="text-[#D4AF37]">
                                    -{cpn.discountValue || cpn.discountPercent}% Off Percentage
                                  </span>
                                ) : (
                                  <span className="text-emerald-400">
                                    -${cpn.discountValue} USD Flat Discount
                                  </span>
                                )}
                              </p>
                              {specProduct && (
                                <p className="text-[9px] text-[#D4AF37]/80 truncate font-semibold font-mono uppercase">
                                  🎯 Only valid for: {specProduct.name}
                                </p>
                              )}
                              {cpn.expiryDate && (
                                <p className="text-[9px] text-gray-400 font-mono">
                                  📅 Expires: {new Date(cpn.expiryDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                              )}
                              <p className="text-[10px] text-gray-400 leading-normal line-clamp-2">
                                {cpn.description}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteCoupon(cpn.id)}
                              className="p-1.5 border border-red-950 text-red-500 hover:bg-rose-950/30 rounded-md transition-all self-start ml-2 hover:border-red-500 flex-shrink-0 cursor-pointer"
                              title="Delete Coupon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ANTI-FRAUD / IP BLOCKING SHIELDS */}
          {activeTab === 'shields' && (
            <div className="space-y-8 animate-in fade-in-50 duration-200">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-lg font-display font-bold text-white uppercase tracking-widest">Anti-Bot & Anti-Fraud Security Shields</h2>
                <p className="text-xs text-gray-400 mt-1">Audit and block bot IPs manually, verify suspicious checkout activity registers, and configure IP blocking systems.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Block form */}
                <div className="p-6 bg-[#0E0E0E] border border-[#8A2BE2]/40 rounded-2xl space-y-4 h-fit">
                  <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold block">Blacklist Hacker network IP</span>
                  <form onSubmit={handleRegisterIPBlock} className="space-y-3">
                    <div>
                      <label className="block text-[8px] font-mono uppercase text-gray-500 mb-1">Target Network URL / IP address *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., 103.22.201.5"
                        value={newBlockIP}
                        onChange={e => setNewBlockIP(e.target.value)}
                        className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white font-mono outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-mono uppercase text-gray-500 mb-1">Specific Ban reason *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Scraper bots attempt"
                        value={newBlockReason}
                        onChange={e => setNewBlockReason(e.target.value)}
                        className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-red-950/40 border border-red-900/30 text-red-400 font-display font-semibold rounded-lg text-xs uppercase tracking-wider hover:bg-red-900/40"
                    >
                      Banish Network IP Prefix
                    </button>
                  </form>
                </div>

                {/* Suspended block logs */}
                <div className="md:col-span-2 p-6 bg-[#0E0E0E] rounded-2xl border border-white/5 space-y-4">
                  <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-widest font-bold block">Banned IPs Blacklist Register</span>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {blockedIPs.length === 0 ? (
                      <p className="text-xs text-gray-500 font-mono italic p-6 text-center">Unblemished security index: No blacklisted network hosts in register.</p>
                    ) : (
                      blockedIPs.map(block => (
                        <div key={block.id} className="p-3.5 bg-black/40 border border-white/5 rounded-xl flex justify-between items-center hover:border-red-500/20 transition-all font-mono">
                          <div className="space-y-1">
                            <h4 className="text-xs text-red-400 font-bold">{block.ip}</h4>
                            <p className="text-[10px] text-gray-400 leading-relaxed"><span className="text-gray-500">Reason:</span> {block.reason}</p>
                            <span className="text-[8px] text-gray-600 block">Blocked At: {new Date(block.blockedAt).toLocaleString()}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteIPBlock(block.id)}
                            className="px-2.5 py-1 bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 text-[10px] rounded hover:bg-emerald-900/40 transition-all uppercase"
                          >
                            Unban
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SUPPORT CONCIERGE CHATS */}
          {activeTab === 'chats' && (
            <div className="h-[calc(100vh-210px)] flex bg-[#0E0E0E] border border-white/5 rounded-2xl overflow-hidden shadow-lg animate-in fade-in-50 duration-200">
              <div className="w-80 border-r border-white/5 flex flex-col bg-[#121212]">
                <div className="p-4 border-b border-white/5 bg-black/40">
                  <h4 className="text-xs font-display font-bold uppercase tracking-widest text-[#D4AF37]">Concierge Chats list</h4>
                  <p className="text-[9px] text-gray-500 font-mono">DYNAMIC CLIENT TICKETS</p>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                  {conversations.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-600 font-mono">No customer support threads loaded.</div>
                  ) : (
                    conversations.map(conv => {
                      const isOnline = onlineEmails.some(email => email.toLowerCase() === conv.email.toLowerCase());
                      return (
                        <button
                          key={conv.email}
                          onClick={() => setSelectedChatUser(conv.email)}
                          className={`w-full p-4 text-left transition-all flex flex-col gap-1.5 ${selectedChatUser === conv.email ? 'bg-[#D4AF37]/10 border-r-2 border-[#D4AF37]' : 'hover:bg-white/5'}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-white truncate max-w-[150px] font-sans flex items-center gap-1.5">
                              {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>}
                              {conv.email}
                            </span>
                            <span className="text-[9px] text-gray-500 font-mono">
                              {new Date(conv.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 font-serif line-clamp-1 italic">
                            "{conv.lastText}"
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col h-full bg-[#070707]">
                {selectedChatUser ? (
                  <>
                    <div className="px-6 py-4 border-b border-white/5 bg-[#121212] flex justify-between items-center">
                      <div>
                        <h4 className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-widest">Active Chat session</h4>
                        <p className="text-xs font-bold text-white font-sans">{selectedChatUser}</p>
                      </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto space-y-4">
                      {activeChatThread.map((msg: ChatMessage) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[70%] ${msg.isAdmin ? 'ml-auto mr-0 items-end' : 'mr-auto ml-0 items-start'}`}
                        >
                          <div
                            className={`px-4 py-2.5 rounded-lg text-xs leading-relaxed ${msg.isAdmin ? 'bg-[#D4AF37] text-black font-semibold' : 'bg-black/50 text-white border border-[#8A2BE2]/20'}`}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[8px] text-gray-500 font-mono mt-1 px-1">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendAdminChat} className="p-4 bg-[#121212] border-t border-white/5 flex gap-2">
                      <input
                        type="text"
                        required
                        value={adminChatText}
                        onChange={e => setAdminChatText(e.target.value)}
                        placeholder={`Transmit reply to ${selectedChatUser}...`}
                        className="flex-1 px-4 py-3 bg-black/60 text-xs text-white rounded-lg border border-white/10 focus:border-[#D4AF37] outline-none"
                      />
                      <button
                        type="submit"
                        className="px-5 py-3 bg-[#D4AF37] hover:bg-[#c29d2f] text-[#0B0B0B] font-display font-semibold rounded-lg text-xs transition-colors"
                      >
                        Transmit
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center text-gray-500 font-mono gap-2 text-xs">
                    <MessageCircle className="w-8 h-8 text-gray-600 mb-1" />
                    <span>Select an active client ticket thread to communicate.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
