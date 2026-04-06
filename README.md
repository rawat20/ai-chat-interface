# AI Chat Interface

A full-featured AI chat app built with Next.js 14, powered by Google Gemini. Designed to feel like Claude/ChatGPT — sidebar navigation, multi-turn conversations, dark/light theme, and smooth sentence-by-sentence response animation.

## Features

- **Multi-turn conversations** — full context sent to Gemini on every message
- **Persistent chat history** — sessions stored in `localStorage` with a 4.8 MB guard
- **Sidebar navigation** — list past sessions, switch between them, delete individually or clear all
- **Sentence-by-sentence streaming** — response reveals progressively with a blinking cursor; full markdown renders at each step
- **Markdown rendering** — bold, italic, code blocks, lists, tables, blockquotes, headings
- **Dark / light theme** — toggle in sidebar, persisted across sessions
- **Error handling** — rate limits, auth errors, and network failures shown as inline error bubbles
- **API key stays server-side** — `GEMINI_API_KEY` is only read in the API route, never sent to the browser

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com/)
- [react-markdown](https://github.com/remarkjs/react-markdown)
- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) (server-only)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file and add your Gemini API key:

   ```bash
   cp .env.local.example .env.local
   ```

   Get a free key from [Google AI Studio](https://aistudio.google.com/apikey) and set:

   ```
   GEMINI_API_KEY=your_key_here
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  api/chat/route.ts   — Edge API route (Gemini call, streaming, error handling)
  page.tsx            — Main chat UI
  layout.tsx          — Root layout
  globals.css         — Theme variables, markdown styles, animations
components/
  ChatHistory.tsx     — Left sidebar (sessions, theme toggle)
  PromptInput.tsx     — Auto-expanding textarea with Cmd+Enter submit
  ThinkingIndicator.tsx — Bouncing dots loader
hooks/
  useChatHistory.ts   — localStorage session management
types/
  chat.ts             — ChatMessage, Session, SessionIndexEntry
```

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # run production server
npm run lint     # ESLint
```

## Security note

`GEMINI_API_KEY` is read exclusively in `app/api/chat/route.ts` on the server. It is not prefixed with `NEXT_PUBLIC_` and is never bundled into client-side code.
