"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

type Role =
  | "user"
  | "assistant";

type Message = {
  role: Role;
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

type Round = {
  id?: string;

  input?: {
    message?: string;
    attachments?: unknown[];
  };

  response?: {
    message?: string;
  };

  started_at?: string;

  status?: string;
};

type ConversationDetail = {
  id?: string;

  conversation_id?: string;

  agent_id?: string;

  title?: string;

  name?: string;

  created_at?: string;

  updated_at?: string;

  status?: string;

  rounds?: Round[];

  messages?: unknown[];

  history?: unknown[];

  results?: unknown[];

  conversation?: {
    rounds?: Round[];
    messages?: unknown[];
    history?: unknown[];
  };
};

export default function Home() {
  const [messages, setMessages] =
    useState<Message[]>([]);

  const [input, setInput] =
    useState("");

  const [
    conversationId,
    setConversationId,
  ] = useState<string | null>(null);

  const [
    conversations,
    setConversations,
  ] = useState<Conversation[]>(
    []
  );

  const [loading, setLoading] =
    useState(false);

  const [
    loadingHistory,
    setLoadingHistory,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  /*
   * =======================================================
   * LOAD CONVERSATIONS
   * =======================================================
   */

  useEffect(() => {
    void loadConversations();
  }, []);

  /*
   * =======================================================
   * AUTO SCROLL
   * =======================================================
   */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [
    messages,
    loading,
    loadingHistory,
  ]);

  /*
   * =======================================================
   * LOAD SIDEBAR
   * =======================================================
   */

  async function loadConversations() {
    try {
      const response =
        await fetch(
          "/api/conversations",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load conversations."
        );
      }

      let list: Conversation[] =
        [];

      if (
        Array.isArray(data)
      ) {
        list = data;
      } else if (
        Array.isArray(
          data?.conversations
        )
      ) {
        list =
          data.conversations;
      } else if (
        Array.isArray(
          data?.results
        )
      ) {
        list = data.results;
      }

      setConversations(list);
    } catch (err) {
      console.error(
        "Sidebar error:",
        err
      );

      setConversations([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load conversations."
      );
    }
  }

  /*
   * =======================================================
   * SEND MESSAGE
   * =======================================================
   */

  async function sendMessage() {
    const text =
      input.trim();

    if (
      !text ||
      loading ||
      loadingHistory
    ) {
      return;
    }

    setInput("");

    setError(null);

    /*
     * Add user message immediately
     */

    setMessages(
      (previous) => [
        ...previous,
        {
          role: "user",
          content: text,
        },
      ]
    );

    setLoading(true);

    try {
      const body: {
        input: string;
        conversation_id?: string;
      } = {
        input: text,
      };

      /*
       * Existing conversation
       */

      if (conversationId) {
        body.conversation_id =
          conversationId;
      }

      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              body
            ),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.details?.message ||
            "Elastic Agent request failed."
        );
      }

      /*
       * Get conversation ID
       */

      const newId =
        getConversationIdFromResponse(
          data
        );

      if (newId) {
        setConversationId(
          newId
        );
      }

      /*
       * Get assistant response
       */

      const answer =
        extractAssistantResponse(
          data
        );

      if (answer.trim()) {
        setMessages(
          (previous) => [
            ...previous,
            {
              role: "assistant",
              content: answer,
            },
          ]
        );
      }

      /*
       * Update sidebar
       */

      await loadConversations();
    } catch (err) {
      console.error(
        "Send message error:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong.";

      setError(message);

      setMessages(
        (previous) => [
          ...previous,
          {
            role: "assistant",
            content:
              `Error: ${message}`,
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =======================================================
   * RESPONSE CONVERSATION ID
   * =======================================================
   */

  function getConversationIdFromResponse(
    data: any
  ): string | null {
    if (
      typeof data?.conversation_id ===
      "string"
    ) {
      return data.conversation_id;
    }

    if (
      typeof data?.conversationId ===
      "string"
    ) {
      return data.conversationId;
    }

    if (
      typeof data?.id ===
      "string"
    ) {
      return data.id;
    }

    if (
      typeof data?.conversation?.id ===
      "string"
    ) {
      return data.conversation.id;
    }

    return null;
  }

  /*
   * =======================================================
   * ASSISTANT RESPONSE
   * =======================================================
   */

  function extractAssistantResponse(
    data: any
  ): string {
    if (
      typeof data?.response ===
      "string"
    ) {
      return data.response;
    }

    if (
      typeof data?.message ===
      "string"
    ) {
      return data.message;
    }

    if (
      typeof data?.output ===
      "string"
    ) {
      return data.output;
    }

    if (
      typeof data?.text ===
      "string"
    ) {
      return data.text;
    }

    if (
      typeof data?.response?.message ===
      "string"
    ) {
      return data.response.message;
    }

    if (
      typeof data?.response?.text ===
      "string"
    ) {
      return data.response.text;
    }

    if (
      Array.isArray(
        data?.response?.messages
      )
    ) {
      return extractArrayText(
        data.response.messages
      );
    }

    if (
      Array.isArray(data?.messages)
    ) {
      return extractArrayText(
        data.messages
      );
    }

    return "";
  }

  /*
   * =======================================================
   * ARRAY TEXT
   * =======================================================
   */

  function extractArrayText(
    array: any[]
  ): string {
    return array
      .map((item) => {
        if (
          typeof item ===
          "string"
        ) {
          return item;
        }

        return (
          item?.content ||
          item?.text ||
          item?.message ||
          ""
        );
      })
      .filter(
        (item) =>
          typeof item ===
            "string" &&
          item.trim()
      )
      .join("\n\n");
  }

  /*
   * =======================================================
   * OPEN CONVERSATION
   * =======================================================
   */

  async function openConversation(
    id: string
  ) {
    if (
      !id ||
      loadingHistory
    ) {
      return;
    }

    setConversationId(id);

    setMessages([]);

    setError(null);

    setSidebarOpen(false);

    setLoadingHistory(true);

    try {
      const response =
        await fetch(
          `/api/conversations/${encodeURIComponent(
            id
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data: ConversationDetail =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load conversation."
        );
      }

      /*
       * THIS reads:
       *
       * rounds[].input.message
       * rounds[].response.message
       */

      const history =
        extractConversationMessages(
          data
        );

      setMessages(history);
    } catch (err) {
      console.error(
        "Open conversation error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load conversation."
      );

      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  /*
   * =======================================================
   * EXTRACT ELASTIC ROUNDS
   * =======================================================
   */

  function extractConversationMessages(
    data: ConversationDetail
  ): Message[] {
    const result: Message[] =
      [];

    /*
     * PRIMARY FORMAT
     *
     * {
     *   rounds: [
     *     {
     *       input: {
     *         message: "..."
     *       },
     *       response: {
     *         message: "..."
     *       }
     *     }
     *   ]
     * }
     */

    if (
      Array.isArray(data.rounds)
    ) {
      for (const round of
        data.rounds) {
        addRound(
          round,
          result
        );
      }

      return result;
    }

    /*
     * Nested conversation.rounds
     */

    if (
      Array.isArray(
        data.conversation
          ?.rounds
      )
    ) {
      for (const round of
        data.conversation!
          .rounds!) {
        addRound(
          round,
          result
        );
      }

      return result;
    }

    /*
     * Generic messages fallback
     */

    if (
      Array.isArray(
        data.messages
      )
    ) {
      return normalizeMessages(
        data.messages
      );
    }

    /*
     * History fallback
     */

    if (
      Array.isArray(
        data.history
      )
    ) {
      return normalizeMessages(
        data.history
      );
    }

    /*
     * Nested messages
     */

    if (
      Array.isArray(
        data.conversation
          ?.messages
      )
    ) {
      return normalizeMessages(
        data.conversation
          ?.messages || []
      );
    }

    /*
     * Results fallback
     */

    if (
      Array.isArray(
        data.results
      )
    ) {
      return normalizeMessages(
        data.results
      );
    }

    return result;
  }

  /*
   * =======================================================
   * ADD ELASTIC ROUND
   * =======================================================
   */

  function addRound(
    round: Round,
    result: Message[]
  ) {
    /*
     * USER
     */

    const user =
      round.input?.message;

    if (
      typeof user ===
        "string" &&
      user.trim()
    ) {
      result.push({
        role: "user",
        content:
          user.trim(),
      });
    }

    /*
     * ASSISTANT
     */

    const assistant =
      round.response?.message;

    if (
      typeof assistant ===
        "string" &&
      assistant.trim()
    ) {
      result.push({
        role: "assistant",
        content:
          assistant.trim(),
      });
    }
  }

  /*
   * =======================================================
   * NORMALIZE FALLBACK MESSAGES
   * =======================================================
   */

  function normalizeMessages(
    source: any[]
  ): Message[] {
    return source
      .map(
        (item): Message | null => {
          if (
            typeof item ===
            "string"
          ) {
            return {
              role: "assistant",
              content: item,
            };
          }

          const content =
            typeof item?.content ===
            "string"
              ? item.content
              : typeof item?.text ===
                "string"
              ? item.text
              : typeof item?.message ===
                "string"
              ? item.message
              : "";

          if (
            !content.trim()
          ) {
            return null;
          }

          return {
            role:
              item?.role ===
              "user"
                ? "user"
                : "assistant",

            content:
              content.trim(),
          };
        }
      )
      .filter(
        (
          item
        ): item is Message =>
          item !== null
      );
  }

  /*
   * =======================================================
   * NEW CHAT
   * =======================================================
   */

  function newChat() {
    setConversationId(null);

    setMessages([]);

    setInput("");

    setError(null);

    setSidebarOpen(false);
  }

  /*
   * =======================================================
   * ENTER SEND
   * =======================================================
   */

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void sendMessage();
    }
  }

  /*
   * =======================================================
   * TITLE
   * =======================================================
   */

  function getTitle(
    conversation: Conversation,
    index: number
  ) {
    return (
      conversation.title ||
      conversation.name ||
      `Conversation ${index + 1}`
    );
  }

  /*
   * =======================================================
   * ID
   * =======================================================
   */

  function getId(
    conversation: Conversation
  ) {
    return (
      conversation.id ||
      conversation.conversation_id ||
      ""
    );
  }

  /*
   * =======================================================
   * DATE
   * =======================================================
   */

  function formatDate(
    date?: string
  ) {
    if (!date) {
      return "";
    }

    const value =
      new Date(date);

    if (
      Number.isNaN(
        value.getTime()
      )
    ) {
      return "";
    }

    return value.toLocaleString(
      undefined,
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    );
  }

  /*
   * =======================================================
   * UI
   * =======================================================
   */

  return (
    <main className="chat-app">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`sidebar ${
          sidebarOpen
            ? "sidebar-open"
            : ""
        }`}
      >

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
            type="button"
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
                getId(
                  conversation
                );

              if (!id) {
                return null;
              }

              const title =
                getTitle(
                  conversation,
                  index
                );

              const active =
                id ===
                conversationId;

              return (
                <button
                  key={id}
                  type="button"
                  className={`conversation ${
                    active
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    void openConversation(
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

      {/* =================================================
          CHAT
      ================================================= */}

      <section className="chat-section">

        {/* HEADER */}

        <header className="chat-header">

          <button
            type="button"
            className="mobile-menu"
            onClick={() =>
              setSidebarOpen(
                true
              )
            }
            aria-label="Open conversations"
          >
            ☰
          </button>

          <div className="header-agent">

            <div className="header-icon">
              🛒
            </div>

            <div>

              <h1>
                Ecommerce Analytics Agent
              </h1>

              <p>
                Powered by 8bit system private limited
              </p>

            </div>

          </div>

          {conversationId && (
            <div className="conversation-id">
              {conversationId}
            </div>
          )}

        </header>

        {/* ERROR */}

        {error && (
          <div className="error-banner">

            <span>
              {error}
            </span>

            <button
              type="button"
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
        ================================================= */}

        <div className="messages">

          {/* WELCOME */}

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

          {/* HISTORY LOADING */}

          {loadingHistory && (
            <div className="loading-history">

              <div className="spinner" />

              <span>
                Loading conversation...
              </span>

            </div>
          )}

          {/* MESSAGE LIST */}

          {!loadingHistory &&
            messages.map(
              (
                message,
                index
              ) => (
                <div
                  key={`${conversationId}-${index}`}
                  className={`message-row ${message.role}`}
                >

                  <div className="avatar">

                    {message.role ===
                    "user"
                      ? "U"
                      : "🛒"}

                  </div>

                  <div className="message">

                    <MessageContent
                      content={
                        message.content
                      }
                    />

                  </div>

                </div>
              )
            )}

          {/* TYPING */}

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

          <div
            ref={messagesEndRef}
          />

        </div>

        {/* =================================================
            INPUT
        ================================================= */}

        <div className="input-area">

          <div className="input-box">

            <textarea
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Ask your Ecommerce Agent..."
              rows={1}
              disabled={
                loading ||
                loadingHistory
              }
            />

            <button
              type="button"
              onClick={() =>
                void sendMessage()
              }
              disabled={
                loading ||
                loadingHistory ||
                !input.trim()
              }
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

/* =========================================================
   MESSAGE CONTENT
========================================================= */

function MessageContent({
  content,
}: {
  content: string;
}) {
  /*
   * Keep normal text readable.
   *
   * The CSS white-space setting also preserves
   * Markdown tables and line breaks.
   */

  return (
    <div className="message-content">
      {content}
    </div>
  );
}