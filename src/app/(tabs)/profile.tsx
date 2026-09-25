import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';

export default function ProfileRoute() {
  const { t } = useTranslation();
  return (
    <Screen>
      <AppText variant="titleL">{t('tabs.profile')}</AppText>
    </Screen>
  );
}
