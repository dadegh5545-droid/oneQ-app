import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { currentLanguage } from '@/i18n';
import { arabicFonts, colors, fonts, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

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
      <View style={[styles.field, focused && styles.focused, !!error && styles.errorBorder]}>
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
          style={[styles.input, { fontFamily, textAlign: I18nManager.isRTL ? 'right' : 'left' }]}
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
