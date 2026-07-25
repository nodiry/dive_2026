import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HousingCard } from '@/components/housing/housing-card';
import { ScreenHeader } from '@/components/nav/screen-header';
import { Button } from '@/components/ui/controls';
import { EmptyState, Skeleton } from '@/components/ui/surfaces';
import { Txt } from '@/components/ui/txt';
import { Colors, Spacing } from '@/constants/theme';
import { useSavedHousing } from '@/hooks/useSaved';

export default function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { savedHousing, isLoading, isLoggedIn, isSaved, toggleSaved } = useSavedHousing();

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('saved.title')} />
      <FlatList
        data={savedHousing}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          savedHousing.length > 0 ? (
            <Txt variant="eyebrow" style={styles.count}>
              {savedHousing.length}
            </Txt>
          ) : null
        }
        ListEmptyComponent={
          !isLoggedIn ? (
            <EmptyState
              message={t('saved.loginRequired')}
              action={<Button label={t('auth.login')} onPress={() => router.push('/login')} />}
            />
          ) : isLoading ? (
            <View style={styles.skeletons}>
              <Skeleton height={132} />
              <Skeleton height={132} />
            </View>
          ) : (
            <EmptyState message={t('saved.empty')} />
          )
        }
        renderItem={({ item }) => (
          <HousingCard
            housing={item}
            saved={isSaved(item.id)}
            onPress={() => router.push(`/housing/${item.id}`)}
            onToggleSave={() => toggleSaved(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lilac },
  list: { padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 },
  count: { marginBottom: Spacing.xs },
  skeletons: { gap: Spacing.md },
});
