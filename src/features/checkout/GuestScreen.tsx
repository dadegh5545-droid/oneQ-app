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
import { useDraft } from '@/features/booking/draftStore';
import { colors, space } from '@/theme';

type Choice = 'guest' | 'signIn';

const PHONE_PREFIX = '+974';

// S12 — validation and the signed-in skip are wired in Phase 3.
export function GuestScreen() {
  const { t } = useTranslation();
  const saved = useDraft((s) => s.guest);
  const [choice, setChoice] = useState<Choice>('guest');
  const [fullName, setFullName] = useState(saved?.fullName ?? '');
  const [phone, setPhone] = useState(saved?.phone.replace(PHONE_PREFIX, '').trim() ?? '');
  const [email, setEmail] = useState(saved?.email ?? '');

  const onSubmit = () => {
    if (choice === 'signIn') {
      router.push('/auth/sign-in');
      return;
    }
    useDraft.getState().setGuest({ fullName: fullName.trim(), phone: `${PHONE_PREFIX} ${phone.trim()}`, email: email.trim() || null });
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
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
          />
          <TextField
            label={t('guest.phone')}
            prefix={PHONE_PREFIX}
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/[^\d ]/g, ''))}
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
