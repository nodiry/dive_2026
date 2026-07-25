import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { HousingCard } from '@/components/housing/housing-card';
import { PressableScale } from '@/components/ui/press';
import { Txt } from '@/components/ui/txt';
import { deckIcon } from '@/constants/deck-icons';
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
import { useAnswerGame, useGame, useSaveGameProgress } from '@/hooks/useGame';
import { useSavedHousing } from '@/hooks/useSaved';
import type { GameSession } from '@/shared/schemas';

/**
 * The in-chat player for a generated 하루 deck: a hand of cards you swipe
 * through, one question at a time, ending in real housing rather than a label.
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

  // Resume an abandoned deck. Adjusted during render, not in an effect, so the
  // first paint already shows the right card.
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
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={Colors.violet} />
        <Txt variant="caption">{t('game.building')}</Txt>
      </View>
    );
  }

  const result = answerGame.data?.result ?? game.result;
  if (result) return <GameResult game={answerGame.data ?? game} />;

  const question = game.questions[index];
  const chosen = answers[question.id];
  const isLast = index === game.questions.length - 1;

  const choose = (optionId: string) => {
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);
    if (!isLast) {
      saveProgress.mutate(next);
      setTimeout(() => setIndex((current) => current + 1), 220);
      return;
    }
    answerGame.mutate(next);
  };

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Txt variant="eyebrow" style={{ color: Colors.violet }} numberOfLines={1}>
          {game.theme}
        </Txt>
        <Txt variant="mono" style={styles.counter}>
          {`${index + 1} / ${game.questions.length}`}
        </Txt>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${((index + (chosen ? 1 : 0)) / game.questions.length) * 100}%` },
          ]}
        />
      </View>

      <Txt variant="caption" style={styles.kicker}>
        {question.kicker[locale]}
      </Txt>
      <Txt variant="heading" style={styles.question}>
        {question.title[locale]}
      </Txt>
      <Txt variant="caption">{question.description[locale]}</Txt>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={188}
        decelerationRate="fast"
        contentContainerStyle={styles.hand}
        style={styles.handScroll}
      >
        {question.options.map((option, cardIndex) => {
          const selected = chosen === option.id;
          return (
            <PressableScale
              key={option.id}
              haptic
              disabled={answerGame.isPending}
              onPress={() => choose(option.id)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={styles.cardHead}>
                <Txt style={[styles.cardIndex, selected && { color: Tint.onDarkText }]}>
                  {String(cardIndex + 1).padStart(2, '0')}
                </Txt>
                {selected ? <Ionicons name="checkmark" size={14} color={Colors.gold} /> : null}
              </View>

              <View style={[styles.cardIcon, selected && styles.cardIconSelected]}>
                <Ionicons
                  name={deckIcon(option.icon)}
                  size={24}
                  color={selected ? Colors.gold : Colors.violet}
                />
              </View>

              <View style={styles.cardBody}>
                <Txt
                  numberOfLines={2}
                  style={[styles.cardTitle, selected && { color: Colors.lilac }]}
                >
                  {option.title[locale]}
                </Txt>
                <Txt
                  numberOfLines={3}
                  style={[styles.cardText, selected && { color: Tint.onDarkText }]}
                >
                  {selected ? option.meaning[locale] : option.caption[locale]}
                </Txt>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      {answerGame.isPending ? (
        <View style={styles.scoring}>
          <ActivityIndicator size="small" color={Colors.violet} />
          <Txt variant="caption">{t('game.scoring')}</Txt>
        </View>
      ) : null}
    </View>
  );
}

function GameResult({ game }: { game: GameSession }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'ko';
  const router = useRouter();
  const { isSaved, toggleSaved, isLoggedIn } = useSavedHousing();
  const result = game.result;
  if (!result) return null;

  const axes: [string, number, string][] = [
    ['FUN', result.stats.fun, Colors.violet],
    ['WORK', result.stats.work, Colors.lilac],
    ['REST', result.stats.rest, Colors.gold],
  ];

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Ionicons name="sparkles" size={14} color={Colors.violet} />
        <Txt variant="eyebrow" style={{ color: Colors.violet }}>
          {t('game.resultTitle')}
        </Txt>
      </View>

      <View style={styles.resultCard}>
        <View style={styles.axes}>
          {axes.map(([label, value, color]) => (
            <View key={label} style={styles.axis}>
              <View style={styles.axisHead}>
                <Txt style={styles.axisLabel}>{label}</Txt>
                <Txt style={styles.axisValue}>{Math.round(value)}</Txt>
              </View>
              <View style={styles.axisTrack}>
                <View style={[styles.axisFill, { width: `${value}%`, backgroundColor: color }]} />
              </View>
            </View>
          ))}
        </View>
        <Txt style={styles.resultSummary}>{result.summary[locale]}</Txt>
      </View>

      {result.categories.length > 0 ? (
        <View style={styles.chips}>
          {result.categories.map((category) => (
            <View key={category} style={styles.chip}>
              <Txt style={styles.chipText}>{category}</Txt>
            </View>
          ))}
        </View>
      ) : null}

      {result.housing.length > 0 ? (
        <>
          <Txt variant="eyebrow" style={styles.matchesLabel}>
            {t('game.matches')}
          </Txt>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
          >
            {result.housing.map((housing) => (
              <HousingCard
                key={housing.id}
                housing={housing}
                variant="rail"
                saved={isSaved(housing.id)}
                onPress={() => router.push(`/housing/${housing.id}`)}
                onToggleSave={
                  isLoggedIn ? () => toggleSaved(housing.id) : () => router.push('/login')
                }
              />
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  panel: {
    marginTop: Spacing.md,
    marginHorizontal: -Spacing.lg,
    marginBottom: -Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Tint.border,
    backgroundColor: Colors.lilac,
    borderBottomLeftRadius: Radius.card - 1,
    borderBottomRightRadius: Radius.card - 1,
    gap: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  counter: { marginLeft: 'auto', fontSize: FontSize.xs, color: Colors.slate },
  track: { height: 4, borderRadius: Radius.full, backgroundColor: Colors.lilacDim },
  fill: { height: 4, borderRadius: Radius.full, backgroundColor: Colors.violet },
  kicker: { marginTop: Spacing.sm },
  question: { fontSize: FontSize.base },
  handScroll: { marginHorizontal: -Spacing.lg, marginTop: Spacing.sm },
  hand: { gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: 4 },
  card: {
    width: 172,
    height: 240,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  cardSelected: { backgroundColor: Colors.plum, borderColor: Colors.violet, ...FloatingShadow },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIndex: { fontFamily: MONO, fontSize: FontSize.xs, color: Colors.slateLight },
  cardIcon: {
    marginTop: Spacing.md,
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.borderViolet,
    backgroundColor: Tint.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconSelected: { borderColor: Tint.onDark, backgroundColor: Tint.onDark },
  cardBody: { marginTop: 'auto' },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.plum },
  cardText: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: FontSize.xs * 1.5,
    color: Colors.slate,
  },
  scoring: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  resultCard: {
    marginTop: Spacing.sm,
    borderRadius: Radius.card,
    backgroundColor: Colors.plum,
    padding: Spacing.lg,
  },
  axes: { flexDirection: 'row', gap: Spacing.md },
  axis: { flex: 1, gap: 4 },
  axisHead: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontFamily: MONO, fontSize: 10, color: Tint.onDarkText },
  axisValue: { fontFamily: MONO, fontSize: 10, color: Colors.lilac },
  axisTrack: { height: 4, borderRadius: Radius.full, backgroundColor: Tint.onDark },
  axisFill: { height: 4, borderRadius: Radius.full },
  resultSummary: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * 1.6,
    color: Tint.onDarkText,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.borderViolet,
    backgroundColor: Tint.violet,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs, color: Colors.violetDark },
  matchesLabel: { marginTop: Spacing.md },
  rail: { gap: Spacing.md, paddingRight: Spacing.lg, paddingVertical: 4 },
});
