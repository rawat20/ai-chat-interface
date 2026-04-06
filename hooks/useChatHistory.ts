"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatMessage, Session, SessionIndexEntry } from "@/types/chat";

const SESSION_PREFIX = "chat_session_";
const INDEX_KEY = "chat_session_index";
const STORAGE_LIMIT = 4.8 * 1024 * 1024; // 4.8 MB in bytes

export const STORAGE_FULL_ERROR = "STORAGE_FULL";

function getStorageSize(): number {
  let total = 0;
  for (const key in localStorage) {
    if (!Object.prototype.hasOwnProperty.call(localStorage, key)) continue;
    total += (localStorage.getItem(key)?.length ?? 0) * 2; // UTF-16: 2 bytes per char
  }
  return total;
}

function readIndex(): SessionIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SessionIndexEntry =>
        e !== null &&
        typeof e === "object" &&
        typeof (e as SessionIndexEntry).id === "string" &&
        typeof (e as SessionIndexEntry).createdAt === "number"
    );
  } catch {
    return [];
  }
}

function writeIndex(entries: SessionIndexEntry[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

function readSession(id: string): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      typeof (parsed as Session).id !== "string" ||
      !Array.isArray((parsed as Session).messages)
    )
      return null;
    return parsed as Session;
  } catch {
    return null;
  }
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<SessionIndexEntry[]>([]);

  const refreshSessions = useCallback(() => {
    if (typeof window === "undefined") return;
    const index = readIndex();
    setSessions([...index].sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const createSession = useCallback((): string => {
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const session: Session = { id, messages: [], createdAt };

    if (typeof window !== "undefined") {
      const size = getStorageSize();
      if (size >= STORAGE_LIMIT) throw new Error(STORAGE_FULL_ERROR);

      localStorage.setItem(SESSION_PREFIX + id, JSON.stringify(session));
      const index = readIndex();
      writeIndex([...index, { id, createdAt }]);
    }

    setSessions((prev) => [{ id, createdAt }, ...prev]);
    return id;
  }, []);

  const addMessageToSession = useCallback(
    (sessionId: string, message: ChatMessage) => {
      if (typeof window === "undefined") return;

      const size = getStorageSize();
      if (size >= STORAGE_LIMIT) throw new Error(STORAGE_FULL_ERROR);

      // Strip runtime-only flag before persisting
      const { isError: _e, ...persistableMessage } = message;

      const existing = readSession(sessionId);
      const updated: Session = existing
        ? { ...existing, messages: [...existing.messages, persistableMessage] }
        : { id: sessionId, messages: [persistableMessage], createdAt: Date.now() };

      localStorage.setItem(SESSION_PREFIX + sessionId, JSON.stringify(updated));
    },
    []
  );

  const getSession = useCallback((sessionId: string): Session | null => {
    if (typeof window === "undefined") return null;
    return readSession(sessionId);
  }, []);

  const deleteSession = useCallback(
    (sessionId: string) => {
      if (typeof window === "undefined") return;
      localStorage.removeItem(SESSION_PREFIX + sessionId);
      const index = readIndex().filter((e) => e.id !== sessionId);
      writeIndex(index);
      setSessions([...index].sort((a, b) => b.createdAt - a.createdAt));
    },
    []
  );

  const clearHistory = useCallback(() => {
    if (typeof window === "undefined") return;
    const index = readIndex();
    for (const entry of index) {
      localStorage.removeItem(SESSION_PREFIX + entry.id);
    }
    localStorage.removeItem(INDEX_KEY);
    setSessions([]);
  }, []);

  return {
    sessions,
    createSession,
    addMessageToSession,
    getSession,
    deleteSession,
    clearHistory,
  };
}
