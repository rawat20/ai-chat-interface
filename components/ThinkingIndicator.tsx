export function ThinkingIndicator() {
  return (
<div className="flex items-center gap-2 py-1" aria-label="AI is thinking" role="status">
  {/* <span className="text-sm text-[var(--text-secondary)]">
    AI is thinking
  </span> */}

  <div className="flex items-center gap-1.5">
    <span
      className="thinking-dot h-2 w-2 rounded-full"
      style={{ background: "var(--text-secondary)", animationDelay: "0ms" }}
    />
    <span
      className="thinking-dot h-2 w-2 rounded-full"
      style={{ background: "var(--text-secondary)", animationDelay: "150ms" }}
    />
    <span
      className="thinking-dot h-2 w-2 rounded-full"
      style={{ background: "var(--text-secondary)", animationDelay: "300ms" }}
    />
  </div>
</div>
  );
}
