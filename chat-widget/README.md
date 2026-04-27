# Add the chatbot to your website

Paste the snippet **once** on each page where you want the chat (or in a shared layout so it appears on every page).

## Where to put it in your code

1. **Placement:** Near the **end of `<body>`**, **after** your main content.  
   - In plain HTML: just before `</body>`.  
   - In React / Vue / Next.js / etc.: in your root layout or main template, render these two pieces at the bottom of the document body (same order as below).

2. **Order:** Always add **configuration first**, then the **loader script**. The page must define `window.CHATBOT_CONFIG` before `chatbot.js` runs.

## Step 1 — Configuration

Add this **above** the loader script. Only `apiUrl` is required; use the URL your provider gives you (the chat API endpoint).

```html
<script>
  window.CHATBOT_CONFIG = {
    apiUrl: 'https://api.example.com/api/bot/ask',
    theme: 'light',
  };
</script>
```

| Field | Required | Description |
|--------|----------|-------------|
| `apiUrl` | **Yes** | Full URL to the chat API (`POST` endpoint). |
| `theme` | No | `light` (default) or `dark`. |
| `apiKey` | No | If your provider gives you a key, set it here. |
| `sessionId` | No | Fixed session id; if omitted, one is created automatically. |

## Step 2 — Load the chatbot script

Add this **right after** the config block. Replace the `src` with the **real URL** your provider gives you for `chatbot.js` (it must be served over **https** in production, same as your site).

```html
<script src="https://cdn.example.com/chatbot/chatbot.js" async></script>
```

The loader will attach the chat widget to the page.

**What is `https://cdn.example.com/...`?**

- **It is the widget asset host** (your provider’s CDN / static hosting) where `chatbot.js` lives.
- **It is not your website’s URL.**

Your provider must also host **these two files in the same folder** as `chatbot.js` (you do not add them to your HTML manually):

- `chat-widget.js`
- `chat-widget.css`

## Full example (minimal page)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My site</title>
  </head>
  <body>
    <h1>My website content</h1>

    <!-- Chatbot: config first, then script -->
    <script>
      window.CHATBOT_CONFIG = {
        apiUrl: 'https://api.example.com/api/bot/ask',
        theme: 'light',
      };
    </script>
    <script src="https://cdn.example.com/chatbot/chatbot.js" async></script>
  </body>
</html>
```

## Your site must be allowlisted (CORS)

The chat **API** only accepts browser requests from origins your **provider** has approved. When you go live, give your provider your **exact** site address (including `https` and the domain, e.g. `https://www.yoursite.com`). If the chat does not connect after embedding, they usually need to add your origin to their allow list.

## Security and HTTPS

Use **https** on your site and use an **https** `apiUrl`. Mixed `http` / `https` is blocked by browsers in most cases.
