import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { alignLeft, alignStart, currentLanguage, isRTL } from '@/i18n';
import { arabicFonts, colors, fonts, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

// Undo the RTL row mirroring (native flips row in RTL; the web flips it via dir=rtl).
const ltrRow = () => ({ flexDirection: isRTL() ? ('row-reverse' as const) : ('row' as const) });

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  // Fixed leading text, e.g. the "+974" phone prefix.
  prefix?: string;
  password?: boolean;
};

// Outlined text field (06 intro): label above, 48 tall, radius 16, error text below.
export function TextField({ label, error, prefix, password, ...input }: Props) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const fontFamily = currentLanguage() === 'ar' ? arabicFonts.body : fonts.body;

  return (
    <View style={styles.wrapper}>
      <AppText variant="bodyS" color={error ? colors.error : colors.textSecondary}>
        {label}
      </AppText>
      {/* A prefixed (phone) field always reads left-to-right: +974 3333 4444. */}
      <View style={[styles.field, prefix && ltrRow(), focused && styles.focused, !!error && styles.errorBorder]}>
        {prefix ? (
          <AppText variant="bodyL" style={styles.prefix}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          {...input}
          accessibilityLabel={label}
          secureTextEntry={password && hidden}
          placeholderTextColor={colors.textTertiary}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[styles.input, { fontFamily, textAlign: prefix ? alignLeft() : alignStart() }]}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('signIn.showPassword') : t('signIn.hidePassword')}
            hitSlop={10}
            onPress={() => setHidden((h) => !h)}
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="bodyS" color={colors.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.xs + 2 },
  field: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  focused: { borderColor: colors.primary, borderWidth: 1.2 },
  errorBorder: { borderColor: colors.error },
  prefix: { writingDirection: 'ltr' },
  input: { flex: 1, height: '100%', fontSize: 16, color: colors.textPrimary },
});
