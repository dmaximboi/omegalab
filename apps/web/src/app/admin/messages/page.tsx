"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Mail, MailOpen, Trash2,
  Loader2, MessageSquare, Clock, User
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Message {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/admin/messages");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/admin/messages/${id}/read`, { method: "POST" });
      setMessages(msgs => msgs.map(m => m.id === id ? { ...m, isRead: true } : m));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      setMessages(msgs => msgs.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin" 
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              <p className="text-sm text-gray-500">
                {messages.filter(m => !m.isRead).length} unread messages
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <MessageSquare className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-500">Messages from the contact form will appear here</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Message List */}
            <div className="lg:col-span-1 space-y-2">
              {messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (!msg.isRead) markAsRead(msg.id);
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition ${
                    selectedMessage?.id === msg.id 
                      ? "bg-blue-50 border-blue-200" 
                      : "bg-white hover:bg-gray-50"
                  } ${!msg.isRead ? "border-l-4 border-l-blue-500" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {msg.isRead ? (
                        <MailOpen size={16} className="text-gray-400" />
                      ) : (
                        <Mail size={16} className="text-blue-500" />
                      )}
                      <span className={`font-medium ${!msg.isRead ? "text-gray-900" : "text-gray-600"}`}>
                        {msg.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(msg.createdAt).split(",")[0]}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${!msg.isRead ? "font-medium" : "text-gray-500"}`}>
                    {msg.subject}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {msg.message}
                  </p>
                </button>
              ))}
            </div>

            {/* Message Detail */}
            <div className="lg:col-span-2">
              {selectedMessage ? (
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedMessage.subject}</h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {selectedMessage.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatDate(selectedMessage.createdAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMessage(selectedMessage.id)}
                      className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <span className="text-sm text-gray-500">Email:</span>
                      <a href={`mailto:${selectedMessage.email}`} className="ml-2 text-blue-600 hover:underline">
                        {selectedMessage.email}
                      </a>
                    </div>
                    {selectedMessage.phone && (
                      <div>
                        <span className="text-sm text-gray-500">Phone:</span>
                        <a href={`tel:${selectedMessage.phone}`} className="ml-2 text-blue-600 hover:underline">
                          {selectedMessage.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-6">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <a
                      href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      <Mail size={18} />
                      Reply via Email
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border p-12 text-center">
                  <MessageSquare className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500">Select a message to view</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
