import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HOUSING_TYPES } from '@/components/explore/explore-state';
import { Chip } from '@/components/ui/controls';
import { PressableScale } from '@/components/ui/press';
import { SliderRow } from '@/components/ui/slider';
import { Txt } from '@/components/ui/txt';
import { deckIcon } from '@/constants/deck-icons';
import { DISTRICTS } from '@/constants/districts';
import {
  Colors,
  FloatingShadow,
  FontFamily,
  FontSize,
  MONO,
  Radius,
  Spacing,
  Tint,
} from '@/constants/theme';
import { DECK_UI, deckLocale, type DeckCopy } from '@/features/life-match/deck-copy';
import {
  MODE_COPY,
  calculateLifeDeckResult,
  getAnswerOption,
  getArchetype,
  getDeckQuestions,
  localize,
  type DeckIconKey,
  type DeckLocale,
  type DeckMode,
  type DeckQuestion,
  type LifeDeckResult,
} from '@/features/life-match/deck-model';
import { DESTINATION_IDS, type LifeProfile } from '@/features/life-match/model';

type DeckStage = 'mode' | 'questions' | 'reveal' | 'reality';

const CARD_WIDTH = 236;
const CARD_GAP = Spacing.md;
// Selecting a card swaps its caption for the longer meaning copy and adds two
// trait chips. A row of cards stretches to its tallest item, so an intrinsic
// height would resize every sibling on every tap: the hand is fixed instead,
// sized for the longest option in the deck.
const CARD_HEIGHT = 300;
const STAT_COLORS = { fun: Colors.gold, work: Colors.violet, rest: Colors.plumLight } as const;

function Glyph({
  icon,
  size,
  dark,
}: {
  icon: DeckIconKey;
  size: number;
  dark?: boolean;
}) {
  return (
    <View style={[styles.glyph, { width: size, height: size }, dark && styles.glyphDark]}>
      <Ionicons
        name={deckIcon(icon)}
        size={Math.round(size * 0.44)}
        color={dark ? Colors.gold : Colors.violet}
      />
    </View>
  );
}

function NavRow({
  backLabel,
  onBack,
  nextLabel,
  onNext,
  nextDisabled,
}: {
  backLabel: string;
  onBack: () => void;
  nextLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <View style={styles.navRow}>
      <PressableScale onPress={onBack} style={styles.backButton} accessibilityRole="button">
        <Ionicons name="arrow-back" size={16} color={Colors.plum} />
        <Txt style={styles.backLabel}>{backLabel}</Txt>
      </PressableScale>
      <PressableScale
        haptic
        onPress={nextDisabled ? undefined : onNext}
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(nextDisabled) }}
        style={[styles.nextButton, nextDisabled && styles.nextDisabled]}
      >
        <Txt style={styles.nextLabel}>{nextLabel}</Txt>
        <Ionicons name="arrow-forward" size={16} color={Colors.white} />
      </PressableScale>
    </View>
  );
}

function ModeStage({
  copy,
  locale,
  onChoose,
}: {
  copy: DeckCopy;
  locale: DeckLocale;
  onChoose: (mode: DeckMode) => void;
}) {
  return (
    <View style={styles.stage}>
      <Txt variant="eyebrow" style={{ color: Colors.violet }}>
        {copy.eyebrow}
      </Txt>
      <Txt variant="title" style={styles.heroTitle}>
        {copy.titleBefore}
        <Txt variant="title" style={{ color: Colors.violet }}>
          {copy.titleClear}
        </Txt>
        {copy.titleMiddle}
        <Txt variant="title" style={{ color: Colors.gold }}>
          {copy.titleHidden}
        </Txt>
      </Txt>
      <Txt variant="body" color="slate">
        {copy.intro}
      </Txt>

      {(['routine', 'intuition'] as const).map((choice, index) => {
        const modeCopy = MODE_COPY[choice];
        const dark = choice === 'intuition';
        return (
          <PressableScale
            key={choice}
            haptic
            onPress={() => onChoose(choice)}
            accessibilityRole="button"
            style={[styles.pathCard, dark && styles.pathCardDark]}
          >
            <View style={styles.pathHead}>
              <Txt style={[styles.pathMeta, dark && { color: Tint.onDarkText }]}>
                {`PATH 0${index + 1}`}
              </Txt>
              <Txt style={[styles.pathMeta, dark && { color: Tint.onDarkText }]}>{copy.cards}</Txt>
            </View>
            <Glyph icon={modeCopy.icon} size={72} dark={dark} />
            <Txt style={[styles.pathEyebrow, dark && { color: Colors.gold }]}>
              {localize(modeCopy.eyebrow, locale)}
            </Txt>
            <Txt variant="heading" style={[styles.pathTitle, dark && { color: Colors.lilac }]}>
              {localize(modeCopy.title, locale)}
            </Txt>
            <Txt style={[styles.pathText, dark && { color: Tint.onDarkText }]}>
              {localize(modeCopy.description, locale)}
            </Txt>
            <View style={styles.pathCta}>
              <Txt style={[styles.pathCtaLabel, dark && { color: Colors.lilac }]}>
                {localize(modeCopy.cta, locale)}
              </Txt>
              <Ionicons
                name="arrow-forward"
                size={15}
                color={dark ? Colors.lilac : Colors.violetDark}
              />
            </View>
          </PressableScale>
        );
      })}

      <View style={styles.sharedNote}>
        <Ionicons name="sparkles" size={14} color={Colors.gold} />
        <Txt variant="caption" style={styles.sharedNoteText}>
          {copy.sharedEngine}
        </Txt>
      </View>
    </View>
  );
}

function QuestionStage({
  copy,
  locale,
  mode,
  question,
  index,
  total,
  selectedId,
  onSelect,
  onBack,
  onNext,
}: {
  copy: DeckCopy;
  locale: DeckLocale;
  mode: DeckMode;
  question: DeckQuestion;
  index: number;
  total: number;
  selectedId: string | undefined;
  onSelect: (optionId: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.stage}>
      <View style={styles.progressRow}>
        <Txt variant="mono" style={styles.progressCount}>
          {`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`}
        </Txt>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${((index + 1) / total) * 100}%` }]} />
        </View>
        <Txt variant="eyebrow">{mode === 'routine' ? copy.direct : copy.inferred}</Txt>
      </View>

      <Txt style={styles.kicker}>{localize(question.kicker, locale)}</Txt>
      <Txt variant="title" style={styles.questionTitle}>
        {localize(question.title, locale)}
      </Txt>
      <Txt variant="body" color="slate">
        {localize(question.description, locale)}
      </Txt>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        style={styles.rail}
        contentContainerStyle={styles.railContent}
      >
        {question.options.map((option, cardIndex) => {
          const selected = selectedId === option.id;
          return (
            <PressableScale
              key={option.id}
              haptic
              onPress={() => onSelect(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={styles.cardHead}>
                <Txt style={[styles.cardIndex, selected && { color: Tint.onDarkText }]}>
                  {`${String(index + 1).padStart(2, '0')} · ${String(cardIndex + 1).padStart(2, '0')}`}
                </Txt>
                <Ionicons
                  name={selected ? 'checkmark' : 'sparkles-outline'}
                  size={14}
                  color={selected ? Colors.gold : Colors.slateLight}
                />
              </View>

              <Glyph icon={option.icon} size={56} dark={selected} />

              <View style={styles.cardBody}>
                <Txt
                  numberOfLines={2}
                  style={[styles.cardTitle, selected && { color: Colors.lilac }]}
                >
                  {localize(option.title, locale)}
                </Txt>
                <Txt
                  numberOfLines={3}
                  style={[styles.cardText, selected && { color: Tint.onDarkText }]}
                >
                  {localize(selected ? option.meaning : option.caption, locale)}
                </Txt>
                {selected ? (
                  <View style={styles.cardChips}>
                    {option.chips.map((chip) => (
                      <View key={localize(chip, locale)} style={styles.cardChip}>
                        <Txt style={styles.cardChipText}>{localize(chip, locale)}</Txt>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      <Txt variant="caption" style={styles.hint}>
        {selectedId ? copy.chosen : copy.choose}
      </Txt>
      <NavRow
        backLabel={copy.back}
        onBack={onBack}
        nextLabel={index === total - 1 ? copy.reveal : copy.next}
        onNext={onNext}
        nextDisabled={!selectedId}
      />
    </View>
  );
}

function RevealStage({
  copy,
  locale,
  mode,
  result,
  questions,
  onBack,
  onNext,
}: {
  copy: DeckCopy;
  locale: DeckLocale;
  mode: DeckMode;
  result: LifeDeckResult;
  questions: DeckQuestion[];
  onBack: () => void;
  onNext: () => void;
}) {
  const archetype = getArchetype(result.archetypeId);
  const secondary = getArchetype(result.secondaryArchetypeId);
  const scenes = questions.flatMap((item) => {
    const option = getAnswerOption(mode, item.id, result.answers[item.id]);
    return option ? [localize(option.title, locale)] : [];
  });

  return (
    <View style={styles.stage}>
      <Txt variant="eyebrow" style={{ color: Colors.violet }}>
        {copy.resultEyebrow}
      </Txt>
      <Txt variant="title">{copy.resultTitle}</Txt>

      <View style={styles.arcana}>
        <View style={styles.arcanaHead}>
          <Txt style={styles.arcanaMeta}>MAJOR ARCANA · VII</Txt>
          <Txt style={styles.arcanaMeta}>하루.</Txt>
        </View>
        <Glyph icon={archetype.icon} size={84} dark />
        <Txt variant="title" style={styles.arcanaName}>
          {localize(archetype.name, locale)}
        </Txt>
        <Txt style={styles.arcanaEnglish}>{archetype.english}</Txt>
        <Txt style={styles.arcanaText}>{localize(archetype.description, locale)}</Txt>
        <Txt style={styles.arcanaSecondary}>
          {`${copy.secondary} · ${localize(secondary.name, locale)} · ${result.secondaryPercent}%`}
        </Txt>
      </View>

      <View style={styles.signalCard}>
        <View style={styles.signalHead}>
          <View style={styles.signalBadge}>
            <Ionicons
              name={mode === 'routine' ? 'checkmark' : 'sparkles'}
              size={15}
              color={Colors.white}
            />
          </View>
          <View style={styles.signalCopy}>
            <Txt variant="subheading">
              {`${localize(MODE_COPY[mode].title, locale)} · ${
                mode === 'routine' ? copy.direct : copy.inferred
              }`}
            </Txt>
            <Txt variant="caption">{copy.summarySignal}</Txt>
          </View>
        </View>

        <View style={styles.axes}>
          {(['fun', 'work', 'rest'] as const).map((key) => (
            <View key={key} style={styles.axis}>
              <Txt variant="eyebrow" style={styles.axisLabel}>
                {key}
              </Txt>
              <View style={styles.axisTrack}>
                <View
                  style={[
                    styles.axisFill,
                    { width: `${result.lifeStats[key]}%`, backgroundColor: STAT_COLORS[key] },
                  ]}
                />
              </View>
              <Txt variant="mono" style={styles.axisValue}>
                {result.lifeStats[key]}
              </Txt>
            </View>
          ))}
        </View>

        <Txt variant="eyebrow" style={styles.scenesLabel}>
          {copy.selectedScenes}
        </Txt>
        <View style={styles.scenes}>
          {scenes.map((scene) => (
            <View key={scene} style={styles.scene}>
              <Txt style={styles.sceneText}>{scene}</Txt>
            </View>
          ))}
        </View>
      </View>

      <NavRow
        backLabel={copy.back}
        onBack={onBack}
        nextLabel={copy.realityCta}
        onNext={onNext}
      />
    </View>
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
    <View style={[styles.realityCard, highlighted && styles.realityCardOn]}>
      <Txt variant="eyebrow">{title}</Txt>
      <View style={styles.realityBody}>{children}</View>
    </View>
  );
}

function RealityStage({
  copy,
  result,
  profile,
  onProfileChange,
  onBack,
  onComplete,
}: {
  copy: DeckCopy;
  result: LifeDeckResult;
  profile: LifeProfile;
  onProfileChange: (profile: LifeProfile) => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  const { t } = useTranslation();
  const set = <K extends keyof LifeProfile>(key: K, value: LifeProfile[K]) =>
    onProfileChange({ ...profile, [key]: value });

  const toggles: [keyof LifeProfile, string][] = [
    ['elevatorRequired', copy.elevator],
    ['parkingRequired', copy.parking],
    ['hasVehicle', copy.vehicle],
  ];

  return (
    <View style={styles.stage}>
      <Txt variant="eyebrow" style={{ color: Colors.violet }}>
        {copy.realityEyebrow}
      </Txt>
      <Txt variant="title">{copy.realityTitle}</Txt>
      <Txt variant="body" color="slate">
        {copy.realityDescription}
      </Txt>

      <RealitySection title={copy.budget} highlighted={result.mustKeepId === 'budget'}>
        <SliderRow
          label={copy.depositMax}
          min={500}
          max={10000}
          step={100}
          value={profile.depositMaxManwon}
          display={profile.depositMaxManwon.toLocaleString('ko-KR')}
          onChange={(value) => set('depositMaxManwon', value)}
        />
        <SliderRow
          label={copy.rentMax}
          min={5}
          max={100}
          step={1}
          value={profile.rentMaxManwon}
          onChange={(value) => set('rentMaxManwon', value)}
        />
      </RealitySection>

      <RealitySection
        title={copy.home}
        highlighted={result.mustKeepId === 'enough-space' || result.mustKeepId === 'quiet-home'}
      >
        <SliderRow
          label={copy.minArea}
          min={10}
          max={85}
          step={1}
          value={profile.minAreaM2}
          display={t('units.area', { value: profile.minAreaM2 })}
          onChange={(value) => set('minAreaM2', value)}
        />
        <SliderRow
          label={copy.minRooms}
          min={1}
          max={5}
          step={1}
          value={profile.minRoomCount}
          onChange={(value) => set('minRoomCount', value)}
        />
        <View style={styles.wrap}>
          {toggles.map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              selected={Boolean(profile[key])}
              onPress={() => set(key, !profile[key] as never)}
            />
          ))}
        </View>
      </RealitySection>

      <RealitySection title={copy.location} highlighted={result.mustKeepId === 'short-commute'}>
        <View style={styles.field}>
          <Txt variant="label" style={{ color: Colors.plum }}>
            {copy.district}
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Chip
              label={copy.districtAll}
              selected={!profile.district}
              onPress={() => set('district', '')}
            />
            {DISTRICTS.map((district) => (
              <Chip
                key={district}
                label={t(`districts.${district}`)}
                selected={profile.district === district}
                onPress={() => set('district', district)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Txt variant="label" style={{ color: Colors.plum }}>
            {copy.housingType}
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Chip
              label={copy.housingTypeAll}
              selected={!profile.type}
              onPress={() => set('type', '')}
            />
            {HOUSING_TYPES.map((type) => (
              <Chip
                key={type}
                label={t(`housingType.${type}`)}
                selected={profile.type === type}
                onPress={() => set('type', type)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Txt variant="label" style={{ color: Colors.plum }}>
            {copy.destination}
          </Txt>
          <View style={styles.wrap}>
            {DESTINATION_IDS.map((id) => (
              <Chip
                key={id}
                label={t(`lifeMatch.destinationOptions.${id}`)}
                selected={profile.destinationId === id}
                onPress={() => set('destinationId', id)}
              />
            ))}
          </View>
        </View>

        <SliderRow
          label={copy.destinationFrequency}
          min={0}
          max={7}
          step={1}
          value={profile.destinationFrequency}
          display={t('lifeMatch.perWeek', { value: profile.destinationFrequency })}
          onChange={(value) => set('destinationFrequency', value)}
        />
      </RealitySection>

      <NavRow
        backLabel={copy.back}
        onBack={onBack}
        nextLabel={copy.seeMatches}
        onNext={onComplete}
      />
    </View>
  );
}

/**
 * The discovery half of Life Match: two paths of seven cards that end in a
 * life archetype plus the hard filters the recommendation API needs. Both
 * paths feed the same engine, so the stage machine is shared.
 */
export function LifeDeck({
  initialProfile,
  onComplete,
}: {
  initialProfile: LifeProfile;
  onComplete: (result: LifeDeckResult, profile: LifeProfile) => void;
}) {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = deckLocale(i18n.language);
  const copy = DECK_UI[locale];
  const scrollRef = useRef<ScrollView>(null);
  const [stage, setStage] = useState<DeckStage>('mode');
  const [mode, setMode] = useState<DeckMode | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<LifeProfile>(initialProfile);

  const questions = useMemo(() => (mode ? getDeckQuestions(mode) : []), [mode]);
  const question = questions[questionIndex];
  const selectedId = question ? answers[question.id] : undefined;
  const result = useMemo(
    () =>
      mode && Object.keys(answers).length === questions.length && questions.length > 0
        ? calculateLifeDeckResult(mode, answers)
        : null,
    [answers, mode, questions.length],
  );

  const toTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  const chooseMode = (next: DeckMode) => {
    setMode(next);
    setQuestionIndex(0);
    setAnswers({});
    setStage('questions');
    toTop();
  };

  const goBack = () => {
    if (stage === 'reality') setStage('reveal');
    else if (stage === 'reveal') {
      setStage('questions');
      setQuestionIndex(questions.length - 1);
    } else if (questionIndex === 0) {
      setStage('mode');
      setMode(null);
    } else setQuestionIndex((index) => index - 1);
    toTop();
  };

  const goNext = () => {
    if (!selectedId) return;
    if (questionIndex === questions.length - 1) setStage('reveal');
    else setQuestionIndex((index) => index + 1);
    toTop();
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      {stage === 'mode' ? <ModeStage copy={copy} locale={locale} onChoose={chooseMode} /> : null}

      {stage === 'questions' && mode && question ? (
        <QuestionStage
          copy={copy}
          locale={locale}
          mode={mode}
          question={question}
          index={questionIndex}
          total={questions.length}
          selectedId={selectedId}
          onSelect={(optionId) => setAnswers((current) => ({ ...current, [question.id]: optionId }))}
          onBack={goBack}
          onNext={goNext}
        />
      ) : null}

      {stage === 'reveal' && mode && result ? (
        <RevealStage
          copy={copy}
          locale={locale}
          mode={mode}
          result={result}
          questions={questions}
          onBack={goBack}
          onNext={() => {
            setStage('reality');
            toTop();
          }}
        />
      ) : null}

      {stage === 'reality' && result ? (
        <RealityStage
          copy={copy}
          result={result}
          profile={profile}
          onProfileChange={setProfile}
          onBack={goBack}
          onComplete={() => onComplete(result, profile)}
        />
      ) : null}
    </ScrollView>
  );
}

/** The archetype recap that sits above the live results once the deck is done. */
export function LifeDeckSummary({
  result,
  onRetake,
}: {
  result: LifeDeckResult;
  onRetake: () => void;
}) {
  const { i18n } = useTranslation();
  const locale = deckLocale(i18n.language);
  const copy = DECK_UI[locale];
  const archetype = getArchetype(result.archetypeId);
  const mustKeep = getAnswerOption(result.mode, 'must-have', result.mustKeepId);
  const relaxFirst = getAnswerOption(result.mode, 'reverse', result.relaxFirstId);

  return (
    <View style={styles.summary}>
      <View style={styles.summaryHead}>
        <Glyph icon={archetype.icon} size={56} dark />
        <View style={styles.summaryTitles}>
          <Txt variant="eyebrow" style={{ color: Colors.gold }}>
            {copy.resultEyebrow}
          </Txt>
          <Txt variant="heading" style={{ color: Colors.lilac }}>
            {localize(archetype.name, locale)}
          </Txt>
        </View>
        <PressableScale onPress={onRetake} accessibilityRole="button" style={styles.retake}>
          <Ionicons name="refresh" size={13} color={Colors.lilac} />
          <Txt style={styles.retakeLabel}>{copy.retake}</Txt>
        </PressableScale>
      </View>
      <Txt style={styles.summaryText}>{localize(archetype.description, locale)}</Txt>
      <View style={styles.wrap}>
        <View style={styles.summaryChip}>
          <Txt style={styles.summaryChipText}>
            {`${copy.mustKeep} · ${mustKeep ? localize(mustKeep.title, locale) : '-'}`}
          </Txt>
        </View>
        <View style={styles.summaryChip}>
          <Txt style={styles.summaryChipText}>
            {`${copy.relaxFirst} · ${relaxFirst ? localize(relaxFirst.title, locale) : '-'}`}
          </Txt>
        </View>
      </View>
      <Txt style={styles.summaryNote}>{copy.adjust}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lilac },
  content: { padding: Spacing.lg, paddingTop: Spacing.md },
  stage: { gap: Spacing.md },
  heroTitle: { marginTop: Spacing.xs },
  glyph: {
    flexShrink: 0,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.borderViolet,
    backgroundColor: Tint.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphDark: { borderColor: Tint.onDark, backgroundColor: Tint.onDark },
  pathCard: {
    marginTop: Spacing.xs,
    borderRadius: Radius.sheet,
    borderWidth: 1,
    borderColor: Tint.border,
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  pathCardDark: {
    borderColor: Colors.plumLight,
    backgroundColor: Colors.plum,
    ...FloatingShadow,
  },
  pathHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  pathMeta: { fontFamily: MONO, fontSize: FontSize.xs, color: Colors.slateLight },
  pathEyebrow: {
    marginTop: Spacing.lg,
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: Colors.violetDark,
  },
  pathTitle: { fontSize: FontSize.xl },
  pathText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * 1.6,
    color: Colors.slate,
  },
  pathCta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  pathCtaLabel: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.violetDark },
  sharedNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  sharedNoteText: { flex: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressCount: { fontSize: FontSize.xs, color: Colors.slate },
  track: { flex: 1, height: 5, borderRadius: Radius.full, backgroundColor: Colors.lilacDim },
  fill: { height: 5, borderRadius: Radius.full, backgroundColor: Colors.violet },
  kicker: {
    marginTop: Spacing.md,
    fontFamily: MONO,
    fontSize: FontSize.xs,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: Colors.gold,
  },
  questionTitle: { fontSize: FontSize.xl },
  rail: { marginHorizontal: -Spacing.lg },
  railContent: { gap: CARD_GAP, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  cardSelected: { backgroundColor: Colors.plum, borderColor: Colors.violet, ...FloatingShadow },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIndex: { fontFamily: MONO, fontSize: FontSize.xs, color: Colors.slateLight },
  cardBody: { marginTop: 'auto', gap: 6 },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    lineHeight: FontSize.base * 1.35,
    color: Colors.plum,
  },
  cardText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: FontSize.xs * 1.6,
    color: Colors.slate,
  },
  cardChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  cardChip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.onDarkStrong,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  cardChipText: { fontFamily: MONO, fontSize: 10, color: Tint.onDarkText },
  hint: { textAlign: 'center' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.borderInput,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    minHeight: 46,
  },
  backLabel: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm, color: Colors.plum },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.violet,
    paddingHorizontal: Spacing.lg,
    minHeight: 46,
  },
  nextDisabled: { opacity: 0.4 },
  nextLabel: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.white },
  arcana: {
    borderRadius: Radius.sheet,
    borderWidth: 1,
    borderColor: Colors.plumLight,
    backgroundColor: Colors.plum,
    padding: Spacing.xl,
    gap: Spacing.sm,
    ...FloatingShadow,
  },
  arcanaHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  arcanaMeta: { fontFamily: MONO, fontSize: FontSize.xs, color: Tint.onDarkText },
  arcanaName: { marginTop: Spacing.lg, color: Colors.lilac },
  arcanaEnglish: { fontFamily: MONO, fontSize: FontSize.xs, color: Colors.gold },
  arcanaText: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * 1.7,
    color: Tint.onDarkText,
  },
  arcanaSecondary: { fontFamily: MONO, fontSize: FontSize.xs, color: Colors.gold },
  signalCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  signalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.card,
    backgroundColor: Colors.lilac,
    padding: Spacing.md,
  },
  signalBadge: {
    flexShrink: 0,
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalCopy: { flex: 1, gap: 2 },
  axes: { gap: Spacing.sm },
  axis: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  axisLabel: { width: 40 },
  axisTrack: {
    flex: 1,
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.lilacDim,
  },
  axisFill: { height: 5, borderRadius: Radius.full },
  axisValue: { width: 26, textAlign: 'right' },
  scenesLabel: { marginTop: Spacing.xs },
  scenes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -Spacing.sm },
  scene: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.border,
    backgroundColor: Colors.lilac,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  sceneText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.plum },
  realityCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
  },
  realityCardOn: { borderColor: Tint.borderViolet, ...FloatingShadow },
  realityBody: { marginTop: Spacing.md, gap: Spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  field: { gap: 6 },
  chipRow: { gap: Spacing.sm, paddingVertical: 2 },
  summary: {
    borderRadius: Radius.sheet,
    borderWidth: 1,
    borderColor: Colors.plumLight,
    backgroundColor: Colors.plum,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  summaryTitles: { flex: 1, gap: 2 },
  retake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.onDarkStrong,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  retakeLabel: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs, color: Colors.lilac },
  summaryText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * 1.6,
    color: Tint.onDarkText,
  },
  summaryChip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.onDarkStrong,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  summaryChipText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.lilac },
  summaryNote: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Tint.onDarkText },
});
