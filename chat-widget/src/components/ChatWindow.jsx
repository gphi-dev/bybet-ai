import MessageList from './MessageList';
import MessageInput from './MessageInput';

/**
 * @param {{ open: boolean, messages: any[], loading: boolean, onSend: (t: string) => void }} props
 */
export default function ChatWindow({ open, messages, loading, onSend }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chat"
      aria-hidden={!open}
      className={
        'ai-pointer-events-auto ai-fixed ai-bottom-20 ai-right-5 ai-z-[2147483645] ai-box-border' +
        ' ai-flex ai-h-[600px] ai-max-h-[calc(100dvh-120px)] ai-w-[380px] ai-flex-col ai-overflow-hidden' +
        ' ai-rounded-2xl ai-border ai-border-[#03583d] ai-bg-[#012f26] ai-shadow-2xl ai-transition-all ai-duration-200 ai-ease-out' +
        ' max-sm:ai-inset-x-3 max-sm:ai-bottom-20 max-sm:ai-h-[calc(100dvh-104px)] max-sm:ai-w-auto' +
        (open
          ? ' ai-translate-y-0 ai-scale-100 ai-opacity-100'
          : ' ai-pointer-events-none ai-invisible ai-translate-y-4 ai-scale-95 ai-opacity-0')
      }
      style={{
        boxShadow: '0 20px 45px rgba(3, 98, 66, 0.28)',
      }}
    >
      <div className="ai-flex ai-shrink-0 ai-items-center ai-justify-between ai-border-b ai-border-[#036242] ai-bg-[#012f26] ai-px-3 ai-py-2.5">
        <h2 className="ai-m-0 ai-text-base ai-font-semibold ai-text-emerald-100">AI Assistant</h2>
        <span className="ai-flex ai-items-center ai-gap-1 ai-text-xs ai-text-emerald-300">
          <span className="ai-h-2 ai-w-2 ai-rounded-full ai-bg-[#036242] ai-animate-pulse" />
          online
        </span>
      </div>

      <div className="ai-flex ai-min-h-0 ai-flex-1 ai-flex-col ai-overflow-hidden">
        <MessageList messages={messages} loading={loading} />
      </div>

      <MessageInput
        onSend={onSend}
        disabled={loading}
        theme="dark"
        className="ai-shrink-0 ai-border-t ai-border-[#036242] ai-bg-[#011f19]"
      />
    </div>
  );
}
