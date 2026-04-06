"use client";

import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

type PromptInputProps = {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
};

export function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 5 + 24;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  return (
    <div
      className="flex items-end gap-3 rounded-2xl border px-4 py-3 transition-colors"
      style={{
        background: "var(--bg-input)",
        borderColor: "var(--border-color)",
      }}
    >
      <label htmlFor="chat-prompt" className="sr-only">
        Your message
      </label>
      <textarea
        ref={textareaRef}
        id="chat-prompt"
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message AI Chat…"
        disabled={isLoading}
        className="flex-1 resize-none bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          minHeight: "24px",
          color: "var(--text-primary)",
        }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={isLoading || !value.trim()}
        aria-label="Send message"
        className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: "var(--user-bubble-bg)" }}
      >
        {isLoading ? (
          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 19V5M6 11l6-6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
