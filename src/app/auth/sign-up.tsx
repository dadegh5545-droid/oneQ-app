import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';

export default function SignUpRoute() {
  const { t } = useTranslation();
  return (
    <Screen edges={[]}>
      <AppText variant="titleL">{t('screens.signUp')}</AppText>
    </Screen>
  );
}
