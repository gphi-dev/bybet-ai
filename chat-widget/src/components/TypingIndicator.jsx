/**
 * @param {{ dark?: boolean }} props
 */
export default function TypingIndicator({ dark }) {
  const base =
    'ai-inline-block ai-h-1.5 ai-w-1.5 ai-rounded-full ai-animate-pulse' +
    (dark ? ' ai-bg-slate-300' : ' ai-bg-gray-500');

  return (
    <div
      className="ai-flex ai-items-center ai-gap-1.5 ai-pl-0.5"
      role="status"
      aria-live="polite"
    >
      <span className={base} style={{ animationDelay: '0ms' }} />
      <span className={base} style={{ animationDelay: '200ms' }} />
      <span className={base} style={{ animationDelay: '400ms' }} />
      <span className="ai-sr-only">AI is typing</span>
    </div>
  );
}
