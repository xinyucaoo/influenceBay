"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Check,
  X,
  Clock,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface OtherUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface ContactRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  otherUser: OtherUser;
}

interface Message {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  body: string;
  createdAt: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusConfig = {
  PENDING: { label: "Pending", variant: "outline" as const, icon: Clock },
  ACCEPTED: { label: "Accepted", variant: "default" as const, icon: Check },
  DECLINED: { label: "Declined", variant: "destructive" as const, icon: X },
};

export default function MessagesPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedContact = contacts.find((c) => c.id === selectedId) ?? null;
  const currentUserId = session?.user?.id;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setContacts(data.contacts ?? []);
    } catch {
      toast.error("Failed to load conversations");
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  // Fetch messages for selected contact
  const fetchMessages = useCallback(
    async (contactRequestId: string, initial = false) => {
      if (initial) setLoadingMessages(true);
      try {
        const res = await fetch(
          `/api/messages?contactRequestId=${contactRequestId}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMessages(data.messages ?? []);
      } catch {
        if (initial) toast.error("Failed to load messages");
      } finally {
        if (initial) setLoadingMessages(false);
      }
    },
    []
  );

  // Auth guard
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [authStatus, router]);

  // Load contacts
  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchContacts();
    }
  }, [authStatus, fetchContacts]);

  // Load messages on selection change
  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId, true);
    } else {
      setMessages([]);
    }
  }, [selectedId, fetchMessages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(() => {
      fetchMessages(selectedId);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedId, fetchMessages]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend() {
    if (!messageBody.trim() || !selectedContact || !currentUserId) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverUserId: selectedContact.otherUser.id,
          body: messageBody.trim(),
          contactRequestId: selectedContact.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to send");
      }
      setMessageBody("");
      await fetchMessages(selectedContact.id);
      textareaRef.current?.focus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  }

  async function handleStatusUpdate(
    contactId: string,
    newStatus: "ACCEPTED" | "DECLINED"
  ) {
    setUpdatingStatus(contactId);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update");
      }
      toast.success(
        newStatus === "ACCEPTED"
          ? "Contact request accepted"
          : "Contact request declined"
      );
      await fetchContacts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update request"
      );
    } finally {
      setUpdatingStatus(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (authStatus === "loading" || (authStatus === "authenticated" && loadingContacts)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) return null;

  const isReceivedPending = (c: ContactRequest) =>
    c.status === "PENDING" && c.toUserId === currentUserId;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-6xl flex-col px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* ── Left panel: Conversation list ── */}
        <div
          className={`w-full flex-col border-r md:flex md:w-80 lg:w-96 ${
            selectedId ? "hidden" : "flex"
          }`}
        >
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium text-muted-foreground">
              {contacts.length} conversation{contacts.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  No conversations yet
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Send a contact request to start a conversation
                </p>
              </div>
            ) : (
              contacts.map((contact) => {
                const cfg = statusConfig[contact.status];
                const StatusIcon = cfg.icon;
                const isSelected = contact.id === selectedId;

                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedId(contact.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                      isSelected ? "bg-accent" : ""
                    }`}
                  >
                    <Avatar size="lg">
                      {contact.otherUser.avatarUrl && (
                        <AvatarImage
                          src={contact.otherUser.avatarUrl}
                          alt={contact.otherUser.name}
                        />
                      )}
                      <AvatarFallback>
                        {getInitials(contact.otherUser.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">
                          {contact.otherUser.name}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatTime(contact.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {contact.message || "No message"}
                      </p>
                      <Badge
                        variant={cfg.variant}
                        className="mt-1.5 text-[10px]"
                      >
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right panel: Chat view ── */}
        <div
          className={`flex-1 flex-col ${selectedId ? "flex" : "hidden md:flex"}`}
        >
          {!selectedContact ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">
                Select a conversation
              </p>
              <p className="text-sm text-muted-foreground/70">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedId(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <Avatar>
                  {selectedContact.otherUser.avatarUrl && (
                    <AvatarImage
                      src={selectedContact.otherUser.avatarUrl}
                      alt={selectedContact.otherUser.name}
                    />
                  )}
                  <AvatarFallback>
                    {getInitials(selectedContact.otherUser.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {selectedContact.otherUser.name}
                  </p>
                  <Badge
                    variant={statusConfig[selectedContact.status].variant}
                    className="text-[10px]"
                  >
                    {statusConfig[selectedContact.status].label}
                  </Badge>
                </div>

                {isReceivedPending(selectedContact) && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleStatusUpdate(selectedContact.id, "ACCEPTED")
                      }
                      disabled={updatingStatus === selectedContact.id}
                    >
                      {updatingStatus === selectedContact.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="mr-1 h-3.5 w-3.5" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        handleStatusUpdate(selectedContact.id, "DECLINED")
                      }
                      disabled={updatingStatus === selectedContact.id}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </div>
                )}
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm text-muted-foreground">
                      No messages yet
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Send a message to start the conversation
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Initial contact request message */}
                    {selectedContact.message && (
                      <>
                        <div className="flex justify-center">
                          <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                            Contact request:{" "}
                            &ldquo;{selectedContact.message}&rdquo;
                          </span>
                        </div>
                        <Separator className="my-2" />
                      </>
                    )}

                    {messages.map((msg) => {
                      const isOwn = msg.senderUserId === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {msg.body}
                            </p>
                            <p
                              className={`mt-1 text-[10px] ${
                                isOwn
                                  ? "text-primary-foreground/60"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatMessageTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message input */}
              <div className="border-t px-4 py-3">
                {selectedContact.status === "DECLINED" ? (
                  <p className="text-center text-sm text-muted-foreground">
                    This conversation has been declined
                  </p>
                ) : (
                  <div className="flex items-end gap-2">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Type a message..."
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      className="max-h-32 min-h-[2.5rem] resize-none"
                    />
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={!messageBody.trim() || sending}
                      className="shrink-0"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
