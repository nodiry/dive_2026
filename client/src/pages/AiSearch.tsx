import type { ChatMessage, HousingSummary } from '@shared';
import { ArrowRight, Bot, Maximize2, Plus, Trash2, User as UserIcon, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { aiAPI } from '@api/ai';
import { inputClass } from '@components/explore/controls';
import { HousingCard } from '@components/HousingCard';
import { KakaoMap, type MapFocus, type MapMarker } from '@components/KakaoMap';
import { useAiConversations, useAiSearch, useDeleteAiConversation } from '@hooks/useAiSearch';
import { useSavedHousing } from '@hooks/useSaved';
import { cn } from '@utils/cn';
import { formatWon } from '@utils/money';

interface TranscriptMessage extends ChatMessage {
  /** Attached to the assistant reply that produced them — rendered as an inline map widget. */
  housing?: HousingSummary[];
}

const markdownComponents = {
  p: (props: React.ComponentPropsWithoutRef<'p'>) => (
    <p
      className='leading-relaxed'
      {...props}
    />
  ),
  strong: (props: React.ComponentPropsWithoutRef<'strong'>) => (
    <strong
      className='font-bold text-plum'
      {...props}
    />
  ),
  h2: (props: React.ComponentPropsWithoutRef<'h2'>) => (
    <h3
      className='mt-3 mb-1 font-bold text-plum first:mt-0'
      {...props}
    />
  ),
  h3: (props: React.ComponentPropsWithoutRef<'h3'>) => (
    <h4
      className='mt-3 mb-1 font-bold text-plum first:mt-0'
      {...props}
    />
  ),
  ul: (props: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul
      className='ml-4 list-disc space-y-1'
      {...props}
    />
  ),
  ol: (props: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol
      className='ml-4 list-decimal space-y-1'
      {...props}
    />
  ),
  a: (props: React.ComponentPropsWithoutRef<'a'>) => (
    <a
      target='_blank'
      rel='noreferrer'
      className='text-violet-dark hover:underline'
      {...props}
    />
  ),
  table: (props: React.ComponentPropsWithoutRef<'table'>) => (
    <div className='overflow-x-auto'>
      <table
        className='w-full border-collapse text-left text-xs'
        {...props}
      />
    </div>
  ),
  th: (props: React.ComponentPropsWithoutRef<'th'>) => (
    <th
      className='border-b border-slate-light/40 px-2 py-1.5 font-medium text-slate'
      {...props}
    />
  ),
  td: (props: React.ComponentPropsWithoutRef<'td'>) => (
    <td
      className='border-b border-slate-light/20 px-2 py-1.5'
      {...props}
    />
  ),
};

function useHousingMapState(housing: HousingSummary[]) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = housing.find((h) => h.id === selectedId) ?? null;
  const markers: MapMarker[] = housing.map((h) => ({
    kind: 'housing',
    id: h.id,
    lat: h.lat ?? NaN,
    lng: h.lng ?? NaN,
    label: h.projectName,
    priceLabel: formatWon(h.minDeposit),
    selected: h.id === selectedId,
  }));
  const focus: MapFocus | null =
    selected && selected.lat != null && selected.lng != null
      ? { lat: selected.lat, lng: selected.lng, key: selected.id }
      : null;
  const fitKey = housing
    .map((h) => h.id)
    .sort((a, b) => a - b)
    .join(',');
  return { selectedId, setSelectedId, markers, focus, fitKey };
}

/**
 * The inline map widget attached to an assistant reply — bounded like a
 * ChatGPT tool card, with clickable listing slots along the bottom and an
 * expand control for the fullscreen version.
 */
function MapResultCard({ housing, onExpand }: { housing: HousingSummary[]; onExpand: () => void }) {
  const { t } = useTranslation();
  const { selectedId, setSelectedId, markers, focus, fitKey } = useHousingMapState(housing);

  return (
    <div className='relative h-80 overflow-hidden border-t border-slate-light/20 bg-lilac-dim'>
      <KakaoMap
        background
        fitOnLoad
        className='h-full w-full'
        markers={markers}
        focus={focus}
        fitKey={fitKey}
        onMarkerClick={(m) => m.kind === 'housing' && setSelectedId(m.id)}
      />
      <button
        type='button'
        onClick={onExpand}
        aria-label={t('aiSearch.expandMap')}
        title={t('aiSearch.expandMap')}
        className='absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-slate-light/30 bg-lilac/95 px-3 py-1.5 text-xs font-medium text-plum shadow-lg backdrop-blur transition-colors hover:border-violet/40 hover:text-violet-dark'
      >
        <Maximize2 className='size-3.5' />
        {t('aiSearch.expandMap')}
      </button>
      <div className='absolute inset-x-0 bottom-3 z-10 flex justify-center px-3'>
        <div className='flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto pb-1'>
          {housing.map((h) => (
            <button
              key={h.id}
              type='button'
              onClick={() => setSelectedId(h.id)}
              aria-pressed={h.id === selectedId}
              className={cn(
                'flex shrink-0 snap-start items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur transition-colors',
                h.id === selectedId
                  ? 'border-violet bg-violet text-white'
                  : 'border-slate-light/30 bg-white/95 text-plum hover:border-violet/40',
              )}
            >
              <span className='max-w-32 truncate'>{h.projectName}</span>
              <span className={cn('font-mono', h.id === selectedId ? 'text-white' : 'text-slate')}>
                {formatWon(h.minDeposit)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The expanded version: fullscreen map with the full housing cards in a bottom rail, ChatGPT-canvas style. */
function FullscreenMap({ housing, onClose }: { housing: HousingSummary[]; onClose: () => void }) {
  const { t } = useTranslation();
  const { selectedId, setSelectedId, markers, focus, fitKey } = useHousingMapState(housing);
  const { isSaved, toggleSaved } = useSavedHousing();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className='fixed inset-0 z-50 bg-lilac'>
      <KakaoMap
        background
        fitOnLoad
        className='h-full w-full'
        markers={markers}
        focus={focus}
        fitKey={fitKey}
        onMarkerClick={(m) => m.kind === 'housing' && setSelectedId(m.id)}
      />
      <button
        type='button'
        onClick={onClose}
        aria-label={t('aiSearch.closeMap')}
        className='absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-full border border-slate-light/30 bg-lilac/95 px-3.5 py-2 text-sm font-medium text-plum shadow-lg backdrop-blur transition-colors hover:border-violet/40'
      >
        <X className='size-4' />
        {t('aiSearch.closeMap')}
      </button>
      <div className='absolute inset-x-0 bottom-4 z-10 flex justify-center'>
        <div className='flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1'>
          {housing.map((h) => (
            <div
              key={h.id}
              className='snap-start'
            >
              <HousingCard
                housing={h}
                variant='rail'
                selected={h.id === selectedId}
                onSelect={() => setSelectedId(h.id)}
                saved={isSaved(h.id)}
                onToggleSave={() => toggleSaved(h.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message, onExpand }: { message: TranscriptMessage; onExpand: () => void }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex items-start gap-2.5', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-plum text-lilac' : 'bg-violet/10 text-violet-dark',
        )}
      >
        {isUser ? <UserIcon className='size-3.5' /> : <Bot className='size-3.5' />}
      </div>
      <div className={cn('min-w-0 flex-1', isUser && 'flex justify-end')}>
        <div
          className={cn(
            'overflow-hidden rounded-2xl text-sm',
            isUser ? 'max-w-[80%] bg-plum px-4 py-2.5 text-lilac' : 'bg-lilac-dim text-plum',
          )}
        >
          {isUser ? (
            message.text
          ) : (
            <>
              <div className='px-4 py-2.5'>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {message.text}
                </ReactMarkdown>
              </div>
              {message.housing?.some((h) => h.lat != null && h.lng != null) && (
                <MapResultCard
                  housing={message.housing}
                  onExpand={onExpand}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  const { t } = useTranslation();
  return (
    <div className='flex items-start gap-2.5'>
      <div className='flex size-7 shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet-dark'>
        <Bot className='size-3.5' />
      </div>
      <div className='flex items-center gap-1.5 rounded-2xl bg-lilac-dim px-4 py-2.5 text-sm text-slate'>
        <span className='size-1.5 animate-pulse rounded-full bg-violet' />
        {t('aiSearch.thinking')}
      </div>
    </div>
  );
}

export function AiSearch() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [input, setInput] = useState('');
  const [expandedHousing, setExpandedHousing] = useState<HousingSummary[] | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const sentInitialRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const aiSearch = useAiSearch();
  const conversations = useAiConversations(true);
  const deleteConversation = useDeleteAiConversation();

  function sendMessage(text: string, targetConversationId = conversationId) {
    const trimmed = text.trim();
    if (!trimmed || aiSearch.isPending || loadingConversation) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');

    aiSearch.mutate(
      { message: trimmed, conversationId: targetConversationId ?? undefined },
      {
        onSuccess: (data) => {
          setConversationId(data.conversationId);
          // Recorded in the URL (and ?q= dropped) so a refresh reopens this
          // exact chat instead of re-sending the navbar query.
          setSearchParams({ c: data.conversationId }, { replace: true });
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: data.reply,
              housing: data.housing.length > 0 ? data.housing : undefined,
            },
          ]);
        },
        onError: () => {
          setMessages((prev) => [...prev, { role: 'assistant', text: t('aiSearch.error') }]);
        },
      },
    );
  }

  function startNewChat() {
    if (aiSearch.isPending || loadingConversation) return;
    setConversationId(null);
    setMessages([]);
    setExpandedHousing(null);
    setInput('');
    setSearchParams({}, { replace: true });
  }

  async function openConversation(id: string) {
    if (aiSearch.isPending || loadingConversation || id === conversationId) return;
    setConversationId(id);
    setSearchParams({ c: id }, { replace: true });
    setExpandedHousing(null);
    setMessages([]);
    setLoadingConversation(true);
    try {
      const detail = await aiAPI.getConversation(id);
      setMessages(
        detail.messages.map((m) => ({
          role: m.role,
          text: m.text,
          housing: m.housing.length > 0 ? m.housing : undefined,
        })),
      );
    } catch {
      // Stale or foreign id (deleted chat, old URL, another account's link):
      // fall back to a clean new chat instead of keeping a broken id that
      // would 404 every subsequent send.
      setConversationId(null);
      setSearchParams({}, { replace: true });
      setMessages([{ role: 'assistant', text: t('aiSearch.error') }]);
    } finally {
      setLoadingConversation(false);
    }
  }

  function removeConversation(id: string) {
    if (aiSearch.isPending || loadingConversation) return;
    deleteConversation.mutate(id, {
      onSuccess: () => {
        if (id === conversationId) startNewChat();
      },
    });
  }

  const restoredRef = useRef(false);
  useEffect(() => {
    const stored = searchParams.get('c');
    if (!stored || restoredRef.current) return;
    restoredRef.current = true;
    void openConversation(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore the URL-recorded chat once on mount
  }, []);

  useEffect(() => {
    if (!initialQuery || sentInitialRef.current || searchParams.get('c')) return;
    // Deferred a tick, and the "already sent" flag only set once the timer
    // actually fires (not when scheduling it): calling mutate() synchronously
    // inside a mount effect races React StrictMode's dev-only
    // mount->cleanup->mount cycle — the mutation observer subscribed on the
    // first pass gets torn down before the request resolves, so the
    // response lands but no component is left listening (stuck on
    // "thinking" forever). StrictMode's cleanup cancels this timer before
    // it fires on the first (discarded) pass; it only actually runs on the
    // second, stable pass, once the double-invoke has settled.
    const timer = setTimeout(() => {
      if (sentInitialRef.current) return;
      sentInitialRef.current = true;
      sendMessage(initialQuery);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once for the query param handoff from the navbar
  }, [initialQuery]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, aiSearch.isPending]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    sendMessage(input);
  }

  const suggestions = [
    t('aiSearch.suggestion1'),
    t('aiSearch.suggestion2'),
    t('aiSearch.suggestion3'),
  ];
  const empty = messages.length === 0 && !aiSearch.isPending;

  return (
    <div className='flex min-h-0 flex-1'>
      <aside className='hidden w-64 shrink-0 flex-col border-r border-slate-light/20 md:flex'>
        <div className='p-3'>
          <button
            type='button'
            onClick={startNewChat}
            className='flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-light/40 bg-white px-4 py-2 text-sm font-medium text-plum transition-colors hover:border-violet/40 hover:text-violet-dark'
          >
            <Plus className='size-4' />
            {t('aiSearch.newChat')}
          </button>
        </div>
        <span className='px-4 pb-1.5 font-mono text-xs tracking-wide text-slate uppercase'>
          {t('aiSearch.historyTitle')}
        </span>
        <div className='min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3'>
          {(conversations.data ?? []).length === 0 && (
            <p className='px-2 py-1 text-xs text-slate-light'>{t('aiSearch.historyEmpty')}</p>
          )}
          {(conversations.data ?? []).map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                'group flex items-center gap-1 rounded-full px-3 py-2 text-sm transition-colors',
                conversation.id === conversationId
                  ? 'bg-violet/10 text-violet-dark'
                  : 'text-slate hover:bg-plum/5 hover:text-plum',
              )}
            >
              <button
                type='button'
                onClick={() => openConversation(conversation.id)}
                className='min-w-0 flex-1 truncate text-left'
              >
                {conversation.title}
              </button>
              <button
                type='button'
                aria-label={t('aiSearch.deleteChat')}
                title={t('aiSearch.deleteChat')}
                onClick={() => removeConversation(conversation.id)}
                className='shrink-0 rounded-full p-1 text-slate-light opacity-0 transition-opacity group-hover:opacity-100 hover:text-violet focus-visible:opacity-100'
              >
                <Trash2 className='size-3.5' />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='min-h-0 flex-1 overflow-y-auto'>
          <div className='mx-auto flex min-h-full w-full max-w-5xl flex-col px-6'>
            {loadingConversation ? (
              <div className='space-y-4 py-8'>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className='h-16 animate-pulse rounded-2xl bg-lilac-dim'
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            ) : empty ? (
              <div className='flex flex-1 flex-col items-center justify-center py-16 text-center'>
                <div className='flex size-12 items-center justify-center rounded-full bg-violet/10 text-violet-dark'>
                  <Bot className='size-6' />
                </div>
                <h1 className='mt-4 text-2xl font-bold text-plum'>{t('aiSearch.title')}</h1>
                <p className='mt-1 max-w-md text-sm text-slate'>{t('aiSearch.empty')}</p>
                <div className='mt-6 flex flex-wrap justify-center gap-2'>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type='button'
                      onClick={() => sendMessage(suggestion)}
                      className='rounded-full border border-slate-light/40 bg-white px-4 py-2 text-sm text-slate transition-colors hover:border-violet/40 hover:text-violet-dark'
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className='space-y-4 py-8'>
                {messages.map((m, i) => (
                  <ChatBubble
                    key={i}
                    message={m}
                    onExpand={() => m.housing && setExpandedHousing(m.housing)}
                  />
                ))}
                {aiSearch.isPending && <ThinkingBubble />}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>
        </div>

        <div className='border-t border-slate-light/20 bg-lilac/95 backdrop-blur'>
          <form
            onSubmit={handleSubmit}
            className='mx-auto flex w-full max-w-5xl items-center gap-2 px-6 py-3.5'
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder={t('aiSearch.inputPlaceholder')}
              aria-label={t('aiSearch.inputPlaceholder')}
              className={cn(inputClass, 'flex-1')}
            />
            <button
              type='submit'
              disabled={!input.trim() || aiSearch.isPending}
              aria-label={t('explore.searchSubmit')}
              className='flex shrink-0 items-center justify-center rounded-full bg-violet p-2.5 text-white transition-colors hover:bg-violet-dark disabled:pointer-events-none disabled:opacity-40'
            >
              <ArrowRight className='size-4' />
            </button>
          </form>
        </div>
      </div>

      {expandedHousing && (
        <FullscreenMap
          housing={expandedHousing}
          onClose={() => setExpandedHousing(null)}
        />
      )}
    </div>
  );
}
