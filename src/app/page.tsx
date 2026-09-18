"use client";

import { useEffect, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id?: string;
  conversation_id?: string;
  agent_id?: string;
  title?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] =
    useState<string | null>(null);

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] =
    useState(false);

  const [error, setError] = useState<string | null>(
    null
  );

  // =========================================================
  // LOAD CONVERSATIONS WHEN PAGE OPENS
  // =========================================================

  useEffect(() => {
    loadConversations();
  }, []);

  // =========================================================
  // GET ALL CONVERSATIONS
  // =========================================================

  async function loadConversations() {
    try {
      const response = await fetch(
        "/api/conversations",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      console.log(
        "Conversations response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load conversations"
        );
      }

      /*
       * Your API can return:
       *
       * {
       *   conversations: [...]
       * }
       *
       * OR Elastic directly:
       *
       * {
       *   results: [...]
       * }
       *
       * OR an array.
       */

      if (Array.isArray(data)) {
        setConversations(data);
      } else if (
        Array.isArray(data.conversations)
      ) {
        setConversations(data.conversations);
      } else if (
        Array.isArray(data.results)
      ) {
        setConversations(data.results);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error(
        "Failed to load conversations:",
        error
      );

      setConversations([]);
    }
  }

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  async function sendMessage() {
    const message = input.trim();

    if (!message || loading) {
      return;
    }

    setInput("");
    setError(null);

    // Add user message immediately
    const userMessage: Message = {
      role: "user",
      content: message,
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setLoading(true);

    try {
      const body: {
        input: string;
        conversation_id?: string;
      } = {
        input: message,
      };

      // Continue existing conversation
      if (conversationId) {
        body.conversation_id =
          conversationId;
      }

      console.log(
        "Sending chat request:",
        body
      );

      const response = await fetch(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      console.log(
        "Elastic chat response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.details?.message ||
            "Elastic Agent request failed"
        );
      }

      // =====================================================
      // GET CONVERSATION ID
      // =====================================================

      const newConversationId =
        data.conversation_id ||
        data.conversationId ||
        data.conversation?.id ||
        data.id ||
        conversationId;

      if (newConversationId) {
        setConversationId(
          newConversationId
        );
      }

      // =====================================================
      // GET ASSISTANT RESPONSE
      // =====================================================

      const answer =
        extractAssistantResponse(data);

      const assistantMessage: Message = {
        role: "assistant",
        content: answer,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);

      // Refresh sidebar
      await loadConversations();
    } catch (error) {
      console.error(
        "Chat error:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong.";

      setError(errorMessage);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: `Error: ${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // EXTRACT ASSISTANT RESPONSE
  // =========================================================

  function extractAssistantResponse(
    data: any
  ): string {
    // Simple response
    if (
      typeof data?.response === "string"
    ) {
      return data.response;
    }

    // Simple message
    if (
      typeof data?.message === "string"
    ) {
      return data.message;
    }

    // Output
    if (
      typeof data?.output === "string"
    ) {
      return data.output;
    }

    // Text
    if (
      typeof data?.text === "string"
    ) {
      return data.text;
    }

    // response.message
    if (
      typeof data?.response?.message ===
      "string"
    ) {
      return data.response.message;
    }

    // response.text
    if (
      typeof data?.response?.text ===
      "string"
    ) {
      return data.response.text;
    }

    // response.messages
    if (
      Array.isArray(
        data?.response?.messages
      )
    ) {
      return data.response.messages
        .map((message: any) => {
          if (
            typeof message === "string"
          ) {
            return message;
          }

          return (
            message?.content ||
            message?.text ||
            message?.message ||
            ""
          );
        })
        .filter(
          (value: unknown): value is string =>
            typeof value === "string" &&
            value.trim().length > 0
        )
        .join("\n");
    }

    // messages
    if (
      Array.isArray(data?.messages)
    ) {
      return data.messages
        .map((message: any) => {
          if (
            typeof message === "string"
          ) {
            return message;
          }

          return (
            message?.content ||
            message?.text ||
            message?.message ||
            ""
          );
        })
        .filter(
          (value: unknown): value is string =>
            typeof value === "string" &&
            value.trim().length > 0
        )
        .join("\n");
    }

    // Last fallback
    return JSON.stringify(
      data,
      null,
      2
    );
  }

  // =========================================================
  // OPEN EXISTING CONVERSATION
  // =========================================================

  async function openConversation(
    id: string
  ) {
    if (!id) {
      return;
    }

    setLoadingHistory(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/conversations/${encodeURIComponent(
          id
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      console.log(
        "Conversation detail:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load conversation"
        );
      }

      // Set selected conversation
      setConversationId(id);

      // Extract history
      const history =
        extractMessages(data);

      setMessages(history);
    } catch (error) {
      console.error(
        "Conversation loading error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load conversation."
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  // =========================================================
  // EXTRACT CONVERSATION MESSAGES
  // =========================================================

  function extractMessages(
    data: any
  ): Message[] {
    const source =
      data?.messages ||
      data?.conversation?.messages ||
      data?.history ||
      data?.results ||
      [];

    if (!Array.isArray(source)) {
      return [];
    }

    const messages: Message[] = source
      .map(
        (message: any): Message => {
          const role: "user" | "assistant" =
            message?.role === "user"
              ? "user"
              : "assistant";

          const content =
            message?.content ??
            message?.text ??
            message?.message ??
            "";

          return {
            role,
            content:
              typeof content === "string"
                ? content
                : JSON.stringify(
                    content
                  ),
          };
        }
      )
      .filter(
        (
          message: Message
        ) =>
          message.content
            .trim()
            .length > 0
      );

    return messages;
  }

  // =========================================================
  // NEW CHAT
  // =========================================================

  function newChat() {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setError(null);
  }

  // =========================================================
  // ENTER TO SEND
  // SHIFT + ENTER = NEW LINE
  // =========================================================

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (
        input.trim() &&
        !loading
      ) {
        sendMessage();
      }
    }
  }

  // =========================================================
  // FORMAT DATE
  // =========================================================

  function formatDate(
    date?: string
  ): string {
    if (!date) {
      return "";
    }

    try {
      return new Date(
        date
      ).toLocaleString();
    } catch {
      return "";
    }
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="chat-app">

      {/* ===================================================
          SIDEBAR
      ==================================================== */}

      <aside className="sidebar">

        <div className="sidebar-header">

          <div className="brand">

            <div className="brand-icon">
              🛒
            </div>

            <div>
              <h2>
                Ecommerce Agent
              </h2>

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

          {conversations.length ===
            0 && (
            <div className="empty">
              No conversations
            </div>
          )}

          {conversations.map(
            (
              conversation,
              index
            ) => {

              const id =
                conversation.id ||
                conversation.conversation_id;

              if (!id) {
                return null;
              }

              const title =
                conversation.title ||
                conversation.name ||
                `Conversation ${
                  index + 1
                }`;

              const isActive =
                id ===
                conversationId;

              return (
                <button
                  key={id}
                  className={`conversation ${
                    isActive
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    openConversation(
                      id
                    )
                  }
                  disabled={
                    loadingHistory
                  }
                >

                  <span className="conversation-icon">
                    💬
                  </span>

                  <span className="conversation-content">

                    <span className="conversation-text">
                      {title}
                    </span>

                    {conversation.updated_at && (
                      <span className="conversation-date">
                        {formatDate(
                          conversation.updated_at
                        )}
                      </span>
                    )}

                  </span>

                </button>
              );
            }
          )}

        </div>

      </aside>

      {/* ===================================================
          CHAT SECTION
      ==================================================== */}

      <section className="chat-section">

        {/* =================================================
            HEADER
        ================================================== */}

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
                Powered by Elastic Agent
                Builder
              </p>

            </div>

          </div>

          {conversationId && (
            <div className="conversation-id">
              {conversationId}
            </div>
          )}

        </header>

        {/* =================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="error-banner">
            {error}

            <button
              onClick={() =>
                setError(null)
              }
            >
              ×
            </button>
          </div>
        )}

        {/* =================================================
            MESSAGES
        ================================================== */}

        <div className="messages">

          {/* =================================================
              WELCOME SCREEN
          ================================================== */}

          {messages.length ===
            0 &&
            !loadingHistory && (
              <div className="welcome">

                <div className="welcome-icon">
                  🛒
                </div>

                <h2>
                  How can I help you?
                </h2>

                <p>
                  Ask questions about
                  your ecommerce data,
                  sales, customers,
                  products and orders.
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

          {/* =================================================
              CONVERSATION LOADING
          ================================================== */}

          {loadingHistory && (
            <div className="loading-history">
              Loading conversation...
            </div>
          )}

          {/* =================================================
              CHAT MESSAGES
          ================================================== */}

          {messages.map(
            (
              message,
              index
            ) => (
              <div
                key={`${index}-${message.role}`}
                className={`message-row ${message.role}`}
              >

                <div className="avatar">

                  {message.role ===
                  "user"
                    ? "U"
                    : "🛒"}

                </div>

                <div className="message">

                  {message.content}

                </div>

              </div>
            )
          )}

          {/* =================================================
              TYPING INDICATOR
          ================================================== */}

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

        </div>

        {/* =================================================
            INPUT AREA
        ================================================== */}

        <div className="input-area">

          <div className="input-box">

            <textarea
              value={input}
              onChange={(
                event
              ) =>
                setInput(
                  event.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Ask your Ecommerce Agent..."
              rows={1}
              disabled={loading}
            />

            <button
              onClick={
                sendMessage
              }
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
            Enter to send · Shift +
            Enter for new line
          </div>

        </div>

      </section>

    </main>
  );
}