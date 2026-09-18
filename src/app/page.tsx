"use client";

import { useEffect, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id?: string;
  conversation_id?: string;
  title?: string;
  name?: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load conversations when page opens
  useEffect(() => {
    loadConversations();
  }, []);

  // Get all conversations
  async function loadConversations() {
    try {
      const response = await fetch("/api/conversations");

      const data = await response.json();

      if (Array.isArray(data)) {
        setConversations(data);
      } else if (Array.isArray(data.results)) {
        setConversations(data.results);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  }

  // Send message to Ecommerce Agent
  async function sendMessage() {
    const message = input.trim();

    if (!message || loading) {
      return;
    }

    setInput("");

    // Add user message immediately
    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: message,
      },
    ]);

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: message,

          // Only send conversation_id when continuing
          ...(conversationId
            ? {
                conversation_id: conversationId,
              }
            : {}),
        }),
      });

      const data = await response.json();

      console.log("Elastic response:", data);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.details?.message ||
            "Elastic Agent request failed"
        );
      }

      // Get conversation ID returned by Elastic
      const newConversationId =
        data.conversation_id ||
        data.conversationId ||
        conversationId;

      if (newConversationId) {
        setConversationId(newConversationId);
      }

      // Extract assistant response
      const answer = extractAssistantResponse(data);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: answer,
        },
      ]);

      // Refresh sidebar
      await loadConversations();
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `Error: ${error.message}`
              : "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Extract response from Elastic API
  function extractAssistantResponse(data: any): string {
    if (typeof data.response === "string") {
      return data.response;
    }

    if (typeof data.message === "string") {
      return data.message;
    }

    if (typeof data.output === "string") {
      return data.output;
    }

    if (data.response?.message) {
      return data.response.message;
    }

    if (Array.isArray(data.response?.messages)) {
      return data.response.messages
        .map((message: any) => {
          if (typeof message === "string") {
            return message;
          }

          return (
            message.content ||
            message.text ||
            message.message ||
            ""
          );
        })
        .filter(Boolean)
        .join("\n");
    }

    return JSON.stringify(data, null, 2);
  }

  // Open an existing conversation
  async function openConversation(id: string) {
    setLoadingHistory(true);

    try {
      const response = await fetch(
        `/api/conversations/${id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load conversation"
        );
      }

      setConversationId(id);

      const history = extractMessages(data);

      setMessages(history);
    } catch (error) {
      console.error(
        "Conversation loading error:",
        error
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  // Convert Elastic conversation history
  // into UI messages
  function extractMessages(data: any): Message[] {
    const source =
      data.messages ||
      data.conversation?.messages ||
      data.history ||
      [];

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((message: any) => {
        const role =
          message.role === "user"
            ? "user"
            : "assistant";

        const content =
          message.content ||
          message.text ||
          message.message ||
          "";

        return {
          role,
          content:
            typeof content === "string"
              ? content
              : JSON.stringify(content),
        };
      })
      .filter(
        (message: Message) => message.content
      );
  }

  // Start a completely new conversation
  function newChat() {
    setConversationId(null);
    setMessages([]);
    setInput("");
  }

  // Enter = send
  // Shift + Enter = new line
  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="chat-app">

      {/* =========================
          SIDEBAR
      ========================== */}

      <aside className="sidebar">

        <div className="sidebar-header">

          <div className="brand">
            <div className="brand-icon">
              🛒
            </div>

            <div>
              <h2>Ecommerce Agent</h2>

              <span>
                Analytics Assistant
              </span>
            </div>
          </div>

          <button
            className="new-chat"
            onClick={newChat}
          >
            + New Chat
          </button>

        </div>

        <div className="conversation-list">

          <div className="conversation-title">
            Conversations
          </div>

          {conversations.length === 0 && (
            <div className="empty">
              No conversations
            </div>
          )}

          {conversations.map(
            (conversation, index) => {

              const id =
                conversation.id ||
                conversation.conversation_id;

              if (!id) {
                return null;
              }

              return (
                <button
                  key={id}
                  className={`conversation ${
                    id === conversationId
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    openConversation(id)
                  }
                >
                  <span className="conversation-icon">
                    💬
                  </span>

                  <span className="conversation-text">
                    {conversation.title ||
                      conversation.name ||
                      `Conversation ${
                        index + 1
                      }`}
                  </span>
                </button>
              );
            }
          )}

        </div>
      </aside>


      {/* =========================
          CHAT SECTION
      ========================== */}

      <section className="chat-section">

        {/* Header */}

        <header className="chat-header">

          <div className="header-agent">

            <div className="header-icon">
              🛒
            </div>

            <div>
              <h1>
                Ecommerce Analytics Agent
              </h1>

              <p>
                Powered by Elastic Agent Builder
              </p>
            </div>

          </div>

          {conversationId && (
            <div className="conversation-id">
              {conversationId}
            </div>
          )}

        </header>


        {/* Messages */}

        <div className="messages">

          {/* Welcome */}

          {messages.length === 0 && (
            <div className="welcome">

              <div className="welcome-icon">
                🛒
              </div>

              <h2>
                How can I help you?
              </h2>

              <p>
                Ask questions about your
                ecommerce data, sales,
                customers, products and
                orders.
              </p>


              <div className="examples">

                <button
                  onClick={() =>
                    setInput(
                      "Show me total sales"
                    )
                  }
                >
                  💰 Total sales
                </button>


                <button
                  onClick={() =>
                    setInput(
                      "Show me the top selling products"
                    )
                  }
                >
                  📦 Top products
                </button>


                <button
                  onClick={() =>
                    setInput(
                      "Show me the number of orders"
                    )
                  }
                >
                  🛍️ Total orders
                </button>


                <button
                  onClick={() =>
                    setInput(
                      "Show me sales by country"
                    )
                  }
                >
                  🌎 Sales by country
                </button>


                <button
                  onClick={() =>
                    setInput(
                      "Which products have the highest revenue?"
                    )
                  }
                >
                  📈 Highest revenue
                </button>


                <button
                  onClick={() =>
                    setInput(
                      "Analyze ecommerce sales performance"
                    )
                  }
                >
                  📊 Sales analysis
                </button>

              </div>

            </div>
          )}


          {/* Messages */}

          {messages.map(
            (message, index) => (

              <div
                key={index}
                className={`message-row ${message.role}`}
              >

                <div className="avatar">

                  {message.role === "user"
                    ? "U"
                    : "🛒"}

                </div>

                <div className="message">
                  {message.content}
                </div>

              </div>

            )
          )}


          {/* Loading */}

          {loading && (
            <div className="message-row assistant">

              <div className="avatar">
                🛒
              </div>

              <div className="message typing">

                <span />
                <span />
                <span />

              </div>

            </div>
          )}


          {/* Loading conversation */}

          {loadingHistory && (
            <div className="loading-history">
              Loading conversation...
            </div>
          )}

        </div>


        {/* Input */}

        <div className="input-area">

          <div className="input-box">

            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask your Ecommerce Agent..."
              rows={1}
              disabled={loading}
            />

            <button
              onClick={sendMessage}
              disabled={
                loading ||
                !input.trim()
              }
              aria-label="Send message"
            >
              ↑
            </button>

          </div>

          <div className="input-help">
            Enter to send · Shift + Enter for
            new line
          </div>

        </div>

      </section>

    </main>
  );
}