import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { alignLeft, alignStart, currentLanguage, isRTL } from '@/i18n';
import { arabicFonts, colors, fonts, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

// Undo the RTL row mirroring (native flips row in RTL; the web flips it via dir=rtl).
const ltrRow = () => ({ flexDirection: isRTL() ? ('row-reverse' as const) : ('row' as const) });

// Shared input text style. Android gives TextInput the EditText background padding (larger at the bottom)
// plus the custom fonts' extra font padding, which pushed typed text above the middle of fixed-height fields.
// The input fills the field with no vertical padding and centres its text instead.
export const inputTextStyle = {
  flex: 1,
  // Lets the input shrink below its intrinsic width (the web's size=20), which otherwise pushed the eye icon
  // or search icon out of narrow fields in Arabic.
  minWidth: 0,
  alignSelf: 'stretch' as const,
  margin: 0,
  paddingVertical: 0,
  paddingHorizontal: 0,
  fontSize: 16,
  color: colors.textPrimary,
  textAlignVertical: 'center' as const,
  ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  // The field border already shows focus; hide the browser's own focus rectangle on the web.
  ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
};

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  // Fixed leading text, e.g. the "+974" phone prefix.
  prefix?: string;
  password?: boolean;
};

// Outlined text field (06 intro): label above, 48 tall (grows with larger text), radius 16, error text below.
export function TextField({ label, error, prefix, password, ...input }: Props) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const fontFamily = currentLanguage() === 'ar' ? arabicFonts.body : fonts.body;
  const multiline = !!input.multiline;
  // Phone numbers, emails, passwords and numbers always read left-to-right, also in Arabic.
  const ltrContent = !!prefix || !!password || ['email-address', 'phone-pad', 'number-pad', 'numbers-and-punctuation', 'url'].includes(input.keyboardType ?? '');

  return (
    <View style={styles.wrapper}>
      <AppText variant="bodyS" color={error ? colors.error : colors.textSecondary}>
        {label}
      </AppText>
      {/* A prefixed (phone) field always reads left-to-right: +974 3333 4444. */}
      <View style={[styles.field, multiline && styles.fieldMultiline, prefix && ltrRow(), focused && styles.focused, !!error && styles.errorBorder]}>
        {prefix ? (
          <AppText variant="bodyL" style={styles.prefix}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          {...input}
          accessibilityLabel={label}
          accessibilityHint={error}
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
          style={[
            inputTextStyle,
            multiline && styles.inputMultiline,
            { fontFamily, textAlign: ltrContent ? alignLeft() : alignStart(), writingDirection: ltrContent ? 'ltr' : undefined },
          ]}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('signIn.showPassword') : t('signIn.hidePassword')}
            // 20 pt icon + 12 pt on each side = the 44 pt minimum tap target (10 §2).
            hitSlop={12}
            onPress={() => setHidden((h) => !h)}
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="bodyS" color={colors.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.xs + 2 },
  field: {
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
  fieldMultiline: { minHeight: 112, alignItems: 'stretch', paddingVertical: space.md },
  focused: { borderColor: colors.primary, borderWidth: 1.2 },
  errorBorder: { borderColor: colors.error },
  prefix: { writingDirection: 'ltr', ...(Platform.OS === 'android' ? { includeFontPadding: false } : null) },
  inputMultiline: { textAlignVertical: 'top', minHeight: 86 },
});
