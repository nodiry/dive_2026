import type { ChatMessage, HousingSummary } from '@shared';
import { ArrowRight, Bot, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { inputClass } from '@components/explore/controls';
import { HousingCard } from '@components/HousingCard';
import { KakaoMap, type MapMarker } from '@components/KakaoMap';
import { useAiSearch } from '@hooks/useAiSearch';
import { useSavedHousing } from '@hooks/useSaved';
import { cn } from '@utils/cn';
import { formatWon } from '@utils/money';

const markdownComponents = {
  p: (props: React.ComponentPropsWithoutRef<'p'>) => (
    <p
      className='leading-relaxed'
      {...props}
    />
  ),
  strong: (props: React.ComponentPropsWithoutRef<'strong'>) => (
    <strong
      className='font-bold text-marine'
      {...props}
    />
  ),
  h2: (props: React.ComponentPropsWithoutRef<'h2'>) => (
    <h3
      className='mt-3 mb-1 font-bold text-marine first:mt-0'
      {...props}
    />
  ),
  h3: (props: React.ComponentPropsWithoutRef<'h3'>) => (
    <h4
      className='mt-3 mb-1 font-bold text-marine first:mt-0'
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
      className='text-terracotta-dark hover:underline'
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

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex items-start gap-2.5', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-marine text-mist' : 'bg-terracotta/10 text-terracotta-dark',
        )}
      >
        {isUser ? <UserIcon className='size-3.5' /> : <Bot className='size-3.5' />}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
          isUser ? 'bg-marine text-mist' : 'bg-mist-dim text-marine',
        )}
      >
        {isUser ? (
          message.text
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {message.text}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  const { t } = useTranslation();
  return (
    <div className='flex items-start gap-2.5'>
      <div className='flex size-7 shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-terracotta-dark'>
        <Bot className='size-3.5' />
      </div>
      <div className='flex items-center gap-1.5 rounded-2xl bg-mist-dim px-4 py-2.5 text-sm text-slate'>
        <span className='size-1.5 animate-pulse rounded-full bg-terracotta' />
        {t('aiSearch.thinking')}
      </div>
    </div>
  );
}

export function AiSearch() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [housing, setHousing] = useState<HousingSummary[]>([]);
  const [input, setInput] = useState('');
  const sentInitialRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const aiSearch = useAiSearch();
  const { isSaved, toggleSaved } = useSavedHousing();

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || aiSearch.isPending) return;

    const historyBeforeSend = messages;
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');

    aiSearch.mutate(
      { message: trimmed, history: historyBeforeSend },
      {
        onSuccess: (data) => {
          setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
          if (data.housing.length > 0) setHousing(data.housing);
        },
        onError: () => {
          setMessages((prev) => [...prev, { role: 'assistant', text: t('aiSearch.error') }]);
        },
      },
    );
  }

  useEffect(() => {
    if (!initialQuery || sentInitialRef.current) return;
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

  const markers: MapMarker[] = housing.map((h) => ({
    kind: 'housing',
    id: h.id,
    lat: h.lat ?? NaN,
    lng: h.lng ?? NaN,
    label: h.projectName,
    priceLabel: formatWon(h.minDeposit),
  }));
  const fitKey = housing
    .map((h) => h.id)
    .sort((a, b) => a - b)
    .join(',');

  return (
    <div className='mx-auto max-w-5xl px-6 py-10'>
      <h1 className='text-2xl font-bold text-marine'>{t('aiSearch.title')}</h1>
      <p className='mt-1 text-sm text-slate'>{t('aiSearch.subtitle')}</p>

      {/* A bounded, card-framed map — the AI-search page's own scoped
          "modal" viewport, not the fullscreen Explore map. */}
      <div className='relative mt-6 h-[440px] overflow-hidden rounded-3xl border border-slate-light/30 shadow-lg'>
        <KakaoMap
          background
          className='h-full w-full'
          markers={markers}
          fitKey={fitKey}
        />
        {housing.length > 0 && (
          <div className='pointer-events-none absolute inset-x-0 bottom-4 flex justify-center'>
            <div className='pointer-events-auto flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1'>
              {housing.map((h) => (
                <div
                  key={h.id}
                  className='snap-start'
                >
                  <HousingCard
                    housing={h}
                    variant='rail'
                    saved={isSaved(h.id)}
                    onToggleSave={() => toggleSaved(h.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* The chat transcript, ChatGPT-style: alternating bubbles, markdown
          replies, composer pinned at the bottom. */}
      <div className='mt-6 flex flex-col rounded-2xl border border-slate-light/30 bg-white'>
        <div className='max-h-[420px] min-h-[160px] space-y-4 overflow-y-auto p-5'>
          {messages.length === 0 && !aiSearch.isPending ? (
            <p className='text-sm text-slate'>{t('aiSearch.empty')}</p>
          ) : (
            messages.map((m, i) => (
              <ChatBubble
                key={i}
                message={m}
              />
            ))
          )}
          {aiSearch.isPending && <ThinkingBubble />}
          <div ref={transcriptEndRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className='flex items-center gap-2 border-t border-slate-light/20 p-3.5'
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('aiSearch.inputPlaceholder')}
            className={cn(inputClass, 'flex-1')}
          />
          <button
            type='submit'
            disabled={!input.trim() || aiSearch.isPending}
            aria-label={t('explore.searchSubmit')}
            className='flex shrink-0 items-center justify-center rounded-full bg-terracotta p-2.5 text-white transition-colors hover:bg-terracotta-dark disabled:pointer-events-none disabled:opacity-40'
          >
            <ArrowRight className='size-4' />
          </button>
        </form>
      </div>
    </div>
  );
}
