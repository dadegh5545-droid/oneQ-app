import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';

export default function SuccessRoute() {
  const { t } = useTranslation();
  return (
    <Screen>
      <AppText variant="titleL">{t('screens.success')}</AppText>
    </Screen>
  );
}
