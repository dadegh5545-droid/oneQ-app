import { Alert, Platform } from 'react-native';

import i18n from '@/i18n';

// Asks before an action that cannot be undone (cancelling a booking, deleting a review). React Native's Alert has
// no buttons on the web, so the browser's own dialog is used there.
export function confirmAction(question: string, actionLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(question)) onConfirm();
    return;
  }
  Alert.alert(question, undefined, [
    { text: i18n.t('common.keep'), style: 'cancel' },
    { text: actionLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
