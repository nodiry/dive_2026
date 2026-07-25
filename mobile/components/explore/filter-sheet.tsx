import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  EMPTY_FILTERS,
  HOUSING_TYPES,
  type ExploreFilters,
  type ExploreMode,
} from '@/components/explore/explore-state';
import { Button, Chip, NumberField } from '@/components/ui/controls';
import { SheetModal } from '@/components/ui/sheet';
import { SliderRow } from '@/components/ui/slider';
import { Card, Section } from '@/components/ui/surfaces';
import { Txt } from '@/components/ui/txt';
import { DISTRICTS } from '@/constants/districts';
import { PERSONAS, type PersonaKey } from '@/constants/personas';
import {
  poiCategoryLabel,
  poiColorForCategoryName,
  poiIconNameForCategoryName,
  type CategoryWeights,
} from '@/constants/poi';
import { Colors, Spacing } from '@/constants/theme';
import { usePoiCategories } from '@/hooks/usePoiCategories';

const TOP_CATEGORY_COUNT = 8;

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  mode: ExploreMode;
  filters: ExploreFilters;
  onFiltersChange: (filters: ExploreFilters) => void;
  weights: CategoryWeights;
  onWeightsChange: (weights: CategoryWeights) => void;
  radiusMeters: number;
  onRadiusChange: (meters: number) => void;
  activePersona: PersonaKey | null;
  onPersonaChange: (key: PersonaKey) => void;
  resultCount: number;
}

export function FilterSheet({
  visible,
  onClose,
  mode,
  filters,
  onFiltersChange,
  weights,
  onWeightsChange,
  radiusMeters,
  onRadiusChange,
  activePersona,
  onPersonaChange,
  resultCount,
}: FilterSheetProps) {
  const { t } = useTranslation();
  const categoriesQuery = usePoiCategories();
  const [expanded, setExpanded] = useState(false);

  const set = <K extends keyof ExploreFilters>(key: K, value: ExploreFilters[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  const categories = [...(categoriesQuery.data ?? [])].sort((a, b) => b.count - a.count);
  const visibleCategories = expanded ? categories : categories.slice(0, TOP_CATEGORY_COUNT);
  const hiddenCount = categories.length - visibleCategories.length;
  const selectedNames = Object.keys(weights);

  const toggleCategory = (categoryName: string) => {
    const next = { ...weights };
    if (next[categoryName] === undefined) next[categoryName] = 1;
    else delete next[categoryName];
    onWeightsChange(next);
  };

  const reset = () => {
    onFiltersChange(EMPTY_FILTERS);
    if (mode === 'preference') onWeightsChange({});
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={mode === 'criteria' ? t('explore.filtersTitle') : t('explore.preferenceTitle')}
      footer={
        <>
          <Button
            label={t('explore.reset')}
            variant="secondary"
            onPress={reset}
            style={styles.footerButton}
          />
          <Button
            label={t('explore.showResults', { value: resultCount })}
            onPress={onClose}
            style={styles.footerPrimary}
          />
        </>
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {mode === 'preference' ? (
          <>
            <Section label={t('explore.personasHeading')}>
              <View style={styles.wrap}>
                {PERSONAS.map((persona) => (
                  <Chip
                    key={persona.key}
                    tone="solid"
                    icon={persona.icon as never}
                    label={t(`personas.${persona.key}`)}
                    selected={activePersona === persona.key}
                    onPress={() => onPersonaChange(persona.key)}
                  />
                ))}
              </View>
            </Section>

            <Section label={t('explore.preferencesHeading')}>
              <View style={styles.wrap}>
                {visibleCategories.map((category) => (
                  <Chip
                    key={category.categoryName}
                    icon={poiIconNameForCategoryName(category.categoryName) as never}
                    iconColor={poiColorForCategoryName(category.categoryName)}
                    label={poiCategoryLabel(category.categoryName, t)}
                    selected={weights[category.categoryName] !== undefined}
                    onPress={() => toggleCategory(category.categoryName)}
                  />
                ))}
                {categories.length > TOP_CATEGORY_COUNT ? (
                  <Chip
                    tone="dashed"
                    label={
                      expanded
                        ? t('explore.showFewer')
                        : t('explore.showMore', { value: hiddenCount })
                    }
                    onPress={() => setExpanded((value) => !value)}
                  />
                ) : null}
              </View>
            </Section>

            {selectedNames.length > 0 ? (
              <Card style={styles.weights}>
                <Txt variant="label">{t('explore.weightHint')}</Txt>
                {selectedNames.map((categoryName) => (
                  <SliderRow
                    key={categoryName}
                    label={poiCategoryLabel(categoryName, t)}
                    dotColor={poiColorForCategoryName(categoryName)}
                    color={poiColorForCategoryName(categoryName)}
                    min={10}
                    max={100}
                    step={5}
                    value={Math.round((weights[categoryName] ?? 1) * 100)}
                    display={`${Math.round((weights[categoryName] ?? 1) * 100)}%`}
                    onChange={(value) =>
                      onWeightsChange({ ...weights, [categoryName]: value / 100 })
                    }
                  />
                ))}
              </Card>
            ) : (
              <Txt variant="caption">{t('explore.prompt')}</Txt>
            )}

            <SliderRow
              label={t('explore.radiusLabel')}
              min={100}
              max={1000}
              step={50}
              value={radiusMeters}
              display={t('units.radiusOption', { meters: radiusMeters })}
              onChange={onRadiusChange}
            />
          </>
        ) : null}

        <Section label={t('explore.districtLabel')}>
          <View style={styles.wrap}>
            <Chip
              label={t('explore.districtAll')}
              selected={!filters.district}
              onPress={() => set('district', '')}
            />
            {DISTRICTS.map((district) => (
              <Chip
                key={district}
                label={t(`districts.${district}`)}
                selected={filters.district === district}
                onPress={() => set('district', district)}
              />
            ))}
          </View>
        </Section>

        <Section label={t('explore.typeLabel')}>
          <View style={styles.wrap}>
            <Chip
              label={t('explore.typeAll')}
              selected={!filters.type}
              onPress={() => set('type', '')}
            />
            {HOUSING_TYPES.map((type) => (
              <Chip
                key={type}
                label={t(`housingType.${type}`)}
                selected={filters.type === type}
                onPress={() => set('type', type)}
              />
            ))}
          </View>
        </Section>

        <View style={styles.wrap}>
          <Chip
            icon="bus-outline"
            label={t('explore.busStopNearby')}
            selected={filters.busStopNearby}
            onPress={() => set('busStopNearby', !filters.busStopNearby)}
          />
        </View>

        <View style={styles.row}>
          <NumberField
            label={t('explore.depositMaxLabel')}
            value={filters.depositMaxManwon}
            placeholder={t('explore.depositMaxPlaceholder')}
            onChangeText={(value) => set('depositMaxManwon', value)}
          />
          <NumberField
            label={t('explore.roomCountLabel')}
            value={filters.roomCount}
            placeholder={t('explore.roomCountPlaceholder')}
            onChangeText={(value) => set('roomCount', value)}
          />
        </View>

        {mode === 'criteria' ? (
          <View style={styles.row}>
            <NumberField
              label={t('explore.builtAfterLabel')}
              value={filters.builtAfter}
              placeholder={t('explore.builtAfterPlaceholder')}
              onChangeText={(value) => set('builtAfter', value)}
            />
            <View style={styles.spacer} />
          </View>
        ) : null}
      </ScrollView>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  weights: { gap: Spacing.sm, backgroundColor: Colors.white },
  row: { flexDirection: 'row', gap: Spacing.md },
  spacer: { flex: 1 },
  footerButton: { flex: 1 },
  footerPrimary: { flex: 1.6 },
});
