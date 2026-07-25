import {
  ArrowLeft,
  ArrowRight,
  Building2,
  BusFront,
  Car,
  Check,
  CircleDollarSign,
  Clock3,
  Coffee,
  Compass,
  Dumbbell,
  Expand,
  House,
  LampDesk,
  Leaf,
  MapPin,
  MoonStar,
  Pill,
  RotateCcw,
  Scale,
  ShoppingBag,
  Sofa,
  Sparkles,
  Store,
  Trees,
  Utensils,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Select from '@components/ui/Select';
import { DISTRICTS } from '@constants/districts';
import { cn } from '@utils/cn';
import { HOUSING_TYPE_VALUES } from '@utils/filters';
import { DESTINATIONS, type DestinationId, type LifeProfile } from './model';
import {
  getAnswerOption,
  getArchetype,
  getDeckQuestions,
  localize,
  MODE_COPY,
  calculateLifeDeckResult,
  type DeckIconKey,
  type DeckLocale,
  type DeckMode,
  type LifeDeckResult,
} from './lifeDeckModel';

const ICONS: Record<DeckIconKey, LucideIcon> = {
  balance: Scale,
  brunch: Utensils,
  car: Car,
  city: Building2,
  clock: Clock3,
  cluster: Store,
  coffee: Coffee,
  coin: CircleDollarSign,
  compass: Compass,
  dining: Utensils,
  dumbbell: Dumbbell,
  expand: Expand,
  home: House,
  leaf: Leaf,
  longRoad: MapPin,
  moonTree: MoonStar,
  park: Trees,
  pharmacy: Pill,
  quiet: MoonStar,
  shopAway: ShoppingBag,
  smallHome: House,
  sofa: Sofa,
  sparkleHome: Sparkles,
  train: BusFront,
  transit: BusFront,
  wallet: WalletCards,
  window: LampDesk,
};

const UI = {
  ko: {
    eyebrow: '7장의 동네 · LIFE DECK',
    titleBefore: '당신의 하루는 ',
    titleClear: '선명한가요',
    titleMiddle: ', 아직 ',
    titleHidden: '숨어 있나요?',
    intro:
      '내 생활을 잘 아는 사람과 아직 말로 설명하기 어려운 사람에게 서로 다른 일곱 장을 펼칩니다.',
    sharedEngine: '두 길은 마지막에 같은 공공임대·상권·공간 데이터 추천 엔진으로 이어집니다.',
    direct: '직접 선택',
    inferred: '직감 해석',
    choose: '한 장을 선택하면 의미가 공개됩니다.',
    chosen: '선택 완료. 이 장면을 당신의 하루에 기록했습니다.',
    back: '이전',
    next: '다음 장면',
    reveal: '생활 아르카나 공개',
    resultEyebrow: '당신의 생활 아르카나',
    resultTitle: '일곱 장에서 발견한 부산의 하루',
    secondary: '보조 성향',
    selectedScenes: '당신이 고른 일곱 장면',
    realityCta: '현실 조건 확인',
    realityEyebrow: '마지막 확인',
    realityTitle: '좋아하는 하루가 실제 집이 되려면',
    realityDescription:
      '카드가 발견한 취향에 예산·면적·목적지를 더합니다. 이 값은 실제 추천 API의 필수조건으로 사용됩니다.',
    budget: '예산',
    home: '집 조건',
    location: '생활권',
    depositMax: '보증금 상한(만원)',
    rentMax: '월 임대료 상한(만원)',
    minArea: '최소 면적',
    minRooms: '최소 방 수',
    district: '구·군',
    districtAll: '부산 전체',
    housingType: '임대 유형',
    housingTypeAll: '전체 유형',
    destination: '주요 목적지',
    destinationFrequency: '주당 방문',
    elevator: '승강기 필수',
    parking: '주차 필수',
    vehicle: '차량 보유',
    seeMatches: '내 부산 라이프 매치 보기',
    summarySignal: '카드에서 추천값으로 변환 완료',
    retake: '카드 다시 펼치기',
    adjust: '아래에서 세부 조건을 바꾸면 결과가 바로 다시 계산됩니다.',
    mustKeep: '반드시 지킬 조건',
    relaxFirst: '먼저 완화할 조건',
    times: '회',
  },
  en: {
    eyebrow: 'SEVEN NEIGHBORHOOD CARDS · LIFE DECK',
    titleBefore: 'Is your day ',
    titleClear: 'clear',
    titleMiddle: ', or still ',
    titleHidden: 'hidden?',
    intro:
      'Two paths help people who know their routine and people who cannot yet put their ideal day into words.',
    sharedEngine:
      'Both paths lead to the same public-housing, commercial-area, and spatial-data engine.',
    direct: 'Direct signals',
    inferred: 'Intuitive signals',
    choose: 'Choose a card to reveal what it means.',
    chosen: 'Selected. This scene is now part of your day.',
    back: 'Back',
    next: 'Next scene',
    reveal: 'Reveal my life arcana',
    resultEyebrow: 'YOUR LIFE ARCANA',
    resultTitle: 'The Busan day hidden in seven cards',
    secondary: 'Secondary pattern',
    selectedScenes: 'Your seven scenes',
    realityCta: 'Confirm real conditions',
    realityEyebrow: 'FINAL CHECK',
    realityTitle: 'Turn a day you love into a real home',
    realityDescription:
      'Add budget, area, and destination to the preferences discovered by the cards. These values become real API filters.',
    budget: 'Budget',
    home: 'Home',
    location: 'Area',
    depositMax: 'Max deposit (10k KRW)',
    rentMax: 'Max rent (10k KRW)',
    minArea: 'Minimum area',
    minRooms: 'Minimum rooms',
    district: 'District',
    districtAll: 'All Busan',
    housingType: 'Rental type',
    housingTypeAll: 'All types',
    destination: 'Frequent destination',
    destinationFrequency: 'Visits per week',
    elevator: 'Elevator required',
    parking: 'Parking required',
    vehicle: 'I own a car',
    seeMatches: 'See my Busan life matches',
    summarySignal: 'Cards translated into recommendation signals',
    retake: 'Retake the cards',
    adjust: 'Fine-tune any condition below and the results will recalculate.',
    mustKeep: 'Must keep',
    relaxFirst: 'Relax first',
    times: 'times',
  },
} as const;

type DeckStage = 'mode' | 'questions' | 'reveal' | 'reality';

function deckLocale(language: string): DeckLocale {
  return language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function DeckIcon({ icon, className }: { icon: DeckIconKey; className?: string }) {
  const Icon = ICONS[icon];
  return (
    <Icon
      aria-hidden
      className={className}
      strokeWidth={1.45}
    />
  );
}

function RealitySlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : min;
  return (
    <label className='block'>
      <span className='flex items-baseline justify-between gap-3'>
        <span className='text-sm font-semibold text-plum'>{label}</span>
        <span className='font-mono text-sm text-violet-dark'>
          {safeValue.toLocaleString()}
          {suffix}
        </span>
      </span>
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={(event) => onChange(event.target.value)}
        className='range mt-3'
      />
    </label>
  );
}

function RealitySection({
  title,
  highlighted,
  children,
}: {
  title: string;
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-3xl border bg-white p-5 transition-colors sm:p-6',
        highlighted ? 'border-violet/60 shadow-lg' : 'border-slate-light/30',
      )}
    >
      <h3 className='font-mono text-xs tracking-wide text-slate uppercase'>{title}</h3>
      <div className='mt-5 space-y-5'>{children}</div>
    </section>
  );
}

export function LifeDeck({
  initialProfile,
  onComplete,
}: {
  initialProfile: LifeProfile;
  onComplete: (result: LifeDeckResult, profile: LifeProfile) => void;
}) {
  const { i18n, t } = useTranslation();
  const locale = deckLocale(i18n.language);
  const copy = UI[locale];
  const [stage, setStage] = useState<DeckStage>('mode');
  const [mode, setMode] = useState<DeckMode | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<LifeProfile>(initialProfile);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const questions = useMemo(() => (mode ? getDeckQuestions(mode) : []), [mode]);
  const question = questions[questionIndex];
  const selectedId = question ? answers[question.id] : undefined;
  const result = useMemo(
    () =>
      mode && Object.keys(answers).length === 7 ? calculateLifeDeckResult(mode, answers) : null,
    [answers, mode],
  );

  useEffect(() => {
    if (stage === 'questions') headingRef.current?.focus({ preventScroll: true });
  }, [questionIndex, stage]);

  const chooseMode = (nextMode: DeckMode) => {
    setMode(nextMode);
    setQuestionIndex(0);
    setAnswers({});
    setStage('questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (stage === 'reality') {
      setStage('reveal');
    } else if (stage === 'reveal') {
      setStage('questions');
      setQuestionIndex(questions.length - 1);
    } else if (questionIndex === 0) {
      setStage('mode');
      setMode(null);
    } else {
      setQuestionIndex((index) => index - 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    if (!selectedId) return;
    if (questionIndex === questions.length - 1) {
      setStage('reveal');
    } else {
      setQuestionIndex((index) => index + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (stage === 'mode') {
    return (
      <div
        data-testid='life-deck-mode'
        className='relative isolate overflow-hidden px-4 py-12 sm:px-6 sm:py-16'
      >
        <div className='pointer-events-none absolute top-24 left-1/2 -z-10 size-[34rem] -translate-x-1/2 rounded-full bg-violet/5 blur-3xl' />
        <header className='mx-auto w-full max-w-3xl text-center'>
          <p className='font-mono text-xs tracking-wide text-violet uppercase'>{copy.eyebrow}</p>
          <h1 className='mt-5 text-3xl leading-tight font-extrabold tracking-tight text-plum sm:text-4xl'>
            {copy.titleBefore}
            <span className='text-violet'>{copy.titleClear}</span>
            {copy.titleMiddle}
            <span className='text-gold'>{copy.titleHidden}</span>
          </h1>
          <p className='mx-auto mt-5 w-full max-w-2xl text-sm leading-7 text-slate sm:text-base'>
            {copy.intro}
          </p>
        </header>

        <div className='mx-auto mt-10 flex w-full max-w-3xl snap-x snap-mandatory gap-4 overflow-x-auto px-[max(0px,calc((100vw-64px)*0.04))] pb-5 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0'>
          {(['routine', 'intuition'] as const).map((choice, index) => {
            const modeCopy = MODE_COPY[choice];
            const dark = choice === 'intuition';
            return (
              <motion.button
                key={choice}
                data-testid={`${choice}-mode`}
                type='button'
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.35 }}
                whileHover={{ y: -5 }}
                onClick={() => chooseMode(choice)}
                className={cn(
                  'group flex min-h-[430px] w-[82vw] shrink-0 snap-center flex-col rounded-3xl border p-7 text-left shadow-sm transition-shadow sm:w-auto sm:p-9',
                  dark
                    ? 'border-plum-light bg-plum text-lilac hover:shadow-lg'
                    : 'border-slate-light/30 bg-white text-plum hover:shadow-lg',
                )}
              >
                <div className='flex w-full items-center justify-between font-mono text-xs tracking-wide uppercase opacity-65'>
                  <span>PATH 0{index + 1}</span>
                  <span>07 CARDS</span>
                </div>
                <div
                  className={cn(
                    'mt-12 flex size-24 items-center justify-center rounded-full border sm:mt-16 sm:size-28',
                    dark
                      ? 'border-lilac/20 bg-lilac/10 text-gold'
                      : 'border-violet/20 bg-violet/10 text-violet',
                  )}
                >
                  <DeckIcon
                    icon={modeCopy.icon}
                    className='size-12 sm:size-14'
                  />
                </div>
                <div className='mt-auto pt-12'>
                  <p
                    className={cn('text-xs font-semibold', dark ? 'text-gold' : 'text-violet-dark')}
                  >
                    {localize(modeCopy.eyebrow, locale)}
                  </p>
                  <h2 className='mt-2 text-3xl font-extrabold tracking-tight'>
                    {localize(modeCopy.title, locale)}
                  </h2>
                  <p
                    className={cn('mt-3 text-sm leading-6', dark ? 'text-lilac/70' : 'text-slate')}
                  >
                    {localize(modeCopy.description, locale)}
                  </p>
                  <span className='mt-6 flex items-center gap-2 text-sm font-bold'>
                    {localize(modeCopy.cta, locale)}
                    <ArrowRight className='size-4 transition-transform group-hover:translate-x-1' />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        <p className='mx-auto mt-5 flex w-full max-w-2xl items-start justify-center gap-2 text-center text-xs leading-5 text-slate'>
          <Sparkles
            aria-hidden
            className='mt-0.5 size-4 shrink-0 text-gold'
          />
          {copy.sharedEngine}
        </p>
      </div>
    );
  }

  if (stage === 'questions' && mode && question) {
    const progress = ((questionIndex + 1) / questions.length) * 100;
    return (
      <div
        data-testid='life-deck-question'
        className='px-4 py-8 sm:px-6 sm:py-12'
      >
        <div className='mx-auto w-full max-w-3xl'>
          <div className='grid grid-cols-[auto_1fr_auto] items-center gap-3'>
            <span className='font-mono text-xs text-slate'>
              {String(questionIndex + 1).padStart(2, '0')} / 07
            </span>
            <div
              role='progressbar'
              aria-valuemin={1}
              aria-valuemax={7}
              aria-valuenow={questionIndex + 1}
              className='h-1.5 overflow-hidden rounded-full bg-lilac-dim'
            >
              <motion.div
                className='h-full rounded-full bg-violet'
                animate={{ width: `${progress}%` }}
              />
            </div>
            <span className='hidden font-mono text-xs tracking-wide text-slate uppercase sm:block'>
              {mode === 'routine' ? copy.direct : copy.inferred}
            </span>
          </div>

          <header className='mx-auto mt-10 w-full max-w-3xl text-center'>
            <span
              className={cn(
                'inline-flex rounded-full px-3 py-1 font-mono text-xs tracking-wide uppercase',
                mode === 'routine' ? 'bg-violet/10 text-violet-dark' : 'bg-plum text-lilac',
              )}
            >
              {localize(MODE_COPY[mode].title, locale)} ·{' '}
              {mode === 'routine' ? copy.direct : copy.inferred}
            </span>
            <p className='mt-5 font-mono text-xs tracking-wide text-gold uppercase'>
              {localize(question.kicker, locale)}
            </p>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className='mt-3 text-3xl leading-tight font-extrabold tracking-tight text-plum outline-none sm:text-4xl'
            >
              {localize(question.title, locale)}
            </h2>
            <p className='mx-auto mt-4 w-full max-w-2xl text-sm leading-6 text-slate'>
              {localize(question.description, locale)}
            </p>
          </header>

          {/*
            A hand of cards, not a grid of tiles. Inside the report's 3xl
            measure four across lands at ~170px each, which keeps the portrait
            proportion a card needs; below lg it falls back to a swipeable rail
            rather than squaring the cards off.
          */}
          <div className='mt-9 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0'>
            {question.options.map((option, index) => {
              const selected = selectedId === option.id;
              const muted = Boolean(selectedId && !selected);
              return (
                <motion.button
                  key={option.id}
                  data-testid={`deck-option-${option.id}`}
                  type='button'
                  aria-pressed={selected}
                  onClick={() =>
                    setAnswers((current) => ({ ...current, [question.id]: option.id }))
                  }
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: muted ? 0.5 : 1, y: selected ? -6 : 0 }}
                  transition={{ delay: index * 0.035, duration: 0.24 }}
                  className={cn(
                    'relative flex w-[62vw] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border p-4 text-left transition-colors sm:w-auto',
                    'aspect-[5/7] sm:aspect-auto sm:min-h-80',
                    selected
                      ? 'border-plum bg-plum text-lilac shadow-lg'
                      : 'border-slate-light/30 bg-white text-plum hover:border-violet/40',
                  )}
                >
                  <span className='flex items-center justify-between font-mono text-xs tracking-wide uppercase opacity-60'>
                    <span>
                      {String(questionIndex + 1).padStart(2, '0')} ·{' '}
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {selected ? (
                      <Check className='size-4 text-gold' />
                    ) : (
                      <Sparkles className='size-3' />
                    )}
                  </span>
                  <div
                    className={cn(
                      'mt-5 flex size-14 items-center justify-center rounded-full border',
                      selected
                        ? 'border-lilac/15 bg-lilac/10 text-gold'
                        : 'border-violet/20 bg-violet/5 text-violet',
                    )}
                  >
                    <DeckIcon
                      icon={option.icon}
                      className='size-7'
                    />
                  </div>
                  {/*
                    Both faces stay mounted and stacked in one grid cell, so the
                    card is always as tall as the taller of the two. Swapping
                    them on select would resize the card (the meaning copy runs
                    longer than the caption and adds chips), and since these are
                    grid items that resize propagates to the whole row.
                  */}
                  <div className='mt-auto grid pt-6'>
                    <motion.div
                      aria-hidden={!selected}
                      animate={{ opacity: selected ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                      className='col-start-1 row-start-1'
                    >
                      <p className='text-base leading-snug font-bold'>
                        {localize(option.title, locale)}
                      </p>
                      <p className='mt-1.5 text-xs leading-5 text-lilac/70'>
                        {localize(option.meaning, locale)}
                      </p>
                      <div className='mt-3 flex flex-wrap gap-1.5'>
                        {option.chips.map((chip) => (
                          <span
                            key={localize(chip, locale)}
                            className='rounded-full border border-lilac/15 px-2.5 py-1 font-mono text-xs text-lilac/80'
                          >
                            {localize(chip, locale)}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                    <motion.div
                      aria-hidden={selected}
                      animate={{ opacity: selected ? 0 : 1 }}
                      transition={{ duration: 0.2 }}
                      className='col-start-1 row-start-1'
                    >
                      <h3 className='text-base leading-snug font-bold'>
                        {localize(option.title, locale)}
                      </h3>
                      <p className='mt-1.5 text-xs leading-5 text-slate'>
                        {localize(option.caption, locale)}
                      </p>
                    </motion.div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className='mt-7 grid items-center gap-4 sm:grid-cols-[auto_1fr_auto]'>
            <button
              type='button'
              onClick={goBack}
              className='flex items-center justify-center gap-2 rounded-full border border-slate-light/30 bg-white px-5 py-2.5 text-sm font-semibold text-plum hover:border-violet/40'
            >
              <ArrowLeft className='size-4' />
              {copy.back}
            </button>
            <p className='text-center text-xs text-slate'>
              {selectedId ? copy.chosen : copy.choose}
            </p>
            <button
              data-testid='deck-next'
              type='button'
              disabled={!selectedId}
              onClick={goNext}
              className='flex items-center justify-center gap-2 rounded-full bg-violet px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-violet-dark disabled:pointer-events-none disabled:opacity-35'
            >
              {questionIndex === questions.length - 1 ? copy.reveal : copy.next}
              <ArrowRight className='size-4' />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'reveal' && mode && result) {
    const archetype = getArchetype(result.archetypeId);
    const secondary = getArchetype(result.secondaryArchetypeId);
    const answerTitles = questions.flatMap((item) => {
      const option = getAnswerOption(mode, item.id, result.answers[item.id]);
      return option ? [localize(option.title, locale)] : [];
    });
    return (
      <div
        data-testid='life-deck-reveal'
        className='px-4 py-10 sm:px-6 sm:py-14'
      >
        <header className='mx-auto w-full max-w-3xl text-center'>
          <p className='font-mono text-xs tracking-wide text-violet uppercase'>
            {copy.resultEyebrow}
          </p>
          <h2 className='mt-4 text-3xl font-extrabold tracking-tight text-plum sm:text-4xl'>
            {copy.resultTitle}
          </h2>
        </header>

        <div className='mx-auto mt-10 grid w-full max-w-3xl gap-5'>
          <motion.article
            initial={{ opacity: 0, rotateY: -12, y: 18 }}
            animate={{ opacity: 1, rotateY: 0, y: 0 }}
            className='flex min-h-[440px] flex-col rounded-3xl border border-plum-light bg-plum p-8 text-lilac shadow-lg'
          >
            <div className='flex justify-between font-mono text-xs tracking-wide uppercase opacity-55'>
              <span>MAJOR ARCANA · VII</span>
              <span>하루.</span>
            </div>
            <div className='mt-12 flex size-28 items-center justify-center rounded-full border border-lilac/15 bg-lilac/5 text-gold'>
              <DeckIcon
                icon={archetype.icon}
                className='size-14'
              />
            </div>
            <div className='mt-auto pt-12'>
              <h3 className='text-3xl font-extrabold tracking-tight'>
                {localize(archetype.name, locale)}
              </h3>
              <p className='mt-1 font-mono text-xs tracking-wide text-gold'>{archetype.english}</p>
              <p className='mt-5 text-sm leading-7 text-lilac/70'>
                {localize(archetype.description, locale)}
              </p>
              <p className='mt-5 text-xs text-lilac/60'>
                {copy.secondary}{' '}
                <strong className='text-gold'>{localize(secondary.name, locale)}</strong> ·{' '}
                {result.secondaryPercent}%
              </p>
            </div>
          </motion.article>

          <div className='rounded-3xl border border-slate-light/30 bg-white p-6 sm:p-8'>
            <div className='flex items-start gap-3 rounded-2xl bg-lilac p-4'>
              <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-violet text-white'>
                {mode === 'routine' ? (
                  <Check className='size-4' />
                ) : (
                  <Sparkles className='size-4' />
                )}
              </span>
              <div>
                <strong className='text-sm text-plum'>
                  {localize(MODE_COPY[mode].title, locale)} ·{' '}
                  {mode === 'routine' ? copy.direct : copy.inferred}
                </strong>
                <p className='mt-1 text-xs leading-5 text-slate'>{copy.summarySignal}</p>
              </div>
            </div>

            <div className='mt-7 space-y-4'>
              {(['fun', 'work', 'rest'] as const).map((key) => (
                <div
                  key={key}
                  className='grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3'
                >
                  <span className='font-mono text-xs text-slate uppercase'>{key}</span>
                  <span className='h-1.5 overflow-hidden rounded-full bg-lilac-dim'>
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{ width: `${result.lifeStats[key]}%` }}
                      className={cn(
                        'block h-full rounded-full',
                        key === 'fun' ? 'bg-gold' : key === 'work' ? 'bg-violet' : 'bg-plum-light',
                      )}
                    />
                  </span>
                  <strong className='text-right font-mono text-sm text-plum'>
                    {result.lifeStats[key]}
                  </strong>
                </div>
              ))}
            </div>

            <section className='mt-8 border-t border-slate-light/20 pt-6'>
              <h4 className='font-mono text-xs tracking-wide text-slate uppercase'>
                {copy.selectedScenes}
              </h4>
              <div className='mt-3 flex flex-wrap gap-2'>
                {answerTitles.map((title) => (
                  <span
                    key={title}
                    className='rounded-full border border-slate-light/30 bg-lilac px-3 py-1.5 text-xs text-plum'
                  >
                    {title}
                  </span>
                ))}
              </div>
            </section>

            <div className='mt-8 flex flex-col gap-2 sm:flex-row sm:justify-between'>
              <button
                type='button'
                onClick={goBack}
                className='flex items-center justify-center gap-2 rounded-full border border-slate-light/30 px-5 py-2.5 text-sm font-semibold text-plum'
              >
                <ArrowLeft className='size-4' />
                {copy.back}
              </button>
              <button
                data-testid='deck-reality'
                type='button'
                onClick={() => {
                  setStage('reality');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className='flex items-center justify-center gap-2 rounded-full bg-violet px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-dark'
              >
                {copy.realityCta}
                <ArrowRight className='size-4' />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'reality' && result) {
    const setProfileValue = <K extends keyof LifeProfile>(key: K, value: LifeProfile[K]) =>
      setProfile((current) => ({ ...current, [key]: value }));
    return (
      <div
        data-testid='life-deck-reality'
        className='px-4 py-10 sm:px-6 sm:py-14'
      >
        <header className='mx-auto w-full max-w-3xl text-center'>
          <p className='font-mono text-xs tracking-wide text-violet uppercase'>
            {copy.realityEyebrow}
          </p>
          <h2 className='mt-4 text-3xl font-extrabold tracking-tight text-plum sm:text-4xl'>
            {copy.realityTitle}
          </h2>
          <p className='mx-auto mt-4 w-full max-w-2xl text-sm leading-6 text-slate'>
            {copy.realityDescription}
          </p>
        </header>

        <div className='mx-auto mt-9 grid w-full max-w-3xl gap-4'>
          <RealitySection
            title={copy.budget}
            highlighted={result.mustKeepId === 'budget'}
          >
            <RealitySlider
              label={copy.depositMax}
              value={profile.depositMaxManwon}
              min={500}
              max={10000}
              step={100}
              onChange={(value) => setProfileValue('depositMaxManwon', value)}
            />
            <RealitySlider
              label={copy.rentMax}
              value={profile.rentMaxManwon}
              min={5}
              max={100}
              step={1}
              onChange={(value) => setProfileValue('rentMaxManwon', value)}
            />
          </RealitySection>

          <RealitySection
            title={copy.home}
            highlighted={result.mustKeepId === 'enough-space' || result.mustKeepId === 'quiet-home'}
          >
            <RealitySlider
              label={copy.minArea}
              value={profile.minAreaM2}
              min={10}
              max={85}
              step={1}
              suffix='㎡'
              onChange={(value) => setProfileValue('minAreaM2', value)}
            />
            <RealitySlider
              label={copy.minRooms}
              value={profile.minRoomCount}
              min={1}
              max={5}
              step={1}
              onChange={(value) => setProfileValue('minRoomCount', value)}
            />
            <div className='flex flex-wrap gap-2'>
              {(
                [
                  ['elevatorRequired', copy.elevator],
                  ['parkingRequired', copy.parking],
                  ['hasVehicle', copy.vehicle],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type='button'
                  aria-pressed={profile[key]}
                  onClick={() => setProfileValue(key, !profile[key])}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    profile[key]
                      ? 'border-violet/40 bg-violet/10 text-violet-dark'
                      : 'border-slate-light/30 text-slate',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </RealitySection>

          <RealitySection
            title={copy.location}
            highlighted={result.mustKeepId === 'short-commute'}
          >
            <label className='block'>
              <span className='mb-2 block text-sm font-semibold text-plum'>{copy.district}</span>
              <Select
                ariaLabel={copy.district}
                value={profile.district}
                onChange={(value) => setProfileValue('district', value)}
                options={[
                  { value: '', label: copy.districtAll },
                  ...DISTRICTS.map((district) => ({
                    value: district,
                    label: t(`districts.${district}`),
                  })),
                ]}
              />
            </label>
            <label className='block'>
              <span className='mb-2 block text-sm font-semibold text-plum'>{copy.housingType}</span>
              <Select
                ariaLabel={copy.housingType}
                value={profile.type}
                onChange={(value) => setProfileValue('type', value as LifeProfile['type'])}
                options={[
                  { value: '', label: copy.housingTypeAll },
                  ...HOUSING_TYPE_VALUES.map((type) => ({
                    value: type,
                    label: t(`housingType.${type}`),
                  })),
                ]}
              />
            </label>
            <label className='block'>
              <span className='mb-2 block text-sm font-semibold text-plum'>{copy.destination}</span>
              <Select
                ariaLabel={copy.destination}
                value={profile.destinationId}
                onChange={(value) => setProfileValue('destinationId', value)}
                options={Object.keys(DESTINATIONS).map((id) => ({
                  value: id,
                  label: t(`lifeMatch.destinationOptions.${id as DestinationId}`),
                }))}
              />
            </label>
            <RealitySlider
              label={copy.destinationFrequency}
              value={profile.destinationFrequency}
              min={0}
              max={7}
              step={1}
              suffix={` ${copy.times}`}
              onChange={(value) => setProfileValue('destinationFrequency', value)}
            />
          </RealitySection>
        </div>

        <div className='mx-auto mt-7 flex w-full max-w-3xl flex-col-reverse gap-2 sm:flex-row sm:justify-between'>
          <button
            type='button'
            onClick={goBack}
            className='flex items-center justify-center gap-2 rounded-full border border-slate-light/30 bg-white px-5 py-3 text-sm font-semibold text-plum'
          >
            <ArrowLeft className='size-4' />
            {copy.back}
          </button>
          <button
            data-testid='deck-see-matches'
            type='button'
            onClick={() => onComplete(result, profile)}
            className='flex items-center justify-center gap-2 rounded-full bg-violet px-7 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-dark'
          >
            {copy.seeMatches}
            <ArrowRight className='size-4' />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export function LifeDeckSummary({
  result,
  onRetake,
}: {
  result: LifeDeckResult;
  onRetake: () => void;
}) {
  const { i18n } = useTranslation();
  const locale = deckLocale(i18n.language);
  const copy = UI[locale];
  const archetype = getArchetype(result.archetypeId);
  const mustKeep = getAnswerOption(result.mode, 'must-have', result.mustKeepId);
  const relaxFirst = getAnswerOption(result.mode, 'reverse', result.relaxFirstId);

  return (
    <section
      data-testid='life-deck-summary'
      className='overflow-hidden rounded-3xl border border-plum-light bg-plum text-lilac shadow-lg'
    >
      {/*
        Stacked rather than three columns: inside the report's measure the old
        right-hand column squeezed the retake button, and its "adjust below"
        note now duplicates the hint the conditions section carries.
      */}
      <div className='p-6 sm:p-7'>
        <div className='flex items-start justify-between gap-4'>
          <p className='font-mono text-xs tracking-wide text-gold uppercase'>
            {copy.resultEyebrow}
          </p>
          <button
            type='button'
            onClick={onRetake}
            className='inline-flex shrink-0 items-center gap-2 rounded-full border border-lilac/20 px-4 py-2 text-xs font-bold text-lilac transition-colors hover:bg-lilac/10'
          >
            <RotateCcw className='size-3.5' />
            {copy.retake}
          </button>
        </div>

        <div className='mt-4 flex items-center gap-4'>
          <div className='flex size-14 shrink-0 items-center justify-center rounded-full border border-lilac/15 bg-lilac/5 text-gold'>
            <DeckIcon
              icon={archetype.icon}
              className='size-7'
            />
          </div>
          <div className='min-w-0'>
            <h2 className='truncate text-2xl font-extrabold tracking-tight'>
              {localize(archetype.name, locale)}
            </h2>
            <p className='font-mono text-xs tracking-wide text-gold'>{archetype.english}</p>
          </div>
        </div>

        <p className='mt-4 text-sm leading-6 text-lilac/60'>
          {localize(archetype.description, locale)}
        </p>

        <div className='mt-4 flex flex-wrap gap-2 text-xs'>
          <span className='rounded-full border border-lilac/15 px-3 py-1.5 text-lilac/75'>
            {copy.mustKeep} · {mustKeep ? localize(mustKeep.title, locale) : '-'}
          </span>
          <span className='rounded-full border border-lilac/15 px-3 py-1.5 text-lilac/75'>
            {copy.relaxFirst} · {relaxFirst ? localize(relaxFirst.title, locale) : '-'}
          </span>
        </div>
      </div>
    </section>
  );
}
