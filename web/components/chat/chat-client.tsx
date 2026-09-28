"use client";

import { can, type Message, type ProjectSnapshot } from "@relay/shared";
import { Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchMessages, postMessage } from "@/lib/browser-api";
import { useProjectRealtime } from "@/hooks/use-project-realtime";
import { useProjectStore } from "@/store/project-store";

function isGrouped(previous: Message | undefined, current: Message): boolean {
  if (!previous || previous.userId !== current.userId) return false;
  return new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60_000;
}

export function ChatClient({
  initialSnapshot,
  currentUserId,
}: {
  initialSnapshot: ProjectSnapshot;
  currentUserId: string;
}) {
  const projectId = initialSnapshot.project.id;
  const storeProjectId = useProjectStore((state) => state.projectId);
  const storedMessages = useProjectStore((state) => state.messages);
  const storedMembers = useProjectStore((state) => state.members);
  const typingUsers = useProjectStore((state) => state.typingUsers);
  const replaceSnapshot = useProjectStore((state) => state.replaceSnapshot);
  const upsertMessage = useProjectStore((state) => state.upsertMessage);
  const removeMessage = useProjectStore((state) => state.removeMessage);
  const messages = useMemo(
    () => (storeProjectId === projectId ? storedMessages : initialSnapshot.messages)
      .slice()
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [initialSnapshot.messages, projectId, storeProjectId, storedMessages],
  );
  const members = storeProjectId === projectId ? storedMembers : initialSnapshot.members;
  const actor = members.find((member) => member.userId === currentUserId);
  const mayPost = actor ? can(actor.role, "message.post", { actorId: currentUserId }) : false;
  const [body, setBody] = useState("");
  const [hasMore, setHasMore] = useState(initialSnapshot.messages.length === 50);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const timeline = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);
  const lastTypingSent = useRef(0);

  useEffect(() => replaceSnapshot(initialSnapshot), [initialSnapshot, replaceSnapshot]);
  const { sendTyping } = useProjectRealtime(projectId, currentUserId);
  useEffect(() => {
    if (pinnedToBottom.current) {
      timeline.current?.scrollTo({ top: timeline.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  function onScroll() {
    const element = timeline.current;
    if (!element) return;
    pinnedToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  }

  function changeBody(value: string) {
    setBody(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingSent.current > 1000 && actor) {
      lastTypingSent.current = now;
      sendTyping(actor.profile.displayName);
    }
  }

  async function send() {
    const trimmed = body.trim();
    if (!trimmed || !mayPost) return;
    const now = new Date().toISOString();
    const temporary: Message = {
      id: crypto.randomUUID(),
      projectId,
      userId: currentUserId,
      body: trimmed,
      createdAt: now,
    };
    setBody("");
    pinnedToBottom.current = true;
    upsertMessage(temporary);
    try {
      const created = await postMessage(projectId, trimmed);
      removeMessage(temporary.id);
      upsertMessage(created);
    } catch (error) {
      removeMessage(temporary.id);
      setBody(trimmed);
      toast.error(error instanceof Error ? error.message : "Could not send the message.");
    }
  }

  async function loadOlder() {
    const first = messages[0];
    const element = timeline.current;
    if (!first || !element || loadingOlder) return;
    setLoadingOlder(true);
    const previousHeight = element.scrollHeight;
    try {
      const older = await fetchMessages(projectId, first.createdAt);
      older.forEach(upsertMessage);
      setHasMore(older.length === 50);
      requestAnimationFrame(() => {
        if (timeline.current) timeline.current.scrollTop += timeline.current.scrollHeight - previousHeight;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  }

  return (
    <div className="chat-view">
      <div className="chat-heading">
        <div><h2>Chat</h2><p>One shared channel for this project.</p></div>
        <span>{members.length} members</span>
      </div>
      <div className="chat-timeline" ref={timeline} onScroll={onScroll} aria-live="polite">
        {hasMore && (
          <button className="load-older" type="button" disabled={loadingOlder} onClick={() => void loadOlder()}>
            {loadingOlder ? "Loading…" : "Load older messages"}
          </button>
        )}
        {messages.map((message, index) => {
          const author = members.find((member) => member.userId === message.userId);
          const grouped = isGrouped(messages[index - 1], message);
          return (
            <article className={`chat-message${grouped ? " grouped" : ""}`} key={message.id}>
              {!grouped && (
                <span className="chat-avatar" style={{ backgroundColor: author?.profile.avatarColor ?? "var(--muted)" }}>
                  {(author?.profile.displayName ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="message-content">
                {!grouped && (
                  <header>
                    <strong>{author?.profile.displayName ?? "Former member"}</strong>
                    <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                  </header>
                )}
                <p>{message.body}</p>
              </div>
            </article>
          );
        })}
        {messages.length === 0 && <div className="chat-empty"><p>No messages yet. Start with a useful update.</p></div>}
      </div>
      <div className="typing-line" aria-live="polite">
        {typingUsers.length > 0
          ? `${typingUsers.slice(0, 2).map((user) => user.name).join(" and ")}${typingUsers.length > 2 ? ` and ${typingUsers.length - 2} more` : ""} typing…`
          : ""}
      </div>
      <div className="chat-composer">
        <textarea
          aria-label="Message"
          value={body}
          onChange={(event) => changeBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder={mayPost ? "Message this project…" : "Viewers can read chat but cannot post"}
          disabled={!mayPost}
          rows={2}
          maxLength={4000}
        />
        <button
          type="button"
          aria-label="Send message"
          title={!mayPost ? "Viewers cannot post messages" : "Send (Enter)"}
          disabled={!mayPost || !body.trim()}
          onClick={() => void send()}
        >
          <Send size={16} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}
