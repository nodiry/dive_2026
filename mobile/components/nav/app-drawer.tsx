import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, usePathname, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/press';
import { Divider } from '@/components/ui/surfaces';
import { Txt } from '@/components/ui/txt';
import { Colors, DrawerShadow, FontFamily, FontSize, MONO, Radius, Spacing, Spring, Tint } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useChat } from '@/contexts/chat';
import { useAiConversations } from '@/hooks/useAi';

type IconName = keyof typeof Ionicons.glyphMap;

const NAV: { route: Href; icon: IconName; activeIcon: IconName; key: string }[] = [
  { route: '/', icon: 'map-outline', activeIcon: 'map', key: 'explore' },
  { route: '/life-match', icon: 'sparkles-outline', activeIcon: 'sparkles', key: 'lifeMatch' },
  { route: '/ai', icon: 'chatbubble-outline', activeIcon: 'chatbubble', key: 'ai' },
  { route: '/saved', icon: 'heart-outline', activeIcon: 'heart', key: 'saved' },
  { route: '/policy', icon: 'stats-chart-outline', activeIcon: 'stats-chart', key: 'policy' },
  { route: '/about', icon: 'information-circle-outline', activeIcon: 'information-circle', key: 'about' },
];

const RECENT_LIMIT = 12;

export function AppDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(324, screenWidth * 0.86);
  const { user, isLoggedIn, signOut } = useAuth();
  const { conversationId, newChat, openConversation } = useChat();
  const conversations = useAiConversations(isLoggedIn);

  const [mounted, setMounted] = useState(visible);
  const translateX = useSharedValue(-width);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateX.value = withSpring(0, Spring);
    } else if (mounted) {
      translateX.value = withTiming(-width, { duration: 180 }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, mounted, width, translateX]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      translateX.value = Math.min(0, event.translationX);
    })
    .onEnd((event) => {
      if (event.translationX < -width * 0.3 || event.velocityX < -600) runOnJS(onClose)();
      else translateX.value = withSpring(0, Spring);
    });

  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: 1 + translateX.value / width }));

  const go = (route: Href) => {
    onClose();
    router.navigate(route);
  };

  const startNewChat = () => {
    newChat();
    go('/ai');
  };

  const pickConversation = (id: string) => {
    onClose();
    void openConversation(id);
    router.navigate('/ai');
  };

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.scrim, scrimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            style={[styles.drawer, { width, paddingTop: insets.top + Spacing.lg }, drawerStyle]}
          >
            <View style={styles.brandRow}>
              <Txt variant="heading" style={styles.brand}>
                {t('brand')}
                <Txt style={styles.brandDot}>.</Txt>
              </Txt>
              <PressableScale onPress={onClose} hitSlop={12} accessibilityLabel={t('menu.close')}>
                <Ionicons name="close" size={22} color={Colors.slate} />
              </PressableScale>
            </View>

            <PressableScale onPress={startNewChat} style={styles.newChat}>
              <View style={styles.newChatIcon}>
                <Ionicons name="add" size={17} color={Colors.violet} />
              </View>
              <Txt style={styles.newChatLabel}>{t('menu.newChat')}</Txt>
            </PressableScale>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {NAV.map((item) => {
                const active = pathname === item.route;
                return (
                  <PressableScale
                    key={item.key}
                    onPress={() => go(item.route)}
                    style={[styles.navRow, active && styles.navRowActive]}
                  >
                    <Ionicons
                      name={active ? item.activeIcon : item.icon}
                      size={19}
                      color={active ? Colors.violetDark : Colors.slate}
                    />
                    <Txt style={[styles.navLabel, active && styles.navLabelActive]}>
                      {t(`menu.${item.key}`)}
                    </Txt>
                  </PressableScale>
                );
              })}

              {isLoggedIn ? (
                <View style={styles.recent}>
                  <Txt variant="eyebrow" style={styles.recentLabel}>
                    {t('menu.recent')}
                  </Txt>
                  {(conversations.data ?? []).length === 0 ? (
                    <Txt variant="caption" style={styles.recentEmpty}>
                      {t('menu.recentEmpty')}
                    </Txt>
                  ) : (
                    (conversations.data ?? []).slice(0, RECENT_LIMIT).map((conversation) => {
                      const active = conversation.id === conversationId;
                      return (
                        <PressableScale
                          key={conversation.id}
                          onPress={() => pickConversation(conversation.id)}
                          style={styles.chatRow}
                        >
                          <View style={[styles.rule, active && styles.ruleActive]} />
                          <Txt
                            numberOfLines={1}
                            style={[styles.chatLabel, active && styles.chatLabelActive]}
                          >
                            {conversation.title}
                          </Txt>
                        </PressableScale>
                      );
                    })
                  )}
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
              <Divider />
              {isLoggedIn ? (
                <View style={styles.account}>
                  <View style={styles.avatar}>
                    <Txt style={styles.avatarLetter}>
                      {user?.username?.[0]?.toUpperCase() ?? '?'}
                    </Txt>
                  </View>
                  <View style={styles.accountText}>
                    <Txt variant="subheading" numberOfLines={1}>
                      {user?.username}
                    </Txt>
                    <Txt variant="caption" numberOfLines={1}>
                      {user?.email}
                    </Txt>
                  </View>
                  <PressableScale
                    onPress={signOut}
                    hitSlop={10}
                    accessibilityLabel={t('menu.logout')}
                  >
                    <Ionicons name="log-out-outline" size={20} color={Colors.slate} />
                  </PressableScale>
                </View>
              ) : (
                <View style={styles.account}>
                  <View style={styles.accountText}>
                    <Txt variant="caption">{t('menu.guest')}</Txt>
                  </View>
                  <PressableScale onPress={() => go('/login')} style={styles.loginPill}>
                    <Txt style={styles.loginLabel}>{t('menu.login')}</Txt>
                  </PressableScale>
                </View>
              )}

              <PressableScale
                onPress={() => void i18n.changeLanguage(i18n.language === 'ko' ? 'en' : 'ko')}
                style={styles.languageRow}
              >
                <Ionicons name="language-outline" size={18} color={Colors.slate} />
                <Txt style={styles.languageLabel}>{t('menu.language')}</Txt>
                <Txt style={styles.languageValue}>
                  {i18n.language === 'ko' ? '한국어' : 'English'}
                </Txt>
              </PressableScale>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: Tint.scrim },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.lilac,
    borderTopRightRadius: Radius.sheet,
    borderBottomRightRadius: Radius.sheet,
    ...DrawerShadow,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  brand: { fontSize: FontSize.xl, letterSpacing: -0.6 },
  brandDot: { color: Colors.violet, fontFamily: FontFamily.bold, fontSize: FontSize.xl },
  newChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Tint.violet,
  },
  newChatIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.violetDark,
  },
  scroll: { flex: 1, marginTop: Spacing.md },
  scrollContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderRadius: Radius.full,
  },
  navRowActive: { backgroundColor: Tint.violet },
  navLabel: { fontFamily: FontFamily.semibold, fontSize: FontSize.base, color: Colors.plum },
  navLabelActive: { color: Colors.violetDark },
  recent: { marginTop: Spacing.lg },
  recentLabel: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  recentEmpty: { paddingHorizontal: Spacing.md },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.md,
  },
  rule: { width: 3, height: 18, borderRadius: Radius.full, backgroundColor: 'transparent' },
  ruleActive: { backgroundColor: Colors.violet },
  chatLabel: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.slate,
    paddingVertical: 10,
  },
  chatLabelActive: { fontFamily: FontFamily.semibold, color: Colors.violetDark },
  footer: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  account: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Tint.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontFamily: MONO, fontSize: FontSize.base, color: Colors.violetDark },
  accountText: { flex: 1, gap: 1 },
  loginPill: {
    borderRadius: Radius.full,
    backgroundColor: Colors.violet,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
  },
  loginLabel: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm, color: Colors.white },
  languageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  languageLabel: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.plum,
  },
  languageValue: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.violetDark,
  },
});
