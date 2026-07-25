import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertRow } from '@/components/alerts/alert-card';
import { HousingCard } from '@/components/housing/housing-card';
import { ScreenHeader } from '@/components/nav/screen-header';
import { Button } from '@/components/ui/controls';
import { EmptyState, Skeleton } from '@/components/ui/surfaces';
import { Txt } from '@/components/ui/txt';
import { Colors, Spacing } from '@/constants/theme';
import { useHousingAlerts } from '@/hooks/useAlerts';
import { useSavedHousing } from '@/hooks/useSaved';

export default function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { savedHousing, isLoading, isLoggedIn, isSaved, toggleSaved } = useSavedHousing();
  const alerts = useHousingAlerts();

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
        ListFooterComponent={
          // Alerts belong with 찜: both are things you kept, and this is the
          // only place outside the chat where you can see or cancel them.
          isLoggedIn ? (
            <View style={styles.alerts}>
              <Txt variant="eyebrow">{t('housingAlerts.myAlerts')}</Txt>
              {alerts.alerts.length === 0 ? (
                <EmptyState message={t('housingAlerts.none')} />
              ) : (
                alerts.alerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    cancelling={alerts.cancel.isPending}
                    onCancel={() => alerts.cancel.mutate(alert.id)}
                  />
                ))
              )}
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lilac },
  list: { padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 },
  count: { marginBottom: Spacing.xs },
  skeletons: { gap: Spacing.md },
  alerts: { marginTop: Spacing.xl, gap: Spacing.md },
});
