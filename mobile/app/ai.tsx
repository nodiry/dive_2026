import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatGame } from '@/components/game/chat-game';
import { FullscreenMap, MapResultCard } from '@/components/housing/map-result-card';
import { ScreenHeader } from '@/components/nav/screen-header';
import { Button, Input } from '@/components/ui/controls';
import { Markdown } from '@/components/ui/markdown';
import { PressableScale } from '@/components/ui/press';
import { EmptyState } from '@/components/ui/surfaces';
import { Txt } from '@/components/ui/txt';
import { Colors, FontFamily, FontSize, Radius, Spacing, Tint } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useChat, type TranscriptMessage } from '@/contexts/chat';
import * as ImagePicker from 'expo-image-picker';
import type { HousingSummary } from '@/shared/schemas';

export default function AiScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const { messages, busy, send, newChat } = useChat();
  const listRef = useRef<FlatList<TranscriptMessage>>(null);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<HousingSummary[] | null>(null);

  const lastMapIndex = messages.reduce(
    (last, message, index) => (message.housing?.length ? index : last),
    -1,
  );

  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    send(text, image ?? undefined);
    setInput('');
    setImage(null);
  };

  const attachImage = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset?.base64) return;
    setImage(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('ai.title')} />
        <View style={styles.guest}>
          <EmptyState
            message={t('ai.guest')}
            action={<Button label={t('auth.login')} onPress={() => router.push('/login')} />}
          />
        </View>
      </View>
    );
  }

  const empty = messages.length === 0 && !busy;
  const suggestions = [t('ai.suggestion1'), t('ai.suggestion2'), t('ai.suggestion3')];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={t('ai.title')}
        action={
          <PressableScale onPress={newChat} hitSlop={10} accessibilityLabel={t('ai.newChat')}>
            <Ionicons name="create-outline" size={22} color={Colors.plum} />
          </PressableScale>
        }
      />

      {empty ? (
        <ScrollView contentContainerStyle={styles.emptyContent} showsVerticalScrollIndicator={false}>
          <Txt variant="eyebrow">{t('brand')}</Txt>
          <Txt variant="title" style={styles.greeting}>
            {t('ai.greeting')}
          </Txt>
          <Txt variant="body" color="slate" style={styles.subtitle}>
            {t('ai.subtitle')}
          </Txt>
          <PressableScale onPress={() => submit('/game')} style={styles.gameButton}>
            <Ionicons name="sparkles" size={16} color={Colors.white} />
            <Txt style={styles.gameButtonText}>{t('game.startButton')}</Txt>
          </PressableScale>
          <Txt variant="caption" style={styles.gameHint}>
            {t('game.startHint')}
          </Txt>

          <View style={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <PressableScale
                key={suggestion}
                onPress={() => submit(suggestion)}
                style={styles.suggestion}
              >
                <Txt variant="body" style={styles.suggestionText}>
                  {suggestion}
                </Txt>
                <Ionicons name="arrow-forward" size={16} color={Colors.violet} />
              </PressableScale>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.transcript}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            busy ? (
              <View style={styles.thinking}>
                <View style={styles.thinkingDot} />
                <Txt variant="caption">{t('ai.thinking')}</Txt>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Bubble
              message={item}
              showMap={index === lastMapIndex}
              onExpandMap={() => setExpanded(item.housing ?? null)}
            />
          )}
        />
      )}

      {image ? (
        <View style={styles.pending}>
          <Image source={{ uri: image }} style={styles.pendingThumb} contentFit="cover" />
          <Txt variant="caption" style={styles.pendingText}>
            {t('ai.imageAttached')}
          </Txt>
          <PressableScale onPress={() => setImage(null)} hitSlop={10}>
            <Ionicons name="close" size={18} color={Colors.slate} />
          </PressableScale>
        </View>
      ) : null}

      <View style={[styles.composer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <PressableScale
          onPress={attachImage}
          accessibilityLabel={t('ai.attachImage')}
          style={styles.attach}
        >
          <Ionicons name="image-outline" size={19} color={Colors.slate} />
        </PressableScale>
        <Input
          value={input}
          onChangeText={setInput}
          placeholder={t('ai.placeholder')}
          maxLength={1000}
          style={styles.input}
          onSubmitEditing={() => submit(input)}
          returnKeyType="send"
        />
        <PressableScale
          onPress={() => submit(input)}
          accessibilityLabel={t('ai.send')}
          style={[styles.send, (!input.trim() || busy) && styles.sendOff]}
        >
          <Ionicons name="arrow-up" size={20} color={Colors.white} />
        </PressableScale>
      </View>

      <FullscreenMap housing={expanded} onClose={() => setExpanded(null)} />
    </KeyboardAvoidingView>
  );
}

function Bubble({
  message,
  showMap,
  onExpandMap,
}: {
  message: TranscriptMessage;
  showMap: boolean;
  onExpandMap: () => void;
}) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';

  const attached = message.housing?.length ? message.housing : null;
  const mappable = attached?.some((item) => item.lat != null && item.lng != null) ?? false;

  return (
    <View style={styles.bubbleRow}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAi,
          attached && styles.bubbleWide,
        ]}
      >
        {isUser ? (
          <>
            {message.image ? (
              <Image
                source={{ uri: message.image }}
                style={styles.attachedImage}
                contentFit="cover"
              />
            ) : null}
            <Txt variant="body" style={{ color: Colors.lilac }}>
              {message.text}
            </Txt>
          </>
        ) : (
          <Markdown text={message.text} />
        )}

        {attached ? (
          <View style={[styles.attachment, !mappable && styles.attachmentBare]}>
            <Txt variant="eyebrow" style={styles.attachmentLabel}>
              {t('ai.resultCount', { value: attached.length })}
            </Txt>
            {!mappable ? null : showMap ? (
              <MapResultCard flush housing={attached} onExpand={onExpandMap} />
            ) : (
              <PressableScale onPress={onExpandMap} style={styles.mapStrip}>
                <Ionicons name="map-outline" size={17} color={Colors.violet} />
                <Txt style={styles.mapStripLabel}>{t('ai.viewMap')}</Txt>
                <Ionicons name="chevron-forward" size={16} color={Colors.slateLight} />
              </PressableScale>
            )}
          </View>
        ) : null}

        {message.gameId ? <ChatGame gameId={message.gameId} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lilac },
  guest: { padding: Spacing.lg, paddingTop: Spacing.xl },
  emptyContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  greeting: { marginTop: Spacing.sm },
  subtitle: { marginTop: Spacing.sm, fontSize: FontSize.sm },
  suggestions: { marginTop: Spacing.xl, gap: Spacing.sm },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    padding: Spacing.lg,
  },
  suggestionText: { flex: 1, fontSize: FontSize.sm },
  transcript: { padding: Spacing.lg, gap: Spacing.lg },
  bubbleRow: { gap: Spacing.md },
  bubble: { maxWidth: '88%', borderRadius: Radius.card, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: Colors.plum, borderBottomRightRadius: 6 },
  bubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Tint.border,
    borderBottomLeftRadius: 6,
  },
  bubbleWide: { maxWidth: '100%', width: '100%' },
  attachment: {
    marginTop: Spacing.md,
    marginHorizontal: -Spacing.lg,
    marginBottom: -Spacing.md,
  },
  attachmentBare: { marginBottom: 0 },
  attachmentLabel: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  mapStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Tint.border,
  },
  mapStripLabel: {
    flex: 1,
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.violetDark,
  },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  thinkingDot: { width: 7, height: 7, borderRadius: Radius.full, backgroundColor: Colors.violet },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Tint.border,
    backgroundColor: Colors.lilac,
  },
  input: { flex: 1, fontFamily: FontFamily.regular, maxHeight: 120 },
  attach: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.borderInput,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedImage: {
    width: '100%',
    height: 160,
    borderRadius: Radius.card,
    marginBottom: Spacing.sm,
  },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  pendingThumb: { width: 40, height: 40, borderRadius: Radius.card },
  pendingText: { flex: 1 },
  gameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 11,
    borderRadius: Radius.full,
    backgroundColor: Colors.violet,
  },
  gameButtonText: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm, color: Colors.white },
  gameHint: { marginTop: Spacing.sm },
  send: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.35 },
});
