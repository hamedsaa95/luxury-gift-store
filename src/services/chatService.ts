/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { Server as SocketServer, Socket } from "socket.io";
import { logger } from "../utils/logger";
import { ChatMessage } from "../types";

const DB_DIR = path.join(process.cwd(), ".data");
const CHAT_FILE = path.join(DB_DIR, "chat.json");

export class ChatService {
  private io: SocketServer | null = null;
  // Map of connected sockets: socket.id -> email
  private connectedSockets: Map<string, { email: string; isAdmin: boolean }> = new Map();
  // Set of currently online emails
  private onlineEmails: Set<string> = new Set();

  constructor() {
    this.ensureChatDb();
  }

  private ensureChatDb() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(CHAT_FILE)) {
      fs.writeFileSync(CHAT_FILE, JSON.stringify([], null, 2), "utf8");
    }
  }

  public registerSocketServer(io: SocketServer) {
    this.io = io;
    logger.info("[CHAT SERVICE] Socket.io server integrated successfully.");

    io.on("connection", (socket: Socket) => {
      logger.info(`[CHAT SOCKET] New connection received: Socket ID: ${socket.id}`);

      // 1. Identify on register call
      socket.on("register", (data: { email: string; isAdmin: boolean }) => {
        if (!data || !data.email) return;
        const normalizedEmail = data.email.trim().toLowerCase();
        
        this.connectedSockets.set(socket.id, { email: normalizedEmail, isAdmin: !!data.isAdmin });
        this.onlineEmails.add(normalizedEmail);

        // Join user's individual room for targeted delivery (useful for multi-tab users)
        socket.join(normalizedEmail);
        logger.info(`[CHAT SOCKET] Registered socket ${socket.id} to '${normalizedEmail}' (Is Admin: ${data.isAdmin})`);

        // Emit presence updates
        this.broadcastPresence();
      });

      // 2. Chat messaging channel
      socket.on("send_message", (data: { text: string; email: string; isAdmin: boolean }) => {
        if (!data || !data.text || !data.email) return;
        const msg = this.saveMessage(data.text, data.email, !!data.isAdmin);

        // Broadcast to relevant rooms
        const normalizedEmail = data.email.trim().toLowerCase();
        
        // Broadcast message to everyone in the room (client, admin reading this specific user room, etc.)
        io.to(normalizedEmail).emit("new_message", msg);
        // Also emit to 'admins' room for live global dashboard updates
        io.to("admins").emit("conversation_updated", {
          email: normalizedEmail,
          lastText: msg.text,
          lastTime: msg.createdAt,
          message: msg
        });

        // If from client, queue automated prompt reply
        if (!data.isAdmin) {
          this.queueAutomatedReply(normalizedEmail);
        }
      });

      // 3. Admin join admins room
      socket.on("enter_admin_desk", () => {
        socket.join("admins");
        logger.info(`[CHAT SOCKET] Admin socket ${socket.id} joined global admins dispatch room.`);
        // Emit list of active online users to admin instantly
        socket.emit("online_users_list", Array.from(this.onlineEmails));
      });

      // 4. Clean up on disconnect
      socket.on("disconnect", () => {
        const info = this.connectedSockets.get(socket.id);
        if (info) {
          this.connectedSockets.delete(socket.id);
          
          // Check if any other sockets are still registered to this email before deleting online footprint
          const stillOnline = Array.from(this.connectedSockets.values()).some(v => v.email === info.email);
          if (!stillOnline) {
            this.onlineEmails.delete(info.email);
            logger.info(`[CHAT SOCKET] Socket user logged off completely: '${info.email}'`);
          }
        }
        
        this.broadcastPresence();
      });
    });
  }

  private broadcastPresence() {
    if (!this.io) return;
    const onlineList = Array.from(this.onlineEmails);
    const isAdminConnected = Array.from(this.connectedSockets.values()).some(v => v.isAdmin);
    
    // Broadcast status checks to everyone
    this.io.emit("presence_update", {
      onlineUsers: onlineList,
      adminOnline: isAdminConnected
    });
  }

  public getChatMessages(email: string): ChatMessage[] {
    try {
      const normalized = email.trim().toLowerCase();
      const raw = fs.readFileSync(CHAT_FILE, "utf8");
      const dbChat = JSON.parse(raw) as ChatMessage[];
      return dbChat.filter(m => m.senderEmail.toLowerCase() === normalized || m.senderId.toLowerCase() === normalized);
    } catch {
      return [];
    }
  }

  public getConversations(): any[] {
    try {
      const raw = fs.readFileSync(CHAT_FILE, "utf8");
      const dbChat = JSON.parse(raw) as ChatMessage[];
      
      const emails = Array.from(new Set(dbChat.filter(m => !m.isAdmin).map(m => m.senderEmail.toLowerCase())));
      return emails.map(email => {
        const thread = dbChat.filter(m => m.senderEmail.toLowerCase() === email);
        return {
          email,
          lastText: thread[thread.length - 1]?.text || "",
          lastTime: thread[thread.length - 1]?.createdAt || "",
          messages: thread,
          isOnline: this.onlineEmails.has(email)
        };
      }).sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
    } catch {
      return [];
    }
  }

  public saveMessage(text: string, email: string, isAdmin: boolean): ChatMessage {
    const normalizedEmail = email.trim().toLowerCase();
    const raw = fs.readFileSync(CHAT_FILE, "utf8");
    const dbChat = JSON.parse(raw) as ChatMessage[];

    const newMessage: ChatMessage = {
      id: "msg-" + Math.floor(100000 + Math.random() * 900000),
      senderId: isAdmin ? "admin" : normalizedEmail,
      senderEmail: normalizedEmail,
      isAdmin,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    dbChat.push(newMessage);
    fs.writeFileSync(CHAT_FILE, JSON.stringify(dbChat, null, 2), "utf8");
    return newMessage;
  }

  private queueAutomatedReply(email: string) {
    // Return automated system prompt after short timeout in case admin doesn't override
    setTimeout(() => {
      // First, check if user is still online and no admin has replied to them in the last 15s
      try {
        const raw = fs.readFileSync(CHAT_FILE, "utf8");
        const dbChat = JSON.parse(raw) as ChatMessage[];
        const thread = dbChat.filter(m => m.senderEmail.toLowerCase() === email);
        const lastMsg = thread[thread.length - 1];
        
        if (lastMsg && !lastMsg.isAdmin) {
          const answers = [
            "Our digital desk is on immediate standby. Confirming your checkout credentials?",
            "Aura premium tokens deploy securely with 100% cryptographic uptime guarantees.",
            "If transaction balances are congested, please submit of formal payment ledger ticket.",
            "All deliveries arrive directly within 2 seconds. Tap your profile tab to track historical keys.",
            "Security advisory: Do NOT disclose or paste raw coupon values or sensitive API keys."
          ];
          const botMsg = this.saveMessage(answers[Math.floor(Math.random() * answers.length)], email, true);
          
          if (this.io) {
            this.io.to(email).emit("new_message", botMsg);
            this.io.to("admins").emit("conversation_updated", {
              email,
              lastText: botMsg.text,
              lastTime: botMsg.createdAt,
              message: botMsg
            });
          }
        }
      } catch (e) {
        logger.error(`[CHAT BOT ERROR] Simulated bot failure: ${e}`);
      }
    }, 1200);
  }
}

export const chatService = new ChatService();
