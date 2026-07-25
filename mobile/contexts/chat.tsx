import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { aiAPI } from '@/api/ai';
import { useAuth } from '@/contexts/auth';
import { useAiSearch } from '@/hooks/useAi';
import type { AiAction, ChatMessage, HousingSummary, NoMatchContext } from '@/shared/schemas';

export interface TranscriptMessage extends ChatMessage {
  /** The stored message id — what an alert subscription is created from. */
  id?: string;
  housing?: HousingSummary[];
  /** Data URL of what the user attached, echoed into their own bubble. */
  image?: string;
  /** A generated 하루 deck this reply spawned. */
  gameId?: string;
  /** Set when the search found nothing; carries the criteria an alert would watch. */
  noMatch?: NoMatchContext | null;
  actions?: AiAction[];
}

interface ChatValue {
  messages: TranscriptMessage[];
  conversationId: string | null;
  busy: boolean;
  send: (text: string, image?: string) => void;
  newChat: () => void;
  openConversation: (id: string) => Promise<void>;
}

const ChatContext = createContext<ChatValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const aiSearch = useAiSearch();
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);

  const busy = aiSearch.isPending || loadingConversation;

  const newChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) newChat();
  }, [isLoggedIn, newChat]);

  const send = useCallback(
    (text: string, image?: string) => {
      const trimmed = text.trim();
      if (!trimmed || aiSearch.isPending || loadingConversation) return;
      setMessages((prev) => [...prev, { role: 'user', text: trimmed, image }]);
      aiSearch.mutate(
        { message: trimmed, conversationId: conversationId ?? undefined, image },
        {
          onSuccess: (data) => {
            setConversationId(data.conversationId);
            setMessages((prev) => [
              ...prev,
              {
                id: data.messageId,
                role: 'assistant',
                text: data.reply,
                housing: data.housing.length > 0 ? data.housing : undefined,
                gameId: data.gameId ?? undefined,
                noMatch: data.noMatch,
                actions: data.actions,
              },
            ]);
          },
          onError: () =>
            setMessages((prev) => [...prev, { role: 'assistant', text: t('ai.error') }]),
        },
      );
    },
    [aiSearch, conversationId, loadingConversation, t],
  );

  const openConversation = useCallback(
    async (id: string) => {
      if (aiSearch.isPending || loadingConversation || id === conversationId) return;
      setConversationId(id);
      setMessages([]);
      setLoadingConversation(true);
      try {
        const detail = await aiAPI.getConversation(id);
        setMessages(
          detail.messages.map((message) => ({
            id: message.id,
            role: message.role,
            text: message.text,
            housing: message.housing.length > 0 ? message.housing : undefined,
            gameId: message.gameId ?? undefined,
            noMatch: message.noMatch,
            actions: message.actions,
          })),
        );
      } catch {
        setConversationId(null);
        setMessages([{ role: 'assistant', text: t('ai.error') }]);
      } finally {
        setLoadingConversation(false);
      }
    },
    [aiSearch.isPending, conversationId, loadingConversation, t],
  );

  const value = useMemo<ChatValue>(
    () => ({ messages, conversationId, busy, send, newChat, openConversation }),
    [messages, conversationId, busy, send, newChat, openConversation],
  );

  return <ChatContext value={value}>{children}</ChatContext>;
}

export function useChat(): ChatValue {
  const value = use(ChatContext);
  if (!value) throw new Error('useChat must be used inside ChatProvider');
  return value;
}
