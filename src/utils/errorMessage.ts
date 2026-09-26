import { RepositoryError } from '@/data/repository';
import i18n from '@/i18n';

// Maps repository errors to user-facing copy (`errors.*`).
export const errorMessage = (e: unknown) =>
  e instanceof RepositoryError ? i18n.t(`errors.${e.code}`) : i18n.t('errors.generic');
