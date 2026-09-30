"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/lib/utils";
import { useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

interface RepoChatProps {
  messages: ChatMessage[];
  onSend: (message: string) => Promise<void> | void;
  disabled: boolean;
  isLoading: boolean;
  onOpen?: () => void;
  open?: boolean;
}

const suggestionChips = [
  "What should I do first?",
  "Which file should I read?",
  "How can I help with beginner issues?",
];

export function RepoChat({ messages, onSend, disabled, isLoading, onOpen, open }: RepoChatProps) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled || pending || isLoading) return;

    setPending(true);
    setInput("");
    try {
      await onSend(trimmed);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={cn("analysis-chat-panel", open && "analysis-chat-open")}>
      <div className="analysis-chat-header">
        <div>
          <p className="analysis-kicker">Repo chat</p>
          <h3>Ask the project guide</h3>
        </div>
        {onOpen && (
          <Button type="button" variant="ghost" className="analysis-sheet-close" onClick={onOpen}>
            Close
          </Button>
        )}
      </div>

      <div className="analysis-chat-messages">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={cn("analysis-chat-bubble", message.role === "user" ? "user" : "assistant")}>
            {message.content}
          </div>
        ))}

        {isLoading && <div className="analysis-chat-bubble assistant subtle">Thinking about the repo…</div>}
      </div>

      <div className="analysis-chat-pills">
        {suggestionChips.map((chip) => (
          <button
            key={chip}
            type="button"
            className="analysis-chip"
            onClick={() => onSend(chip)}
            disabled={disabled || pending || isLoading}
          >
            {chip}
          </button>
        ))}
      </div>

      <form className="analysis-chat-form" onSubmit={handleSubmit}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={disabled ? "Analysis must finish before chat" : "Ask about this repo"}
          disabled={disabled || pending || isLoading}
          aria-label="Ask about this repo"
        />
        <Button type="submit" className="analysis-send" disabled={disabled || pending || isLoading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
