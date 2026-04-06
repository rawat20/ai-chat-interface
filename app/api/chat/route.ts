import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import type { ChatMessage } from "@/types/chat";

export const runtime = "edge";

const GEMINI_MODEL = "gemini-2.5-flash";

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

function classifyError(message: string): {
  error: string;
  userMessage: string;
  status: number;
} {
  if (
    message.includes("429") ||
    message.includes("Too Many Requests") ||
    message.includes("quota") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("rate")
  ) {
    return {
      error: "RATE_LIMITED",
      userMessage: "Status: 429 - You're sending messages too fast. Please wait a moment and try again.",
      status: 429,
    };
  }
  if (
    message.includes("API key") ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("API_KEY") ||
    message.includes("permission") ||
    message.includes("unauthorized")
  ) {
    return {
      error: "AUTH_ERROR",
      userMessage: "Invalid API key. Please check your configuration.",
      status: 401,
    };
  }
  if (
    message.includes("500") ||
    message.includes("503") ||
    message.includes("unavailable") ||
    message.includes("UNAVAILABLE") ||
    message.includes("overloaded")
  ) {
    return {
      error: "SERVER_ERROR",
      userMessage: "Gemini is currently unavailable. Please try again in a few seconds.",
      status: 503,
    };
  }
  if (
    message.includes("context") ||
    message.includes("token") ||
    message.includes("length") ||
    message.includes("TOO_LONG") ||
    message.includes("INVALID_ARGUMENT")
  ) {
    return {
      error: "CONTEXT_TOO_LONG",
      userMessage: "This conversation is too long. Please start a new chat.",
      status: 400,
    };
  }
  return {
    error: "UNKNOWN",
    userMessage: "Something went wrong. Please try again.",
    status: 500,
  };
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AUTH_ERROR", userMessage: "Server is not configured with GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { maxOutputTokens: 2048 },
  });

  // Only pass non-error, non-streaming messages to Gemini (strip UI-only fields)
  const contents = messages
    .filter((m) => !m.isError)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  try {
    const result = await model.generateContentStream({ contents });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
          controller.close();
        } catch (streamErr) {
          controller.error(streamErr);
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
    const message = error instanceof Error ? error.message : String(error);
    console.error("Chat API error:", error);
    const classified = classifyError(message);
    return NextResponse.json(
      { error: classified.error, userMessage: classified.userMessage },
      { status: classified.status }
    );
  }
}
