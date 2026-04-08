"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChatHistory } from "@/components/ChatHistory";
import { PromptInput } from "@/components/PromptInput";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { useChatHistory, STORAGE_FULL_ERROR } from "@/hooks/useChatHistory";
import type { ChatMessage } from "@/types/chat";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSessionTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user" && !m.isError);
  if (!first) return "New Chat";
  return first.content.length > 40
    ? first.content.slice(0, 40).trimEnd() + "…"
    : first.content;
}

// Split response into sentence/paragraph-sized chunks so each partial
// reveal is a complete, valid markdown unit (no broken **bold or `code).
function getSentenceChunks(content: string): string[] {
  // Split after sentence-ending punctuation + whitespace, OR at newlines.
  // The regex keeps the delimiter attached to the preceding chunk.
  const raw = content.match(/[^.!?\n]*(?:[.!?]+\s*|\n+|(?:(?=[^]))$)/g);
  return (raw ?? [content]).filter((c) => c.length > 0);
}

// ── Assistant message bubble ─────────────────────────────────
// isNew=true  → sentence-by-sentence reveal via ReactMarkdown (always formatted)
// isNew=false → full ReactMarkdown immediately (history messages)
function AssistantBubble({
  msg,
  isNew = false,
  onAnimationDone,
}: {
  msg: ChatMessage;
  isNew?: boolean;
  onAnimationDone?: () => void;
}) {
  const chunks = useMemo(
    () => (msg.content ? getSentenceChunks(msg.content) : []),
    [msg.content]
  );
  const [chunkIndex, setChunkIndex] = useState(isNew ? 0 : chunks.length);
  const onDoneRef = useRef(onAnimationDone);
  onDoneRef.current = onAnimationDone;

  useEffect(() => {
    if (!isNew || !msg.content) return;
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setChunkIndex(index);
      if (index >= chunks.length) {
        clearInterval(interval);
        onDoneRef.current?.();
      }
    }, 85); // ms per sentence — increase for slower reveal, decrease for faster
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  if (msg.isError) {
    return (
      <div
        className="w-full max-w-[90%] rounded-2xl rounded-tl-sm border-l-4 border-red-500 px-5 py-4 text-sm"
        style={{
          background: "var(--error-bg, #2d1515)",
          color: "var(--error-text, #f87171)",
        }}
        role="alert"
      >
        <span className="mr-1.5">⚠️</span>
        {msg.content}
      </div>
    );
  }

  const isDone = chunkIndex >= chunks.length;
  const displayContent = isDone
    ? msg.content
    : chunks.slice(0, chunkIndex).join("");

  return (
    <div
      className="w-full max-w-[90%] rounded-2xl rounded-tl-sm px-5 py-4 text-sm"
      style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}
    >
      {/* Dots show only until the first sentence arrives */}
      {isNew && !isDone && displayContent.length === 0 && <ThinkingIndicator />}

      {/* Always ReactMarkdown — partial content ends at clean sentence boundaries */}
      {displayContent.length > 0 && (
        <div className={`markdown-body${!isDone ? " streaming-cursor" : ""}`}>
          <ReactMarkdown>{displayContent}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [animatingMsgId, setAnimatingMsgId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [sessionTitles, setSessionTitles] = useState<Record<string, string>>({});

  const {
    sessions,
    createSession,
    addMessageToSession,
    getSession,
    deleteSession,
    clearHistory,
  } = useChatHistory();

  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Theme init ───────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const dark = saved !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
  }, []);

  // ── Apply error bg/text CSS vars for each theme ──────────────
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.style.setProperty("--error-bg", "#2d1515");
      root.style.setProperty("--error-text", "#f87171");
    } else {
      root.style.setProperty("--error-bg", "#fef2f2");
      root.style.setProperty("--error-text", "#dc2626");
    }
  }, [isDark]);

  // ── Auto-scroll on every message/content change ──────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // ── Sync session titles ──────────────────────────────────────
  useEffect(() => {
    setSessionTitles((prev) => {
      const next = { ...prev };
      for (const s of sessions) {
        if (!next[s.id]) {
          const loaded = getSession(s.id);
          if (loaded) next[s.id] = getSessionTitle(loaded.messages);
        }
      }
      return next;
    });
  }, [sessions, getSession]);

  // ── Theme toggle ─────────────────────────────────────────────
  const handleToggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      document.documentElement.classList.toggle("light", !next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (prompt: string) => {
      let sessionId = currentSessionId;

      if (!sessionId) {
        try {
          sessionId = createSession();
          setCurrentSessionId(sessionId);
        } catch {
          setStorageError(true);
          return;
        }
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      };

      const updatedMessages = [...currentMessages, userMsg];
      setCurrentMessages(updatedMessages);
      setIsLoading(true);

      if (updatedMessages.filter((m) => m.role === "user" && !m.isError).length === 1) {
        setSessionTitles((prev) => ({
          ...prev,
          [sessionId!]: getSessionTitle(updatedMessages),
        }));
      }

      const apiMessages = updatedMessages
        .filter((m) => !m.isError)
        .map(({ id, role, content, timestamp }) => ({ id, role, content, timestamp }));

      // Fetch full response
      let fullContent = "";
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        });

        if (!res.ok) {
          let userMessage = `Request failed (${res.status})`;
          try {
            const data = await res.json();
            if (data && typeof data.userMessage === "string") userMessage = data.userMessage;
          } catch { /* ignore */ }
          throw new Error(userMessage);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += decoder.decode(value, { stream: true });
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
        setCurrentMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: message,
            timestamp: Date.now(),
            isError: true,
          },
        ]);
        setIsLoading(false);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullContent,
        timestamp: Date.now(),
      };

      // Add message and start animation — isLoading stays true until animation ends
      setCurrentMessages((prev) => [...prev, assistantMsg]);
      setAnimatingMsgId(assistantMsg.id);

      if (fullContent.trim()) {
        try {
          addMessageToSession(sessionId!, userMsg);
          addMessageToSession(sessionId!, assistantMsg);
        } catch (e) {
          if (e instanceof Error && e.message === STORAGE_FULL_ERROR) {
            setStorageError(true);
          }
        }
      }
    },
    [currentSessionId, currentMessages, createSession, addMessageToSession]
  );

  // ── Animation done — hide spinner ───────────────────────────
  const handleAnimationDone = useCallback(() => {
    setAnimatingMsgId(null);
    setIsLoading(false);
  }, []);

  // ── New Chat ─────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    setCurrentSessionId(null);
    setCurrentMessages([]);
    setStorageError(false);
  }, []);

  // ── Load session ─────────────────────────────────────────────
  const handleSelectSession = useCallback(
    (id: string) => {
      const session = getSession(id);
      if (!session) return;
      setCurrentSessionId(id);
      setCurrentMessages(session.messages);
      setStorageError(false);
    },
    [getSession]
  );

  // ── Delete session ───────────────────────────────────────────
  const handleDeleteSession = useCallback(
    (id: string) => {
      deleteSession(id);
      if (id === currentSessionId) {
        setCurrentSessionId(null);
        setCurrentMessages([]);
      }
      setStorageError(false);
      setSessionTitles((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [deleteSession, currentSessionId]
  );

  // ── Clear all ────────────────────────────────────────────────
  const handleClearHistory = useCallback(() => {
    clearHistory();
    setCurrentSessionId(null);
    setCurrentMessages([]);
    setStorageError(false);
    setSessionTitles({});
  }, [clearHistory]);

  const chatTitle = currentSessionId
    ? (sessionTitles[currentSessionId] ?? "New Chat")
    : "New Chat";

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <ChatHistory
        sessions={sessions}
        sessionTitles={sessionTitles}
        activeSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
        onClearHistory={handleClearHistory}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main chat area */}
      <div
        className="flex flex-1 flex-col overflow-hidden"
        style={{ background: "var(--bg-primary)" }}
      >
        {/* Header */}
        <header
          className="flex h-12 shrink-0 items-center border-b px-5"
          style={{
            background: "var(--bg-primary)",
            borderColor: "var(--border-color)",
          }}
        >
          <p className="truncate text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            {chatTitle}
          </p>
        </header>

        {/* Storage full banner */}
        {storageError && (
          <div
            className="shrink-0 border-b px-5 py-3 text-sm"
            style={{
              background: "#450a0a",
              borderColor: "#7f1d1d",
              color: "#fca5a5",
            }}
            role="alert"
          >
            Storage is full. Delete a chat from the sidebar to continue.
          </div>
        )}

        {/* Messages */}
        <div className="chat-scroll flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {currentMessages.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "rgba(47,111,235,0.15)", color: "var(--user-bubble-bg)" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                How can I help you today?
              </h2>
              <p className="mt-1 max-w-xs text-sm" style={{ color: "var(--text-placeholder)" }}>
                Ask me anything. Powered by Qwen 2.5 via Hugging Face.
              </p>
            </div>
          )}

          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {currentMessages.map((msg) => (
              <div
                key={msg.id}
                className={`animate-fade-in flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                {msg.role === "user" ? (
                  <div
                    className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm"
                    style={{
                      background: "var(--user-bubble-bg)",
                      color: "var(--user-bubble-text)",
                    }}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  <AssistantBubble
                    msg={msg}
                    isNew={msg.id === animatingMsgId}
                    onAnimationDone={msg.id === animatingMsgId ? handleAnimationDone : undefined}
                  />
                )}

                <time
                  className="mt-1 px-1 text-[11px]"
                  style={{ color: "var(--text-placeholder)" }}
                >
                  {formatTime(msg.timestamp)}
                </time>
              </div>
            ))}

            {/* Fetch phase: bubble-shaped card with dots — visually identical to AssistantBubble */}
            {isLoading && !animatingMsgId && (
              <div className="animate-fade-in flex flex-col items-start">
                <div
                  className="w-full max-w-[90%] rounded-2xl rounded-tl-sm px-5 py-4 text-sm"
                  style={{ background: "var(--bg-card)" }}
                >
                  <ThinkingIndicator />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input bar */}
        <div
          className="shrink-0 border-t px-4 py-4 sm:px-6"
          style={{
            background: "var(--bg-input-bar)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="mx-auto max-w-2xl">
            <PromptInput onSubmit={handleSubmit} isLoading={isLoading} />
            <p
              className="mt-2 text-center text-[11px]"
              style={{ color: "var(--text-placeholder)" }}
            >
              Cmd+Enter or Ctrl+Enter to send
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
