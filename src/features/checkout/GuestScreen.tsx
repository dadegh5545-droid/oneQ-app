import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { SelectableCard } from '@/components/SelectableCard';
import { TextField } from '@/components/TextField';
import { formatLocalPhone, hasErrors, normaliseQatarPhone, validateGuest } from '@/domain/validation';
import { useDraft } from '@/features/booking/draftStore';
import { colors, space } from '@/theme';

type Choice = 'guest' | 'signIn';

// S12 — signed-in users never reach this screen (see continueToCheckout).
export function GuestScreen() {
  const { t } = useTranslation();
  const saved = useDraft((s) => s.guest);
  const [choice, setChoice] = useState<Choice>('guest');
  const [fullName, setFullName] = useState(saved?.fullName ?? '');
  const [phone, setPhone] = useState(saved ? formatLocalPhone(saved.phone.replace(/^\+974/, '')) : '');
  const [email, setEmail] = useState(saved?.email ?? '');
  // Validate on submit first, then live while typing (06 intro).
  const [submitted, setSubmitted] = useState(false);

  const values = { fullName, phone, email };
  const errors = submitted ? validateGuest(values) : {};

  const onSubmit = () => {
    if (choice === 'signIn') {
      router.push({ pathname: '/auth/sign-in', params: { next: 'checkout' } });
      return;
    }
    setSubmitted(true);
    if (hasErrors(validateGuest(values))) return;
    useDraft.getState().setGuest({ fullName: fullName.trim(), phone: normaliseQatarPhone(phone), email: email.trim() || null });
    router.push('/checkout');
  };

  return (
    <Screen
      scroll
      edges={[]}
      contentStyle={styles.content}
      footer={<Button label={choice === 'guest' ? t('guest.continueToPayment') : t('guest.signIn')} onPress={onSubmit} />}
    >
      <AppText variant="titleL">{t('guest.title')}</AppText>
      <View style={styles.options} accessibilityRole="radiogroup">
        <Option selected={choice === 'guest'} onPress={() => setChoice('guest')} title={t('guest.guestOption')} body={t('guest.guestOptionBody')} />
        <Option selected={choice === 'signIn'} onPress={() => setChoice('signIn')} title={t('guest.signInOption')} body={t('guest.signInOptionBody')} />
      </View>
      {choice === 'guest' ? (
        <View style={styles.form}>
          <TextField
            label={t('guest.fullName')}
            value={fullName}
            onChangeText={setFullName}
            error={errors.fullName && t(errors.fullName)}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={60}
          />
          <TextField
            label={t('guest.phone')}
            prefix="+974"
            value={phone}
            onChangeText={(v) => setPhone(formatLocalPhone(v))}
            error={errors.phone && t(errors.phone)}
            placeholder={t('guest.phoneHint')}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={9}
          />
          <TextField
            label={t('guest.email')}
            value={email}
            onChangeText={setEmail}
            error={errors.email && t(errors.email)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
        </View>
      ) : null}
    </Screen>
  );
}

function Option({ selected, onPress, title, body }: { selected: boolean; onPress: () => void; title: string; body: string }) {
  return (
    <SelectableCard selected={selected} onPress={onPress} accessibilityLabel={`${title}. ${body}`} style={styles.option}>
      <Icon name={selected ? 'radiobox-marked' : 'radiobox-blank'} color={selected ? colors.primary : colors.textTertiary} size={22} />
      <View style={styles.optionText}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="bodyS" color={colors.textSecondary}>
          {body}
        </AppText>
      </View>
    </SelectableCard>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xxl },
  options: { gap: space.md },
  option: { minHeight: 82 },
  optionText: { flex: 1, gap: 2 },
  form: { gap: space.lg },
});
