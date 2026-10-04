import type { IconName } from '@/components/Icon';
import type { PresetType, SectionInput } from '@/domain/dashboard';
import type { SectionInfo } from '@/data/amplify/dashboardRepository';

// The fixed icon set for sections (keys stored in Section.icon) and the wizard's preset answers
// (BRIEF v2 §2; gyms offer memberships and trainers together in v3).

export const SECTION_ICONS: IconName[] = [
  'dumbbell',
  'hospital-building',
  'stethoscope',
  'face-woman-shimmer',
  'tooth-outline',
  'spa-outline',
  'hair-dryer-outline',
  'yoga',
  'swim',
  'run',
  'basketball',
  'heart-pulse',
  'pill',
  'eye-outline',
  'baby-face-outline',
  'paw',
  'home-city-outline',
  'school-outline',
  'car-outline',
  'silverware-fork-knife',
  'briefcase-outline',
  'home-heart',
  'flask-outline',
  'account-heart-outline',
];

export const PRESET_TYPES: PresetType[] = ['gym', 'hospital', 'clinic', 'salon', 'other'];

const base = (preset: PresetType): Omit<SectionInput, 'nameAr' | 'nameEn' | 'order'> => ({
  descAr: null,
  descEn: null,
  icon: 'briefcase-outline',
  colorKey: 'slate',
  status: 'hidden',
  bookingMode: 'appointment',
  hasPractitioners: false,
  hasServices: false,
  hasDepartments: false,
  hasPackages: false,
  hasGallery: false,
  practitionerLabelAr: null,
  practitionerLabelEn: null,
  presetType: preset,
  categories: [],
});

export function presetAnswers(preset: PresetType, order: number): SectionInput {
  switch (preset) {
    case 'gym':
      return { ...base(preset), nameAr: 'نوادي رياضية', nameEn: 'Gyms', order, icon: 'dumbbell', colorKey: 'burgundy', bookingMode: 'both', hasPractitioners: true, hasServices: true, hasGallery: true, practitionerLabelAr: 'مدرب', practitionerLabelEn: 'Trainer' };
    case 'hospital':
      return { ...base(preset), nameAr: 'مستشفيات', nameEn: 'Hospitals', order, icon: 'hospital-building', colorKey: 'navy', hasPractitioners: true, hasServices: true, hasDepartments: true, hasPackages: true, practitionerLabelAr: 'طبيب', practitionerLabelEn: 'Doctor' };
    case 'clinic':
      return {
        ...base(preset),
        nameAr: 'عيادات',
        nameEn: 'Clinics',
        order,
        icon: 'stethoscope',
        colorKey: 'teal',
        hasPractitioners: true,
        hasServices: true,
        practitionerLabelAr: 'طبيب',
        practitionerLabelEn: 'Doctor',
        categories: [
          { id: null, nameAr: 'طب عام', nameEn: 'General medicine' },
          { id: null, nameAr: 'علاج طبيعي وطب رياضي', nameEn: 'Physiotherapy and sports medicine' },
          { id: null, nameAr: 'جلدية وتجميل', nameEn: 'Dermatology and aesthetics' },
        ],
      };
    case 'salon':
      return {
        ...base(preset),
        nameAr: 'صالونات نسائية',
        nameEn: "Women's salons",
        order,
        icon: 'face-woman-shimmer',
        colorKey: 'rose',
        hasPractitioners: true,
        hasServices: true,
        hasGallery: true,
        practitionerLabelAr: 'أخصائية',
        practitionerLabelEn: 'Specialist',
        categories: ['شعر|Hair', 'أظافر|Nails', 'مكياج|Makeup', 'بشرة|Skin care', 'حناء|Henna'].map((c) => {
          const [nameAr, nameEn] = c.split('|');
          return { id: null, nameAr: nameAr!, nameEn: nameEn! };
        }),
      };
    default:
      return { ...base(preset), nameAr: '', nameEn: null, order };
  }
}

export const toSectionInput = (s: SectionInfo, categories: SectionInput['categories']): SectionInput => ({
  nameAr: s.nameAr,
  nameEn: s.nameEn,
  descAr: s.descAr,
  descEn: s.descEn,
  icon: s.icon,
  colorKey: s.colorKey,
  order: s.order,
  status: s.status,
  bookingMode: s.bookingMode,
  hasPractitioners: s.hasPractitioners,
  hasServices: s.hasServices,
  hasDepartments: s.hasDepartments,
  hasPackages: s.hasPackages,
  hasGallery: s.hasGallery,
  practitionerLabelAr: s.practitionerLabelAr,
  practitionerLabelEn: s.practitionerLabelEn,
  presetType: s.presetType,
  categories,
});
