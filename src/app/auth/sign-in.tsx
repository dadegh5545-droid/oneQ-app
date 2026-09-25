import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';

export default function SignInRoute() {
  const { t } = useTranslation();
  return (
    <Screen edges={[]}>
      <AppText variant="titleL">{t('screens.signIn')}</AppText>
    </Screen>
  );
}
