/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import { ChatMessage } from '../types';
import { MessageSquare, X, Send, User, ShieldCheck } from 'lucide-react';
import { io } from 'socket.io-client';

export default function LiveChatWidget({ currentUserEmail }: { currentUserEmail: string | null }) {
  const { t, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailLocked, setEmailLocked] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  const activeEmail = currentUserEmail || email;

  // Sync email lock state if page user changes
  useEffect(() => {
    if (currentUserEmail) {
      setEmailLocked(true);
    }
  }, [currentUserEmail]);

  // Integrated Socket.io Realtime Sync Client
  useEffect(() => {
    if (!isOpen || !activeEmail) return;

    // Connect to same origin standard port 3000
    const socket = io();
    socketRef.current = socket;

    // Register registry info
    socket.emit("register", { email: activeEmail, isAdmin: false });

    // Initial HTTP fetch
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat/messages?email=${encodeURIComponent(activeEmail)}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (e) {
        console.error("Initial chat messages load failed", e);
      }
    };
    fetchMessages();

    // Listener for live messages
    socket.on("new_message", (msg: ChatMessage) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    // Check presence indicators
    socket.on("presence_update", (data: { onlineUsers: string[]; adminOnline: boolean }) => {
      setIsAdminOnline(data.adminOnline);
    });

    return () => {
      socket.disconnect();
    };
  }, [isOpen, activeEmail]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setEmailLocked(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeEmail) return;

    const currentText = messageText;
    setMessageText('');
    setIsSubmitting(true);

    // If socket.io is connected, send via WebSocket instantly for microsecond roundtrips!
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("send_message", {
        text: currentText,
        email: activeEmail,
        isAdmin: false
      });
      setIsSubmitting(false);
    } else {
      // Fallback to active REST api route
      try {
        const response = await fetch('/api/chat/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: currentText,
            email: activeEmail,
            name: name || activeEmail.split('@')[0],
            isAdmin: false
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Absolute Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-5 py-3.5 bg-[#D4AF37] hover:bg-[#c29d2f] text-[#0B0B0B] font-display font-medium rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300 transform hover:scale-105"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm tracking-wide">{t.chatWithUs}</span>
        </button>
      )}

      {/* Luxury Chat Window Box */}
      {isOpen && (
        <div className="w-[360px] h-[500px] bg-[#141414] border border-[#D4AF37]/30 rounded-2xl flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in-50 duration-200">
          {/* Executive Header Bar */}
          <div className="px-5 py-4 bg-[#1C1C1C] border-b border-[#D4AF37]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isAdminOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
              <div>
                <h4 className="text-sm font-display font-semibold tracking-wide text-white">{t.chatWithUs}</h4>
                <p className="text-[10px] text-[#D4AF37] font-mono tracking-wider">
                  {isAdminOnline ? 'AURA VIP DESK (LIVE)' : 'AURA BOT DESK (STANDBY)'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Form to enter Email / Name if not logged in */}
          {!emailLocked && !currentUserEmail ? (
            <div className="flex-1 p-6 flex flex-col justify-center">
              <form onSubmit={handleStartChat} className="space-y-4">
                <div className="text-center space-y-1 mb-2">
                  <ShieldCheck className="w-10 h-10 text-[#D4AF37] mx-auto opacity-80" />
                  <p className="text-xs text-gray-400 font-sans">{t.guestCheckout}</p>
                  <p className="text-[10px] text-gray-500 font-mono">SECURE TICKET ASSIGNMENT</p>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#D4AF37] uppercase tracking-wider mb-1.5">{t.email}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. client@luxury.com"
                    className="w-full px-3.5 py-2.5 bg-[#1C1C1C] text-sm text-white rounded border border-white/10 focus:border-[#D4AF37] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#D4AF37] uppercase tracking-wider mb-1.5">{t.name}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Lord Sterling"
                    className="w-full px-3.5 py-2.5 bg-[#1C1C1C] text-sm text-white rounded border border-white/10 focus:border-[#D4AF37] outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#D4AF37] text-[#0B0B0B] font-display font-medium text-sm rounded transition-all hover:bg-[#c29d2f] active:scale-95"
                >
                  Enter Chat Registry
                </button>
              </form>
            </div>
          ) : (
            /* Active Messages Log */
            <>
              <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#0F0F0F]">
                {messages.length === 0 && (
                  <div className="text-center py-10 space-y-2">
                    <User className="w-8 h-8 text-[#D4AF37]/50 mx-auto" />
                    <p className="text-[11px] font-mono text-[#D4AF37]/70">VAULT OPERATIVE CONNECTED</p>
                    <p className="text-[10px] text-gray-600">State your transaction ID or digital inquiry.</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[80%] ${msg.isAdmin ? (isRTL ? 'mr-0 ml-auto' : 'mr-auto ml-0') : (isRTL ? 'mr-auto ml-0' : 'mr-0 ml-auto')}`}
                  >
                    <div
                      className={`px-3.5 py-2.5 rounded-lg text-sm leading-relaxed ${
                        msg.isAdmin
                          ? 'bg-[#1C1C1C] text-white border-l-2 border-[#D4AF37]'
                          : 'bg-[#D4AF37] text-[#0B0B0B] rounded-br-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-gray-500 font-mono mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Message Input box */}
              <form onSubmit={handleSendMessage} className="p-3 bg-[#1C1C1C] border-t border-white/5 flex gap-2">
                <input
                  type="text"
                  required
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Inquire digitally..."
                  className="flex-1 px-3.5 py-2 bg-[#0F0F0F] text-sm text-white rounded border border-white/10 focus:border-[#D4AF37] outline-none transition-all placeholder:text-gray-600"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="p-2.5 bg-[#D4AF37] hover:bg-[#c29d2f] text-[#0B0B0B] rounded transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
