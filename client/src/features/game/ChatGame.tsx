import type { GameSession } from '@shared';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HousingCard } from '@components/HousingCard';
import { housingDetailPath } from '@constants/path';
import { DeckIcon } from '@features/lifeMatch/LifeDeck';
import type { DeckIconKey } from '@features/lifeMatch/lifeDeckModel';
import { useAnswerGame, useGame, useSaveGameProgress } from '@hooks/useGame';
import { useSavedHousing } from '@hooks/useSaved';
import { cn } from '@utils/cn';

/**
 * The in-chat player for a generated 하루 deck. Deliberately not the full
 * LifeDeck: that is a page-sized experience with its own hero and mode
 * choice, while this has to sit inside a message bubble. Same card idiom,
 * one question at a time, and it ends in real housing rather than a label.
 */
export function ChatGame({ gameId }: { gameId: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'ko';
  const { data: game, isLoading } = useGame(gameId);
  const answerGame = useAnswerGame(gameId);
  const saveProgress = useSaveGameProgress(gameId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [restored, setRestored] = useState(false);

  // Resume where the deck was abandoned. Adjusted during render rather than in
  // an effect (the sanctioned pattern) so the first paint is already correct.
  if (game && !restored) {
    setRestored(true);
    const saved = game.answers ?? {};
    if (Object.keys(saved).length > 0) {
      setAnswers(saved);
      setIndex(Math.min(Object.keys(saved).length, game.questions.length - 1));
    }
  }

  if (isLoading || !game) {
    return (
      <div className='flex items-center gap-2 border-t border-slate-light/20 px-4 py-5 text-sm text-slate'>
        <Loader2 className='size-4 animate-spin text-violet' />
        {t('game.building')}
      </div>
    );
  }

  const result = answerGame.data?.result ?? game.result;
  if (result) return <GameResultView game={answerGame.data ?? game} />;

  const question = game.questions[index];
  const chosen = answers[question.id];
  const isLast = index === game.questions.length - 1;

  function choose(optionId: string) {
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);
    if (!isLast) {
      saveProgress.mutate(next);
      window.setTimeout(() => setIndex((current) => current + 1), 220);
      return;
    }
    answerGame.mutate(next);
  }

  return (
    <div className='border-t border-slate-light/20 bg-lilac/60 p-4 sm:p-5'>
      <div className='flex items-center justify-between gap-3'>
        <span className='font-mono text-xs tracking-wide text-violet uppercase'>{game.theme}</span>
        <span className='font-mono text-xs text-slate'>
          {index + 1} / {game.questions.length}
        </span>
      </div>

      <div className='mt-2 h-1 rounded-full bg-lilac-dim'>
        <div
          className='h-1 rounded-full bg-violet transition-[width] duration-300'
          style={{ width: `${((index + (chosen ? 1 : 0)) / game.questions.length) * 100}%` }}
        />
      </div>

      <p className='mt-4 text-xs font-medium text-slate'>{question.kicker[locale]}</p>
      <h3 className='mt-1 text-lg font-bold text-plum'>{question.title[locale]}</h3>
      <p className='mt-1 text-sm text-slate'>{question.description[locale]}</p>

      {/*
        A hand of cards, not a list of options: portrait cards on a snap rail
        that bleeds to the bubble edges so the next card peeks in. Both faces
        stay mounted and stacked in one grid cell, so picking a card never
        changes its height (the meaning copy runs longer than the caption).
      */}
      <div className='-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4'>
        {question.options.map((option, cardIndex) => {
          const selected = chosen === option.id;
          return (
            <motion.button
              key={option.id}
              type='button'
              aria-pressed={selected}
              disabled={answerGame.isPending}
              onClick={() => choose(option.id)}
              animate={{ y: selected ? -8 : 0 }}
              whileHover={{ y: selected ? -8 : -4 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
              className={cn(
                'flex h-64 w-44 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border p-4 text-left transition-colors disabled:opacity-60 sm:w-auto sm:shrink',
                selected
                  ? 'border-violet bg-plum text-lilac shadow-lg'
                  : 'border-slate-light/30 bg-white text-plum hover:border-violet/40',
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-between font-mono text-xs tracking-wide uppercase',
                  selected ? 'text-lilac/60' : 'text-slate-light',
                )}
              >
                <span>{String(cardIndex + 1).padStart(2, '0')}</span>
                {selected ? <Check className='size-3.5 text-gold' /> : null}
              </span>

              <span
                className={cn(
                  'mt-4 flex size-14 shrink-0 items-center justify-center rounded-full border',
                  selected
                    ? 'border-lilac/20 bg-lilac/10 text-gold'
                    : 'border-violet/20 bg-violet/5 text-violet',
                )}
              >
                <DeckIcon
                  icon={option.icon as DeckIconKey}
                  className='size-7'
                />
              </span>

              <span className='mt-auto grid'>
                <span
                  aria-hidden={!selected}
                  className={cn(
                    'col-start-1 row-start-1 transition-opacity duration-200',
                    selected ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  <span className='block text-sm leading-snug font-bold'>
                    {option.title[locale]}
                  </span>
                  <span className='mt-1 line-clamp-3 block text-xs leading-5 text-lilac/70'>
                    {option.meaning[locale]}
                  </span>
                  {option.chips.length > 0 && (
                    <span className='mt-2 flex flex-wrap gap-1'>
                      {option.chips.slice(0, 2).map((chip) => (
                        <span
                          key={chip[locale]}
                          className='rounded-full border border-lilac/20 px-2 py-0.5 font-mono text-xs text-lilac/80'
                        >
                          {chip[locale]}
                        </span>
                      ))}
                    </span>
                  )}
                </span>

                <span
                  aria-hidden={selected}
                  className={cn(
                    'col-start-1 row-start-1 transition-opacity duration-200',
                    selected ? 'opacity-0' : 'opacity-100',
                  )}
                >
                  <span className='block text-sm leading-snug font-bold'>
                    {option.title[locale]}
                  </span>
                  <span className='mt-1 line-clamp-3 block text-xs leading-5 text-slate'>
                    {option.caption[locale]}
                  </span>
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {answerGame.isPending && (
        <p className='mt-3 flex items-center gap-2 text-xs text-slate'>
          <Loader2 className='size-3.5 animate-spin text-violet' />
          {t('game.scoring')}
        </p>
      )}
    </div>
  );
}

function GameResultView({ game }: { game: GameSession }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === 'en' ? 'en' : 'ko';
  const { isSaved, toggleSaved } = useSavedHousing();
  const result = game.result;
  if (!result) return null;

  const axes = [
    ['FUN', result.stats.fun, 'bg-violet'],
    ['WORK', result.stats.work, 'bg-lilac'],
    ['REST', result.stats.rest, 'bg-gold'],
  ] as const;

  return (
    <div className='border-t border-slate-light/20 bg-lilac/60 p-4 sm:p-5'>
      <div className='flex items-center gap-2'>
        <Sparkles className='size-4 text-violet' />
        <span className='font-mono text-xs tracking-wide text-violet uppercase'>
          {t('game.resultTitle')}
        </span>
      </div>

      <div className='mt-3 rounded-2xl border border-plum-light bg-plum p-4 text-lilac shadow-lg'>
        <div className='grid grid-cols-3 gap-3'>
          {axes.map(([label, value, color]) => (
            <div key={label}>
              <div className='flex items-baseline justify-between font-mono text-xs'>
                <span className='text-lilac/60'>{label}</span>
                <span>{Math.round(value)}</span>
              </div>
              <div className='mt-1 h-1 rounded-full bg-lilac/15'>
                <div
                  className={cn('h-1 rounded-full', color)}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className='mt-3 text-sm leading-6 text-lilac/70'>{result.summary[locale]}</p>
      </div>

      {result.categories.length > 0 && (
        <div className='mt-3 flex flex-wrap gap-1.5'>
          {result.categories.map((category) => (
            <span
              key={category}
              className='rounded-full border border-violet/30 bg-violet/10 px-2.5 py-1 text-xs font-medium text-violet-dark'
            >
              {category}
            </span>
          ))}
        </div>
      )}

      {result.housing.length > 0 && (
        <div className='mt-4'>
          <p className='mb-2 font-mono text-xs tracking-wide text-slate uppercase'>
            {t('game.matches')}
          </p>
          <div className='flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1'>
            {result.housing.map((housing) => (
              <HousingCard
                key={housing.id}
                housing={housing}
                variant='rail'
                saved={isSaved(housing.id)}
                onSelect={() => navigate(housingDetailPath(housing.id))}
                onToggleSave={() => toggleSaved(housing.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
