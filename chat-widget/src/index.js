import './styles.css';
import { createRoot } from 'react-dom/client';
import { StrictMode, createElement } from 'react';
import App from './App';

const isDev = import.meta.env.DEV;

const DEFAULT_API_URL = 'http://127.0.0.1:4001/api/bot/ask';

/**
 * @returns {{ apiUrl: string, apiKey?: string, widgetSecret?: string, theme: string, sessionId?: string }}
 */
function readConfig() {
  if (typeof window === 'undefined') {
    return { apiUrl: DEFAULT_API_URL, theme: 'light' };
  }
  const c = window.CHATBOT_CONFIG || {};
  return {
    apiUrl: c.apiUrl || DEFAULT_API_URL,
    apiKey: c.apiKey,
    widgetSecret: typeof c.widgetSecret === 'string' ? c.widgetSecret : undefined,
    theme: c.theme === 'dark' ? 'dark' : 'light',
    sessionId: typeof c.sessionId === 'string' ? c.sessionId : undefined,
  };
}

/**
 * @param {HTMLElement} container
 */
function mountApp(container) {
  const config = readConfig();
  const root = createRoot(container);
  root.render(
    createElement(
      StrictMode,
      null,
      createElement(App, { config })
    )
  );
}

if (typeof window !== 'undefined') {
  /**
   * @param {HTMLElement | null} container
   */
  window.renderChatbot = function renderChatbot(container) {
    const el = container;
    if (!el) {
      return;
    }
    el.classList.add('ai-chatbot');
    if (!el.id) el.id = 'ai-chatbot-root';
    mountApp(el);
  };
}

if (isDev && typeof document !== 'undefined') {
  requestAnimationFrame(() => {
    const el = document.getElementById('ai-chatbot-root');
    if (el && el.dataset.aiChatbotAutoload !== '0' && window.renderChatbot) {
      window.renderChatbot(el);
    }
  });
}
