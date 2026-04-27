import { useCallback, useEffect, useMemo, useState } from 'react';
import { sendChatMessage } from './api/chat';
import ChatButton from './components/ChatButton';
import ChatWindow from './components/ChatWindow';
import { getOrCreateSessionId } from './sessionId';

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * @param {{ config: { apiUrl: string, apiKey?: string, widgetSecret?: string, theme?: string, sessionId?: string } }} props
 */
export default function App({ config }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(
    /** @type {{ id: string, role: 'user' | 'bot', text: string }[]} */ ([])
  );
  const [loading, setLoading] = useState(false);

  const cfg = useMemo(
    () => ({
      ...config,
      theme: config.theme || 'light',
      sessionId: getOrCreateSessionId(config.sessionId) ?? undefined,
    }),
    [config]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const onSend = useCallback(
    async (text) => {
      const userMsg = { id: createId(), role: 'user', text };
      setMessages((m) => [...m, userMsg]);
      setLoading(true);
      const reply = await sendChatMessage(
        {
          apiUrl: cfg.apiUrl,
          apiKey: cfg.apiKey,
          widgetSecret: cfg.widgetSecret,
          sessionId: cfg.sessionId,
        },
        text
      );
      setLoading(false);
      setMessages((m) => [...m, { id: createId(), role: 'bot', text: reply }]);
    },
    [cfg.apiKey, cfg.apiUrl, cfg.sessionId, cfg.widgetSecret]
  );

  return (
    <div
      className={
        'ai-chatbot ai-isolate ai-m-0 ai-p-0 ai-text-base' +
        (cfg.theme === 'dark' ? ' ai-text-slate-100' : ' ai-text-slate-900')
      }
    >
      <ChatButton open={open} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div
          className="ai-fixed ai-inset-0 ai-z-[2147483640] max-sm:ai-bg-slate-900/40 sm:ai-bg-transparent"
          onClick={() => setOpen(false)}
          role="presentation"
        />
      )}
      <ChatWindow
        open={open}
        messages={messages}
        loading={loading}
        onSend={onSend}
      />
    </div>
  );
}
