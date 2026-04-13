"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Send,
  MessageCircle,
  Reply,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";

interface User {
  id: string;
  name: string | null;
  display_name: string | null;
  image: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  user_id: string;
  parent_id: string | null;
  text: string;
  created_at: string;
  user?: User;
  replies?: Message[];
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set()
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  const loadMessages = async () => {
    const res = await fetch("/api/chat");
    if (res.ok) setMessages(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
    // Poll every 15 seconds
    const interval = setInterval(loadMessages, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text.trim(),
        parent_id: replyTo?.id || null,
      }),
    });
    if (res.ok) {
      setText("");
      setReplyTo(null);
      await loadMessages();
      if (replyTo) {
        setExpandedThreads((prev) => new Set([...prev, replyTo.id]));
      }
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить сообщение?")) return;
    await fetch("/api/chat", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadMessages();
  };

  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  const toggleThread = (id: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <MessageCircle size={24} className="text-accent" />
        Чат
      </h1>

      {/* Input */}
      <div className="bg-card border border-border rounded-xl p-3 mb-6">
        {replyTo && (
          <div className="flex items-center justify-between bg-surface rounded-lg px-3 py-2 mb-2 text-xs">
            <span className="text-muted">
              Ответ для{" "}
              <span className="text-foreground font-semibold">
                {replyTo.user?.display_name || replyTo.user?.name || "Игрок"}
              </span>
              : {replyTo.text.slice(0, 50)}
              {replyTo.text.length > 50 ? "..." : ""}
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-muted hover:text-foreground ml-2"
            >
              x
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Написать сообщение..."
            rows={1}
            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-accent min-h-[44px]"
            maxLength={1000}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="px-4 bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold disabled:opacity-50 transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <p className="text-center text-muted py-10">
          Пока нет сообщений. Начните обсуждение!
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              isAdmin={isAdmin}
              currentUserId={session?.user?.id}
              expanded={expandedThreads.has(msg.id)}
              onReply={handleReply}
              onDelete={handleDelete}
              onToggle={() => toggleThread(msg.id)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageCard({
  msg,
  isAdmin,
  currentUserId,
  expanded,
  onReply,
  onDelete,
  onToggle,
  formatDate,
}: {
  msg: Message;
  isAdmin: boolean;
  currentUserId?: string;
  expanded: boolean;
  onReply: (msg: Message) => void;
  onDelete: (id: string) => void;
  onToggle: () => void;
  formatDate: (d: string) => string;
}) {
  const avatar = msg.user?.avatar_url || msg.user?.image;
  const name = msg.user?.display_name || msg.user?.name || "Игрок";
  const replies = msg.replies || [];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Main message */}
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <Link href={`/user/${msg.user_id}`} className="shrink-0">
            <div className="w-8 h-8 rounded-full bg-surface overflow-hidden border border-border">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted text-xs font-bold">
                  {name[0]}
                </div>
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Link
                href={`/user/${msg.user_id}`}
                className="text-sm font-semibold hover:text-accent transition-colors"
              >
                {name}
              </Link>
              <span className="text-[10px] text-muted">
                {formatDate(msg.created_at)}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap break-words">
              {msg.text}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-2 ml-10">
          <button
            onClick={() => onReply(msg)}
            className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors py-1"
          >
            <Reply size={12} />
            Ответить
          </button>
          {replies.length > 0 && (
            <button
              onClick={onToggle}
              className="flex items-center gap-1 text-[11px] text-accent font-semibold py-1"
            >
              {expanded ? (
                <ChevronUp size={12} />
              ) : (
                <ChevronDown size={12} />
              )}
              {replies.length}{" "}
              {replies.length === 1
                ? "ответ"
                : replies.length < 5
                ? "ответа"
                : "ответов"}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onDelete(msg.id)}
              className="flex items-center gap-1 text-[11px] text-muted hover:text-danger transition-colors py-1 ml-auto"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {expanded && replies.length > 0 && (
        <div className="border-t border-border bg-surface/50">
          {replies.map((reply) => {
            const rAvatar = reply.user?.avatar_url || reply.user?.image;
            const rName =
              reply.user?.display_name || reply.user?.name || "Игрок";
            return (
              <div
                key={reply.id}
                className="px-3 py-2.5 border-b border-border last:border-b-0"
              >
                <div className="flex items-start gap-2 ml-6">
                  <Link href={`/user/${reply.user_id}`} className="shrink-0">
                    <div className="w-6 h-6 rounded-full bg-surface overflow-hidden border border-border">
                      {rAvatar ? (
                        <img
                          src={rAvatar}
                          alt={rName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted text-[9px] font-bold">
                          {rName[0]}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link
                        href={`/user/${reply.user_id}`}
                        className="text-xs font-semibold hover:text-accent transition-colors"
                      >
                        {rName}
                      </Link>
                      <span className="text-[10px] text-muted">
                        {formatDate(reply.created_at)}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => onDelete(reply.id)}
                          className="text-muted hover:text-danger ml-auto"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs whitespace-pre-wrap break-words">
                      {reply.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
