// Validation rules from 06-FORMS-AND-FIELDS.md (rebuild rules, stricter than the live site).
// Validators return an i18n key under `validation.*`, or null when valid.

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

const localDigits = (raw: string) => raw.replace(/\D/g, '').replace(/^974/, '');

// Qatar mobile: exactly 8 digits starting with 3, 5, 6 or 7.
export const isValidQatarMobile = (raw: string) => /^[3567]\d{7}$/.test(localDigits(raw));

// Stored format "+974 XXXX XXXX" (12 §3).
export const normaliseQatarPhone = (raw: string) => {
  const d = localDigits(raw);
  return `+974 ${d.slice(0, 4)} ${d.slice(4, 8)}`;
};

// Display format for the local part while typing: "3333 4444".
export const formatLocalPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (v: string) => EMAIL.test(v.trim());

// Latin and Arabic letters, spaces and common name punctuation.
const NAME = /^[A-Za-zÀ-ɏ؀-ۿ\s'.-]+$/;
export const isValidFullName = (v: string) => {
  const s = v.trim();
  return s.length >= 3 && s.length <= 60 && NAME.test(s);
};

// At least 8 characters with a letter and a number.
export const isValidPassword = (v: string) => v.length >= 8 && /[A-Za-z؀-ۿ]/.test(v) && /\d/.test(v);

export type GuestValues = { fullName: string; phone: string; email: string };

export function validateGuest(v: GuestValues): FieldErrors<keyof GuestValues> {
  return {
    ...(isValidFullName(v.fullName) ? {} : { fullName: 'validation.fullName' }),
    ...(isValidQatarMobile(v.phone) ? {} : { phone: 'validation.phone' }),
    ...(v.email.trim() === '' || isValidEmail(v.email) ? {} : { email: 'validation.email' }),
  };
}

export type SignInValues = { identifier: string; password: string };

export function validateSignIn(v: SignInValues): FieldErrors<keyof SignInValues> {
  return {
    ...(v.identifier.trim() ? {} : { identifier: 'validation.identifier' }),
    ...(v.password ? {} : { password: 'validation.password' }),
  };
}

export type SignUpValues = GuestValues & { password: string; confirm: string; acceptTerms: boolean };

export function validateSignUp(v: SignUpValues): FieldErrors<keyof SignUpValues> {
  return {
    ...(isValidFullName(v.fullName) ? {} : { fullName: 'validation.fullName' }),
    ...(isValidEmail(v.email) ? {} : { email: 'validation.email' }),
    ...(isValidQatarMobile(v.phone) ? {} : { phone: 'validation.phone' }),
    ...(isValidPassword(v.password) ? {} : { password: 'validation.passwordRule' }),
    ...(v.confirm === v.password ? {} : { confirm: 'validation.passwordMatch' }),
    ...(v.acceptTerms ? {} : { acceptTerms: 'validation.terms' }),
  };
}

export type ResetValues = { code: string; password: string; confirm: string };

export function validateReset(v: ResetValues): FieldErrors<keyof ResetValues> {
  return {
    ...(/^\d{6}$/.test(v.code.trim()) ? {} : { code: 'validation.code' }),
    ...(isValidPassword(v.password) ? {} : { password: 'validation.passwordRule' }),
    ...(v.confirm === v.password ? {} : { confirm: 'validation.passwordMatch' }),
  };
}

export const hasErrors = (e: object) => Object.keys(e).length > 0;
