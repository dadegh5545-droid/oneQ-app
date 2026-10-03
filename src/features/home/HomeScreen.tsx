import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { RatingInline } from '@/components/RatingInline';
import { Screen } from '@/components/Screen';
import { EmptyState, LoadingState } from '@/components/StateView';
import { useInputTextStyle } from '@/components/TextField';
import { useGyms } from '@/data';
import { gymLocation, type Gym } from '@/domain/models';
import { greetingKey, matchesQuery } from '@/domain/rules';
import { FavoriteButton } from '@/features/favorites/FavoriteButton';
import { GymListCard, openGym } from '@/features/gyms/GymListCard';
import { alignStart } from '@/i18n';
import { track } from '@/services/analytics';
import { makeStyles, radius, screenPadding, space, useTheme } from '@/theme';
import { perMonthLabel } from '@/utils/format';

// The placeholder "Classes" category was removed (Phase 3): there are no classes to book.
type Category = 'all' | 'gyms' | 'trainers';
const CATEGORIES: Category[] = ['all', 'gyms', 'trainers'];

// S02–S06
export function HomeScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const gyms = useGyms();

  const searching = query.trim().length > 0;

  // One event per search (debounced), with the result count only — never the search text.
  useEffect(() => {
    if (!searching || !gyms.data) return;
    const all = gyms.data;
    const timer = setTimeout(() => track({ name: 'search', resultCount: all.filter((g) => matchesQuery(g, query)).length }), 800);
    return () => clearTimeout(timer);
  }, [query, searching, gyms.data]);

  const renderBody = () => {
    if (gyms.isPending) return <LoadingState />;
    if (gyms.isError) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title={t('home.errorTitle')}
          body={t('home.errorBody')}
          action={{ label: t('common.retry'), onPress: () => gyms.refetch() }}
        />
      );
    }
    const all = gyms.data;

    if (searching) {
      const results = all.filter((g) => matchesQuery(g, query));
      if (results.length === 0) {
        return <EmptyState icon="magnify-close" title={t('home.noResultsTitle')} body={t('home.noResultsBody')} />;
      }
      return <GymList title={t('home.results')} gyms={results} />;
    }

    switch (category) {
      case 'gyms':
        return <GymList title={t('home.gyms')} gyms={all} />;
      case 'trainers':
        return (
          <>
            <AppText color={colors.textSecondary}>{t('home.trainersHint')}</AppText>
            <GymList title={t('home.gyms')} gyms={all} />
          </>
        );
      default:
        return <Discover gyms={all} />;
    }
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <AppText variant="titleM" color={colors.primary} style={styles.wordmark} lang="en">
        OneQ
      </AppText>
      <View style={styles.headings}>
        <AppText color={colors.textSecondary}>{t(`greeting.${greetingKey()}`)}</AppText>
        <AppText variant="displayL">{t('home.headline')}</AppText>
      </View>
      <SearchField value={query} onChange={setQuery} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.bleed}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={t(`home.categories.${c}`)} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>
      {renderBody()}
    </Screen>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { arabicFonts, colors, fonts, isRTL } = useTheme();
  const styles = useStyles();
  const { t } = useTranslation();
  const inputTextStyle = useInputTextStyle();
  const [focused, setFocused] = useState(false);
  const fontFamily = isRTL ? arabicFonts.body : fonts.body;
  return (
    <View style={[styles.search, focused && styles.searchFocused]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={t('home.searchPlaceholder')}
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={t('home.searchPlaceholder')}
        returnKeyType="search"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[inputTextStyle, { fontFamily, textAlign: alignStart() }]}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('home.clearSearch')} hitSlop={10} onPress={() => onChange('')}>
          <Icon name="close-circle" color={colors.textTertiary} />
        </Pressable>
      ) : (
        <Icon name="magnify" color={colors.textSecondary} />
      )}
    </View>
  );
}

function Discover({ gyms }: { gyms: Gym[] }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const featured = gyms.filter((g) => g.isFeatured);
  const nearby = gyms.filter((g) => g.isNearby && !g.isFeatured);
  return (
    <>
      {featured.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="headline">{t('home.featured')}</AppText>
          <FlatList
            horizontal
            data={featured}
            keyExtractor={(g) => g.id}
            renderItem={({ item }) => <FeaturedCard gym={item} />}
            showsHorizontalScrollIndicator={false}
            snapToInterval={FEATURED_WIDTH + space.lg}
            decelerationRate="fast"
            style={styles.bleed}
            contentContainerStyle={styles.carousel}
          />
        </View>
      ) : null}
      {nearby.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="headline">{t('home.nearYou')}</AppText>
          <FlatList
            horizontal
            data={nearby}
            keyExtractor={(g) => g.id}
            renderItem={({ item }) => <CompactCard gym={item} />}
            showsHorizontalScrollIndicator={false}
            snapToInterval={220 + space.lg}
            decelerationRate="fast"
            style={styles.bleed}
            contentContainerStyle={styles.carousel}
          />
        </View>
      ) : null}
    </>
  );
}

function GymList({ title, gyms }: { title: string; gyms: Gym[] }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <AppText variant="headline">{title}</AppText>
      {gyms.map((g) => (
        <GymListCard key={g.id} gym={g} />
      ))}
    </View>
  );
}

const FEATURED_WIDTH = 228;

function FeaturedCard({ gym }: { gym: Gym }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    // The favorite button overlays the card as a sibling, never nested inside the pressable.
    <View style={styles.featured}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${gym.name}, ${gymLocation(gym)}`} onPress={() => openGym(gym)}>
        <Image source={gym.images[0]} style={styles.featuredImage} contentFit="cover" transition={150} />
        <AppText variant="headline" style={styles.featuredName} numberOfLines={1}>
          {gym.name}
        </AppText>
        <AppText color={colors.textSecondary} numberOfLines={1}>
          {gymLocation(gym)}
        </AppText>
        <View style={styles.featuredFooter}>
          <AppText variant="price" color={colors.primary}>
            {perMonthLabel(gym.monthlyPrice)}
          </AppText>
          <RatingInline rating={gym.rating} />
        </View>
      </Pressable>
      <View style={styles.featuredFav}>
        <FavoriteButton gymId={gym.id} variant="overlay" />
      </View>
    </View>
  );
}

function CompactCard({ gym }: { gym: Gym }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${gym.name}, ${gymLocation(gym)}`} onPress={() => openGym(gym)} style={styles.compact}>
      <Image source={gym.images[0]} style={styles.compactImage} contentFit="cover" transition={150} />
      <View style={styles.compactBody}>
        <AppText variant="label" numberOfLines={1}>
          {gym.name}
        </AppText>
        <AppText variant="bodyS" color={colors.textSecondary} numberOfLines={1}>
          {gymLocation(gym)}
        </AppText>
        <RatingInline rating={gym.rating} />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: { gap: space.xl },
  wordmark: { fontSize: 22 },
  headings: { gap: space.xs },
  search: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  searchFocused: { borderColor: colors.primary, borderWidth: 1.2 },
  bleed: { marginHorizontal: -screenPadding },
  chips: { gap: space.sm, paddingHorizontal: screenPadding },
  section: { gap: space.md },
  carousel: { gap: space.lg, paddingHorizontal: screenPadding },
  featured: { width: FEATURED_WIDTH },
  featuredImage: { width: FEATURED_WIDTH, height: 200, borderRadius: radius.md, backgroundColor: colors.surfaceVariant },
  featuredFav: { position: 'absolute', top: space.md, start: space.md },
  featuredName: { marginTop: space.md, fontSize: 20 },
  featuredFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  compact: {
    width: 220,
    height: 88,
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  compactImage: { width: 88, height: 88, backgroundColor: colors.surfaceVariant },
  compactBody: { flex: 1, justifyContent: 'center', gap: 2, paddingHorizontal: space.md },
}));
