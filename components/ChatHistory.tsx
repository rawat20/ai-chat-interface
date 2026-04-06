"use client";

import { useEffect, useState } from "react";
import type { SessionIndexEntry } from "@/types/chat";

function formatRelativeTime(timestamp: number, now: number): string {
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type SidebarProps = {
  sessions: SessionIndexEntry[];
  sessionTitles: Record<string, string>;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
  onClearHistory: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
};

export function ChatHistory({
  sessions,
  sessionTitles,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onClearHistory,
  isDark,
  onToggleTheme,
}: SidebarProps) {
  const [now, setNow] = useState(() => Date.now());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <aside
      className="flex h-full w-[260px] shrink-0 flex-col border-r"
      style={{
        background: "var(--bg-sidebar)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "var(--user-bubble-bg)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          AI Chat
        </span>
      </div>

      {/* New Chat button */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition"
          style={{
            borderColor: "var(--border-color)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--hover-item)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Chat
        </button>
      </div>

      {/* History label */}
      {sessions.length > 0 && (
        <p
          className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-placeholder)" }}
        >
          History
        </p>
      )}

      {/* Session list */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-2 pb-2">
        {sessions.length === 0 ? (
          <p className="px-2 py-4 text-xs" style={{ color: "var(--text-placeholder)" }}>
            No conversations yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isHovered = hoveredId === session.id;
              const title = sessionTitles[session.id] ?? "New Chat";

              return (
                <li key={session.id}>
                  <div
                    className="group flex w-full items-center rounded-lg px-2 py-2 transition"
                    style={{
                      background: isActive
                        ? "var(--active-item)"
                        : isHovered
                          ? "var(--hover-item)"
                          : "transparent",
                    }}
                    onMouseEnter={() => setHoveredId(session.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectSession(session.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p
                        className="truncate text-sm"
                        style={{
                          color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                          fontWeight: isActive ? "500" : "400",
                        }}
                      >
                        {title}
                      </p>
                      <p
                        className="mt-0.5 text-[11px]"
                        style={{ color: "var(--text-placeholder)" }}
                      >
                        {formatRelativeTime(session.createdAt, now)}
                      </p>
                    </button>

                    {/* Delete button — visible on hover */}
                    {(isHovered || isActive) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        aria-label="Delete chat"
                        className="ml-1 shrink-0 rounded p-1 transition"
                        style={{ color: "var(--text-placeholder)" }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color = "#ef4444")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color =
                            "var(--text-placeholder)")
                        }
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="border-t p-3 flex flex-col gap-1" style={{ borderColor: "var(--border-color)" }}>
        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--hover-item)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          }}
        >
          {isDark ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.75" />
                <path
                  d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
              Light mode
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Dark mode
            </>
          )}
        </button>

        {/* Clear history */}
        {sessions.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--hover-item)";
              (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Clear All History
          </button>
        )}
      </div>
    </aside>
  );
}
