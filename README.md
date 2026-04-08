# AI Chat Interface

A production-quality AI chat app built with Next.js 14. Sends prompts to a server-side API route that streams responses from **Qwen 2.5 72B** via the Hugging Face Inference Router — your token never reaches the browser.

## Features

- **Multi-turn conversations** — full message history sent as context on every request
- **Sentence-by-sentence streaming** — response reveals progressively with live markdown rendering
- **Persistent chat history** — sessions stored in `localStorage` (4.8 MB guard, auto-cleanup prompts)
- **Sidebar navigation** — create, switch, rename (auto-titled), and delete sessions
- **Dark / light theme** — toggle in sidebar, preference persisted across sessions
- **Structured error handling** — rate limits, auth errors, and network failures shown as inline error bubbles, never persisted to history

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router, TypeScript) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) + CSS variables |
| Markdown | [react-markdown](https://github.com/remarkjs/react-markdown) |
| AI Model | [Qwen/Qwen2.5-72B-Instruct](https://huggingface.co/Qwen/Qwen2.5-72B-Instruct) |
| Inference | [Hugging Face Router](https://router.huggingface.co) (OpenAI-compatible SSE) |

## Project Structure

```
ai-chat-interface/
├── app/
│   ├── api/chat/
│   │   └── route.ts          # API route — HF streaming, error classification
│   ├── globals.css           # Theme variables (dark/light), markdown styles, animations
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main chat page — state, submit logic, message rendering
├── components/
│   ├── ChatHistory.tsx       # Left sidebar (sessions, theme toggle, clear history)
│   ├── PromptInput.tsx       # Auto-expanding textarea, Cmd+Enter submit
│   └── ThinkingIndicator.tsx # Animated bouncing dots loader
├── hooks/
│   └── useChatHistory.ts     # localStorage session CRUD with 4.8 MB storage guard
├── types/
│   └── chat.ts               # ChatMessage, Session, SessionIndexEntry interfaces
├── .env.local.example        # Environment variable reference
└── tailwind.config.ts
```

## Setup

**1. Clone and install**

```bash
git clone <your-repo-url>
cd ai-chat-interface
npm install
```

**2. Configure environment**

```bash
cp .env.local.example .env.local
```

Open `.env.local` and add your Hugging Face token:

```
HF_TOKEN=hf_your_token_here
```

Get a free token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens). No paid plan required — Qwen 2.5 72B is available on the free tier.

**3. Start development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # Run ESLint
```

## Security

`HF_TOKEN` is read exclusively in `app/api/chat/route.ts` on the server. It is never prefixed with `NEXT_PUBLIC_` and is never included in any client-side bundle.

## Switching Models

To use a different model, update the constant in `app/api/chat/route.ts`:

```ts
const HF_MODEL = "Qwen/Qwen2.5-72B-Instruct"; // change this
```

Any model available on the [HF Inference Router](https://router.huggingface.co) with chat completion support will work.
