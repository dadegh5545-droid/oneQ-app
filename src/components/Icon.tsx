import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { isRTL } from '@/i18n';
import { colors } from '@/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  // Mirror arrows/chevrons in RTL (07 §8); never mirror logos or media.
  directional?: boolean;
};

export function Icon({ name, size = 20, color = colors.textPrimary, directional }: Props) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      style={directional && isRTL() ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}
