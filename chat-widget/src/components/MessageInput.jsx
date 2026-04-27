import { useCallback, useState } from 'react';

/**
 * @param {{ onSend: (t: string) => void, disabled: boolean, theme: string, className?: string }} props
 */
export default function MessageInput({ onSend, disabled, theme, className = '' }) {
  const [value, setValue] = useState('');
  const dark = theme === 'dark';

  const submit = useCallback(() => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue('');
  }, [value, disabled, onSend]);

  const rootClass =
    'ai-flex ai-w-full ai-min-h-0 ai-shrink-0 ai-items-stretch ai-gap-2 ai-px-2 ai-py-2' +
    (className
      ? ` ${className}`
      : dark
        ? ' ai-border-t ai-border-[#036242] ai-bg-[#011f19]'
        : ' ai-border-t ai-border-emerald-200 ai-bg-emerald-50');

  return (
    <div className={rootClass}>
      <input
        type="text"
        className={
          'ai-min-h-[44px] ai-flex-1 ai-rounded-lg ai-px-3 ai-py-2 ai-text-sm ai-transition ai-outline-none ai-shadow-sm focus:ai-ring-2 focus:ai-ring-[#036242]' +
          (dark
            ? ' ai-border ai-border-[#014d3b] ai-bg-[#012f26] !ai-text-white placeholder:ai-text-emerald-400'
            : ' ai-border ai-border-emerald-200 ai-bg-white ai-text-slate-900 placeholder:ai-text-emerald-500')
        }
        placeholder="Type a message…"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        aria-label="Message"
      />

      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        className={
          'ai-shrink-0 ai-rounded-lg ai-px-3 ai-py-2 ai-text-sm ai-font-medium !ai-text-white ai-transition ai-transform disabled:ai-cursor-not-allowed disabled:ai-opacity-50' +
          (dark
            ? ' ai-bg-[#036242] hover:ai-bg-[#048a63] active:ai-scale-95'
            : ' ai-bg-emerald-600 hover:ai-bg-emerald-700')
        }
      >
        Send
      </button>
    </div>
  );
}