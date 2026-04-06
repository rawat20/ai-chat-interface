export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isError?: boolean;
}

export interface Session {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
}

export interface SessionIndexEntry {
  id: string;
  createdAt: number;
}
