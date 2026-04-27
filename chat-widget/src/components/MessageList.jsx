import { useEffect, useRef } from 'react';
import TypingIndicator from './TypingIndicator';

/**
 * Renders plain-text bot replies with preserved line breaks and spaced paragraphs.
 * @param {{ text: string }} props
 */
function BotMessageBody({ text }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const bodyClass =
    'ai-whitespace-pre-wrap ai-break-words ai-leading-[1.55] ai-tabular-nums';

  if (blocks.length <= 1) {
    const content = blocks[0] ?? text.trim();
    return <div className={bodyClass}>{content}</div>;
  }

  return (
    <div className="ai-flex ai-flex-col ai-gap-2.5">
      {blocks.map((block, i) => (
        <p key={i} className={`ai-m-0 ${bodyClass}`}>
          {block}
        </p>
      ))}
    </div>
  );
}

/**
 * @param {{ messages: { id: string, role: 'user' | 'bot', text: string }[], loading: boolean }} props
 */
export default function MessageList({ messages, loading }) {
  const listRef = useRef(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [messages, loading]);

  return (
    <div
      ref={listRef}
      className="ai-min-h-0 ai-flex-1 ai-overflow-y-auto ai-overscroll-contain ai-px-4 ai-py-3 ai-bg-gradient-to-b ai-from-[#021d17] ai-to-[#01251d]"
    >
      {messages.length === 0 && !loading && (
        <p className="ai-px-1 ai-pt-2 ai-text-center ai-text-sm ai-text-emerald-300">
          How can I help you today?
        </p>
      )}

      <ul
        className="ai-flex ai-min-h-0 ai-w-full ai-list-none ai-flex-col ai-space-y-2 ai-m-0 ai-p-0"
        role="log"
      >
        {messages.map((m) => (
          <li
            key={m.id}
            className={
              (m.role === 'user' ? 'ai-flex ai-justify-end' : 'ai-flex ai-justify-start') +
              ' ai-min-w-0'
            }
          >
            <div
              className={
                m.role === 'user'
                  ? 'ai-max-w-full ai-min-w-0 ai-rounded-2xl ai-rounded-tr-md ai-px-3 ai-py-2 ai-text-sm ai-text-white ai-shadow-md ai-whitespace-pre-wrap ai-break-words ai-leading-normal ai-bg-[#036242] sm:ai-max-w-[85%]'
                  : 'ai-max-w-full ai-min-w-0 ai-rounded-2xl ai-rounded-tl-md ai-px-3.5 ai-py-2.5 ai-text-[0.8125rem] sm:ai-text-sm ai-shadow-sm ai-bg-[#012f26] ai-text-emerald-100 ai-border ai-border-[#014d3b] ai-whitespace-pre-wrap ai-break-words sm:ai-max-w-[85%]'
              }
            >
              {m.role === 'user' ? m.text : <BotMessageBody text={m.text} />}
            </div>
          </li>
        ))}

        {loading && (
          <li className="ai-flex ai-min-w-0 ai-justify-start">
            <div className="ai-flex ai-max-w-full ai-min-w-0 ai-items-center ai-gap-2 ai-rounded-2xl ai-rounded-tl-md ai-px-3 ai-py-2.5 ai-shadow-sm ai-bg-[#012f26] ai-border ai-border-[#014d3b] sm:ai-max-w-[85%]">
              <span className="ai-text-xs ai-text-emerald-300">
                AI typing
              </span>
              <TypingIndicator dark={true} />
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}