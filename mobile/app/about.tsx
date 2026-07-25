import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/nav/screen-header';
import { Card } from '@/components/ui/surfaces';
import { Txt } from '@/components/ui/txt';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';

export default function AboutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const partners = [
    { brand: 'BMC', name: t('about.bmcName'), blurb: t('about.bmcBlurb') },
    { brand: '선도소프트', name: t('about.sundosoftName'), blurb: t('about.sundosoftBlurb') },
  ];

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('about.title')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Txt variant="eyebrow" style={styles.eyebrow}>
          DIVE 2026
        </Txt>
        <Txt variant="hero">{t('brand')}</Txt>
        <Txt variant="body" color="slate" style={styles.intro}>
          {t('about.intro')}
        </Txt>

        <Txt variant="heading" style={styles.heading}>
          {t('about.problemHeading')}
        </Txt>
        <Txt variant="body" color="slate">
          {t('about.problemBody')}
        </Txt>

        <Txt variant="heading" style={styles.heading}>
          {t('about.partnersHeading')}
        </Txt>
        <View style={styles.partners}>
          {partners.map((partner) => (
            <Card key={partner.brand}>
              <Txt style={styles.partnerBrand}>
                {partner.brand}
                <Txt style={styles.dot}>.</Txt>
              </Txt>
              <Txt variant="subheading" style={styles.partnerName}>
                {partner.name}
              </Txt>
              <Txt variant="caption" style={styles.partnerBlurb}>
                {partner.blurb}
              </Txt>
            </Card>
          ))}
        </View>

        <Txt variant="caption" style={styles.footer}>
          {t('about.footer')}
        </Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lilac },
  content: { padding: Spacing.lg, paddingTop: Spacing.md },
  eyebrow: { color: Colors.violet, marginBottom: Spacing.sm },
  intro: { marginTop: Spacing.md },
  heading: { marginTop: Spacing.xxl, marginBottom: Spacing.sm },
  partners: { gap: Spacing.md },
  partnerBrand: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.plum },
  dot: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.violet },
  partnerName: { marginTop: Spacing.xs },
  partnerBlurb: { marginTop: Spacing.sm },
  footer: { marginTop: Spacing.xxl, textAlign: 'center' },
});
