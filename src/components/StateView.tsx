import { ActivityIndicator, View } from 'react-native';

import { makeStyles, radius, space, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  title?: string;
  body?: string;
  action?: { label: string; onPress: () => void };
  // card: bordered container (Classes placeholder); plain: centered in the screen.
  card?: boolean;
};

// Shared empty / error / not-found state (02 "Global components & states").
export function EmptyState({ icon, title, body, action, card }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.container, card && styles.card]}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={28} color={colors.primary} />
      </View>
      {title ? (
        <AppText variant="titleM" style={styles.center}>
          {title}
        </AppText>
      ) : null}
      {body ? (
        <AppText color={colors.textSecondary} style={styles.center}>
          {body}
        </AppText>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} style={styles.button} /> : null}
    </View>
  );
}

export function LoadingState() {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  container: { alignItems: 'center', gap: space.md, paddingVertical: space.xxxl },
  card: {
    paddingHorizontal: space.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
    marginBottom: space.xs,
  },
  center: { textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: space.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.xxxl },
}));
