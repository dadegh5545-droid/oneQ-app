import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';

export default function GuestRoute() {
  const { t } = useTranslation();
  return (
    <Screen edges={[]}>
      <AppText variant="titleL">{t('screens.guest')}</AppText>
    </Screen>
  );
}
