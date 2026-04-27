(function () {
  'use strict';

  var current = document.currentScript;
  if (!current || !current.src) {
    return;
  }

  var base = current.src.replace(/\/[^/]+$/, '');

  var root = document.getElementById('ai-chatbot-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'ai-chatbot-root';
    document.body.appendChild(root);
  }

  var hrefCss = base + '/chat-widget.css';
  if (!document.querySelector('link[data-ai-chatbot-css]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = hrefCss;
    link.setAttribute('data-ai-chatbot-css', '1');
    document.head.appendChild(link);
  }

  var hadRender = typeof window.renderChatbot === 'function';
  if (hadRender) {
    window.renderChatbot(root);
    return;
  }

  var s = document.createElement('script');
  s.src = base + '/chat-widget.js';
  s.async = true;
  s.onload = function () {
    if (typeof window.renderChatbot === 'function') {
      window.renderChatbot(root);
    }
  };
  document.body.appendChild(s);
})();
