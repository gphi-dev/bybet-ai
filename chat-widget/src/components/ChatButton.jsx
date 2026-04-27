import { useState } from 'react';

const SVG_ICON = (
  <svg
    className="ai-w-6 ai-h-6 ai-text-white"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path d="M20 2H4a2 2 0 0 0-2 2v2.5c0 .4.1.7.2 1v9.1l4-2.1H20a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM5.5 11H11a.5.5 0 0 0 0-1H5.5a.5.5 0 0 0 0 1Zm0-2.4H16a.5.5 0 0 0 0-1H5.5a.5.5 0 0 0 0 1Zm0-2.4H16a.5.5 0 0 0 0-1H5.5a.5.5 0 0 0 0 1Z" />
  </svg>
);

/**
 * @param {{ open: boolean, onClick: () => void }} props
 */
export default function ChatButton({ open, onClick }) {
  const [press, setPress] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={() => setPress(true)}
      onPointerUp={() => setPress(false)}
      onPointerLeave={() => setPress(false)}
      className="ai-fixed ai-bottom-5 ai-right-5 ai-z-[2147483646] ai-flex ai-h-14 ai-w-14 ai-items-center ai-justify-center ai-rounded-full ai-bg-indigo-600 ai-shadow-lg ai-transition-transform ai-transition-colors ai-duration-200 hover:ai-bg-indigo-700 focus:ai-outline focus:ai-outline-2 focus:ai-outline-offset-2 focus:ai-outline-indigo-500 sm:ai-bottom-5"
      style={{ transform: press ? 'scale(0.95)' : 'scale(1)' }}
      aria-label={open ? 'Close chat' : 'Open chat'}
    >
      {open ? (
        <svg
          className="ai-w-6 ai-h-6 ai-text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      ) : (
        SVG_ICON
      )}
    </button>
  );
}
