import { NextResponse } from "next/server";
import type { ChatMessage } from "@/types/chat";

export const runtime = "nodejs";

const HF_MODEL = "Qwen/Qwen2.5-72B-Instruct";
const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";

function isValidMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (m) =>
        m !== null &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
  );
}

type ApiError = { error: string; userMessage: string; status: number };

function classifyError(message: string): ApiError {
  if (message.includes("429") || message.includes("Too Many Requests") || message.includes("rate")) {
    return { error: "RATE_LIMITED", userMessage: "You're sending messages too fast. Please wait a moment and try again.", status: 429 };
  }
  if (message.includes("401") || message.includes("403") || message.includes("unauthorized") || message.includes("Unauthorized")) {
    return { error: "AUTH_ERROR", userMessage: "Invalid Hugging Face token. Please check your HF_TOKEN configuration.", status: 401 };
  }
  if (message.includes("500") || message.includes("503") || message.includes("unavailable") || message.includes("overloaded")) {
    return { error: "SERVER_ERROR", userMessage: "The model is currently unavailable. Please try again in a few seconds.", status: 503 };
  }
  if (message.includes("context") || message.includes("length") || message.includes("too long")) {
    return { error: "CONTEXT_TOO_LONG", userMessage: "This conversation is too long. Please start a new chat.", status: 400 };
  }
  return { error: "UNKNOWN", userMessage: "Something went wrong. Please try again.", status: 500 };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY", userMessage: "Invalid request." }, { status: 400 });
  }

  const messages =
    body && typeof body === "object" && "messages" in body
      ? (body as { messages: unknown }).messages
      : undefined;

  if (!isValidMessages(messages)) {
    return NextResponse.json(
      { error: "INVALID_MESSAGES", userMessage: "messages must be a non-empty array of {role, content} objects" },
      { status: 400 }
    );
  }

  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    return NextResponse.json(
      { error: "AUTH_ERROR", userMessage: "Server is not configured with HF_TOKEN." },
      { status: 500 }
    );
  }

  const hfMessages = messages
    .filter((m) => !m.isError)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  try {
    const res = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: hfMessages,
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.95,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const { error, userMessage, status } = classifyError(`${res.status} ${errText}`);
      return NextResponse.json({ error, userMessage }, { status });
    }

    // Parse the SSE stream from HF and forward only the text deltas to the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const text = json?.choices?.[0]?.delta?.content;
                if (text) controller.enqueue(new TextEncoder().encode(text));
              } catch {
                // skip malformed SSE chunk
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const { error: code, userMessage, status } = classifyError(
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json({ error: code, userMessage }, { status });
  }
}
