// The four preset sections (docs/BRIEF-OneQ-multi-section-v2.md §2), seeded by functions/seed-catalogue.
// Colours are sectionPalette keys (src/theme/sectionPalette.ts), never hex values; icons are keys of the fixed
// icon set. Gyms offer memberships and trainer sessions together (bookingMode "both").

type Category = { nameAr: string; nameEn: string };

export type SectionSeed = {
  slug: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  icon: string;
  colorKey: string;
  order: number;
  status: 'visible' | 'hidden';
  bookingMode: 'appointment' | 'subscription' | 'both';
  hasPractitioners: boolean;
  hasServices: boolean;
  hasDepartments: boolean;
  hasPackages: boolean;
  hasGallery: boolean;
  practitionerLabelAr: string;
  practitionerLabelEn: string;
  presetType: 'gym' | 'hospital' | 'clinic' | 'salon' | 'other';
  categories: Category[];
};

export const SECTIONS: SectionSeed[] = [
  {
    slug: 'gym',
    nameAr: 'نوادي رياضية',
    nameEn: 'Gyms',
    descAr: 'اشتراكات ومدربون شخصيون',
    descEn: 'Memberships and personal trainers',
    icon: 'dumbbell',
    colorKey: 'burgundy',
    order: 1,
    status: 'visible',
    bookingMode: 'both',
    hasPractitioners: true,
    hasServices: true,
    hasDepartments: false,
    hasPackages: false,
    hasGallery: true,
    practitionerLabelAr: 'مدرب',
    practitionerLabelEn: 'Trainer',
    presetType: 'gym',
    categories: [],
  },
  {
    // Customer screens for hospitals come later (brief §10), so the section starts hidden.
    slug: 'hospital',
    nameAr: 'مستشفيات',
    nameEn: 'Hospitals',
    descAr: 'أقسام طبية وفحوصات',
    descEn: 'Medical departments and check-ups',
    icon: 'hospital-building',
    colorKey: 'navy',
    order: 2,
    status: 'hidden',
    bookingMode: 'appointment',
    hasPractitioners: true,
    hasServices: true,
    hasDepartments: true,
    hasPackages: true,
    hasGallery: false,
    practitionerLabelAr: 'طبيب',
    practitionerLabelEn: 'Doctor',
    presetType: 'hospital',
    categories: [],
  },
  {
    slug: 'clinic',
    nameAr: 'عيادات',
    nameEn: 'Clinics',
    descAr: 'مواعيد مع الأطباء',
    descEn: 'Appointments with doctors',
    icon: 'stethoscope',
    colorKey: 'teal',
    order: 3,
    status: 'visible',
    bookingMode: 'appointment',
    hasPractitioners: true,
    hasServices: true,
    hasDepartments: false,
    hasPackages: false,
    hasGallery: false,
    practitionerLabelAr: 'طبيب',
    practitionerLabelEn: 'Doctor',
    presetType: 'clinic',
    categories: [
      { nameAr: 'طب عام', nameEn: 'General medicine' },
      { nameAr: 'علاج طبيعي وطب رياضي', nameEn: 'Physiotherapy and sports medicine' },
      { nameAr: 'جلدية وتجميل', nameEn: 'Dermatology and aesthetics' },
    ],
  },
  {
    slug: 'salon',
    nameAr: 'صالونات نسائية',
    nameEn: "Women's salons",
    descAr: 'في الصالون أو في منزلك',
    descEn: 'In the salon or at home',
    icon: 'face-woman-shimmer',
    colorKey: 'rose',
    order: 4,
    status: 'visible',
    bookingMode: 'appointment',
    hasPractitioners: true,
    hasServices: true,
    hasDepartments: false,
    hasPackages: false,
    hasGallery: true,
    practitionerLabelAr: 'أخصائية',
    practitionerLabelEn: 'Specialist',
    presetType: 'salon',
    categories: [
      { nameAr: 'شعر', nameEn: 'Hair' },
      { nameAr: 'أظافر', nameEn: 'Nails' },
      { nameAr: 'مكياج', nameEn: 'Makeup' },
      { nameAr: 'بشرة', nameEn: 'Skin care' },
      { nameAr: 'حناء', nameEn: 'Henna' },
    ],
  },
];
