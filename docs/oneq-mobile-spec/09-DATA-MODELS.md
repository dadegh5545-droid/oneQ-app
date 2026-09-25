# 09 — Data Models & Seed Data

All models and data below were extracted from the live app's compiled code and local storage. Field names in the **Booking** JSON are exactly those the app persists; other field names are reconstructed from usage.

## 1. Entities (TypeScript)

```ts
type Amenity = { key: 'weights'|'cardio'|'pool'|'sauna'|'lockers'|'parking'; label: string };

type OpeningHours = { day: 'Saturday'|'Sunday'|'Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'; open: string; close: string }; // "6:00 AM"

interface Gym {
  id: string;                // slug, e.g. "power-house"
  name: string;
  area: string;              // "West Bay"  → displayed as `${area}, Doha`
  description: string;
  rating: number;            // 4.9
  reviewCount: number;       // 128
  monthlyPrice: number;      // QAR, base for plans
  trainerFromMonthly: number;// QAR, shown on "Train with a Personal Trainer" card ("From QAR 499 / month")
  images: string[];          // first = cover
  amenities: Amenity[];
  address: string;           // "Tornado Tower, West Bay, Doha"
  isFeatured: boolean;       // Featured Gyms carousel
  isNearby: boolean;         // Near You carousel (when not featured)
  flag3: boolean;            // 3rd boolean in source; purpose not visible in UI (probably isVerified / isActive)
  openingHours: OpeningHours[]; // same for all gyms in mock
  // rebuild additions:
  latitude?: number; longitude?: number; phone?: string; whatsapp?: string; nameAr?: string; descriptionAr?: string;
}

interface MembershipPlan {
  id: string;            // `${gymId}-monthly` | `${gymId}-3m` | `${gymId}-6m`
  name: string;          // "Monthly" | "3 Months" | "6 Months"
  price: number;         // QAR total for the period
  description: string;
  badge?: string | null; // "Save 10%" | "Most Popular"
  // rebuild: gymId, durationMonths, isActive, sortOrder
}

interface Trainer {
  id: string;            // "omar-alkuwari"
  gymId: string;
  name: string;
  title: string;         // "Performance Coach"
  bio: string;
  image: string;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  languages: string[];
  specialties: Specialty[];
  certifications: string[];
  pricePerSession: number; // QAR
}
type Specialty = 'Strength Training'|'Weight Loss'|'Mobility'|'Functional Training';

interface Review {
  id: string;            // "gr-1" (gym) | "tr-1" (trainer)
  authorName: string;
  date: string;          // ISO date, shown as "12 Jul 2026"
  gymId: string | null;
  trainerId: string | null;
  rating: number;        // 1–5, shown "5.0"
  text: string;
  // UI always shows a "Verified" badge
}

interface TimeSlot { id: string /* `${isoDate}-${index}` */; minutes: number; available: boolean } // label derived "6:30 PM"

type BookingType = 'membership' | 'session';
type BookingStatus = 'confirmed' | 'completed' | 'cancelled';
type MembershipPath = 'membership' | 'membershipPlusTrainer';
type PaymentMethod = 'card' | 'applePay' | 'googlePay';

interface GuestInfo { fullName: string; phone: string; email: string | null }

interface Booking {           // exact persisted JSON shape
  id: string;                 // "bk-1790361717801" (bk- + epoch ms)
  type: BookingType;
  gymId: string;
  gymName: string;
  gymLocation: string;        // "West Bay, Doha"
  trainerId: string | null;
  trainerName: string | null;
  planId: string | null;      // "power-house-3m"
  planName: string | null;    // "3 Months"
  date: string | null;        // ISO local date-time, sessions only
  timeLabel: string | null;   // "6:30 PM"
  sessionCount: number;       // always 1
  priceQar: number;
  status: BookingStatus;
  guest: GuestInfo;
  createdAt: string;          // ISO local date-time
}

interface BookingDraft {
  gym?: Gym; path?: MembershipPath; plan?: MembershipPlan; trainer?: Trainer;
  date?: string; slot?: TimeSlot; guest?: GuestInfo; paymentMethod: PaymentMethod; // default 'card'
}

interface Session { signedIn: boolean; displayName: string | null /* default "Member" */ }
```

Derived rules:
- `isUpcoming(b)`: if status ∈ {completed, cancelled} → false; if `date == null` → status == confirmed; else `endOfDay(date) >= now`.
- Booking card title: `trainerName ?? planName ?? "Membership"`; thumbnail: trainer image (session) else gym `images[0]`.
- `total(draft)`: membership → `plan.price ?? gym.monthlyPrice`; session → `trainer.pricePerSession`.
- Time label: `h = floor(min/60)`, `m = min%60`, `AM/PM`, hour 0→12, minutes 2-digit.

## 2. Local persistence (live app, SharedPreferences → localStorage with `flutter.` prefix)

| Key | Type | Example |
|---|---|---|
| `oneq.favorites` | string list | `["power-house"]` |
| `oneq.bookings` | JSON string (array of Booking) | see §1 |
| `oneq.signedIn` | bool | `true` |

Rebuild: keep a local cache (MMKV/AsyncStorage) with the same keys for offline and guest use; source of truth moves to the backend.

## 3. Seed data — Gyms

Common opening hours (all gyms): Saturday–Thursday **6:00 AM – 11:00 PM**; Friday **8:00 AM – 10:00 PM**. Display order: Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday, Friday.

| id | name | area | rating | reviews | monthly | PT from | featured | nearby | flag3 | amenities | address |
|---|---|---|---|---|---|---|---|---|---|---|---|
| power-house | Power House | West Bay | 4.9 | 128 | 299 | 499 | ✓ | ✓ | ✓ | Weights, Cardio, Pool, Sauna, Locker Rooms, Parking | Tornado Tower, West Bay, Doha |
| oxygen-gym | Oxygen Gym | Lusail | 4.8 | 96 | 349 | 549 | ✓ | – | ✓ | Weights, Cardio, Pool, Sauna, Locker Rooms, Parking | Lusail Boulevard, Lusail, Doha |
| arena-fitness | Arena Fitness | The Pearl | 4.7 | 84 | 279 | 479 | – | ✓ | ✓ | Weights, Cardio, Sauna, Locker Rooms, Parking | Porto Arabia, The Pearl, Doha |
| peak-performance | Peak Performance | Al Waab | 4.8 | 73 | 259 | 459 | – | ✓ | – | Weights, Cardio, Locker Rooms, Parking | Al Waab Street, Al Waab, Doha |
| core-studio | Core Studio | Msheireb | 4.6 | 51 | 229 | 429 | – | ✓ | ✓ | Weights, Cardio, Locker Rooms | Msheireb Downtown, Doha |
| atlas-athletics | Atlas Athletics | Al Sadd | 4.5 | 112 | 199 | 399 | – | – | ✓ | Weights, Cardio, Locker Rooms, Parking | Al Sadd Street, Al Sadd, Doha |

Descriptions:
- **Power House** — "A refined strength club in West Bay with open floors, serious equipment, and a calm, focused atmosphere. Built for people who want a premium gym without the noise."
- **Oxygen Gym** — "A bright, contemporary club in Lusail with wide cardio terraces, recovery rooms, and a membership culture that feels considered rather than crowded."
- **Arena Fitness** — "A polished neighborhood club on The Pearl. Intimate floors, excellent coaching culture, and a membership that feels personal from the first visit."
- **Peak Performance** — "A performance-minded gym in Al Waab with serious strength equipment, mobility space, and coaches who treat programming as a craft."
- **Core Studio** — "A quieter studio in Msheireb for strength, mobility, and small-group training. Designed for people who prefer space and intention over spectacle."
- **Atlas Athletics** — "A well-loved Al Sadd club with a strong community feel, reliable equipment, and trainers who know how to coach both beginners and athletes."

Images: Power House 4 (local `power-house.jpg` + 3 Unsplash), Oxygen 3, Arena 3, Peak 3, Core 2, Atlas 2 — all Unsplash gym photos (`https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=1400&q=80`). Known IDs: `photo-1593079831268-3381b0db4a77`, `photo-1554344728-77cf90d9ed26`. Replace with real gym photography.

## 4. Seed data — Trainers

| id | gym | name | title | rating | reviews | yrs | languages | specialties | certifications | QAR/session |
|---|---|---|---|---|---|---|---|---|---|---|
| noura-abdullah | power-house | Noura Abdullah | Certified Personal Trainer | 4.7 | 50 | 12 | Arabic, English | Strength Training, Weight Loss, Mobility, Functional Training | Certified Personal Trainer; Sports Nutrition Certification; Strength & Conditioning Certification | 200 |
| james-mitchell | power-house | James Mitchell | Strength Coach | 4.8 | 64 | 9 | English | Strength Training, Functional Training | Certified Strength & Conditioning Specialist; Level 2 Olympic Lifting Coach | 220 |
| omar-alkuwari | oxygen-gym | Omar Al-Kuwari | Performance Coach | 4.9 | 41 | 8 | Arabic, English | Weight Loss, Strength Training, Functional Training | Certified Personal Trainer; Corrective Exercise Specialist | 210 |
| sofia-moretti | oxygen-gym | Sofia Moretti | Mobility & Strength Coach | 4.8 | 37 | 7 | English, Italian | Mobility, Strength Training | Certified Personal Trainer; Mobility Specialist | 190 |
| layla-hassan | arena-fitness | Layla Hassan | Personal Trainer | 4.6 | 29 | 6 | Arabic, English, French | Weight Loss, Mobility | Certified Personal Trainer; Sports Nutrition Certification | 180 |
| khalid-rahman | peak-performance | Khalid Rahman | Athletic Performance Coach | 4.7 | 45 | 11 | Arabic, English, Urdu | Strength Training, Functional Training | Strength & Conditioning Certification; Certified Personal Trainer | 195 |
| maya-fernandes | core-studio | Maya Fernandes | Functional Training Coach | 4.5 | 22 | 5 | English, Portuguese | Functional Training, Weight Loss, Mobility | Certified Personal Trainer; Functional Movement Certification | 170 |
| hassan-elamin | atlas-athletics | Hassan Elamin | Personal Trainer | 4.6 | 58 | 10 | Arabic, English | Weight Loss, Strength Training | Certified Personal Trainer; Sports Nutrition Certification | 160 |

Bios:
- **Noura** — "Noura coaches with quiet precision. She blends strength work, mobility, and nutrition habits that fit Doha life — early mornings, late evenings, and everything in between."
- **James** — "James builds programs that feel athletic without being theatrical. His sessions are structured, measurable, and designed around long-term strength."
- **Omar** — "Omar works with busy professionals who want results without living in the gym. His coaching is direct, warm, and grounded in consistency."
- **Sofia** — "Sofia helps members move better before they lift heavier. Her sessions feel considered — strong, unhurried, and built around how the body actually works."
- **Layla** — "Layla is known for making first sessions feel easy to start. She coaches women and men who want a calmer, more personal approach to fitness."
- **Khalid** — "Khalid trains with a performance mindset — clean technique, honest effort, and programming that respects recovery as much as intensity."
- **Maya** — "Maya keeps training simple and repeatable. Her clients come for clarity — a plan they can keep, and a coach who notices the details."
- **Hassan** — "Hassan has coached in Doha for a decade. He is practical, encouraging, and especially good with members returning to training after a long pause."

Images: Noura local asset `noura-abdullah.jpg`; others Unsplash (`w=900`): James `photo-1571019614242-c5c5dee9f50b`, Omar `photo-1583454110551-21f2fa2afe61`, Sofia `photo-1518611012118-696072aa579a`, Layla `photo-1518310383802-640c2de311b2`, Khalid `photo-1567013127542-490d757e51fc`, Maya `photo-1571019613454-1cb2f99b2d8b`, Hassan `photo-1599058945522-28d584b6f14f`.

## 5. Seed data — Reviews (all 2026)

Gym reviews:
| id | gym | author | rating | date | text |
|---|---|---|---|---|---|
| gr-1 | power-house | Sara Al-Ansari | 5 | 12 Jul | Clean, well kept, and never feels chaotic. The West Bay location makes early sessions easy. |
| gr-2 | power-house | Daniel Craig | 5 | 28 Jun | Serious equipment without the nightclub lighting. This is the gym I actually look forward to. |
| gr-3 | power-house | Maha Farid | 4 | 19 May | Beautiful floors and excellent lockers. Peak hours can fill, but staff manage it well. |
| gr-4 | oxygen-gym | Yousef Nasser | 5 | 2 Jul | Lusail's best-kept club. Light, spacious, and the recovery rooms are genuinely useful. |
| gr-5 | oxygen-gym | Elena Petrova | 4 | 8 Jun | A polished membership experience. Classes are well run and the floor never feels neglected. |
| gr-6 | arena-fitness | Noor Al-Thani | 5 | 21 Jul | Smaller than the big clubs, which is exactly why I stay. It feels personal. |
| gr-7 | peak-performance | Ahmed Saleh | 5 | 15 Jun | If you care about lifting well, this is the room. Coaches notice form without hovering. |
| gr-8 | core-studio | Hana Ibrahim | 4 | 30 May | Quiet, considered, and easy to settle into after work in Msheireb. |
| gr-9 | atlas-athletics | Peter Walsh | 4 | 4 Jul | Friendly without being loud. Good value and a solid community in Al Sadd. |

Trainer reviews:
| id | trainer | author | rating | date | text |
|---|---|---|---|---|---|
| tr-1 | noura-abdullah | Aisha Rahman | 5 | 18 Jul | Noura is exacting in the best way. I got stronger without feeling rushed or overwhelmed. |
| tr-2 | noura-abdullah | Thomas Reid | 5 | 22 Jun | Clear programming and a calm presence. Sessions feel premium, not performative. |
| tr-3 | noura-abdullah | Lina Qassim | 4 | 11 May | Thoughtful about recovery and busy weeks. I finally have a plan I can keep. |
| tr-4 | james-mitchell | Faris Haddad | 5 | 9 Jul | James made strength training feel intelligent. My numbers moved, and so did my confidence. |
| tr-5 | omar-alkuwari | Reem Al-Kuwari | 5 | 30 Jun | Omar understands Doha schedules. Forty-five minutes, no wasted motion. |
| tr-6 | sofia-moretti | Claire Bennett | 5 | 14 Jul | My shoulders finally feel open again. Sofia is precise and kind. |
| tr-7 | layla-hassan | Maryam Saleh | 5 | 3 Jun | A gentle start that still produced results. I never felt talked down to. |
| tr-8 | khalid-rahman | Samir Aziz | 4 | 27 May | Demanding, fair, and very good on technique. Worth the drive to Al Waab. |

(Maya Fernandes and Hassan Elamin have no reviews → "No reviews yet.")

## 6. Enumerations & constants

| Name | Values |
|---|---|
| Home categories | all, gyms, classes, trainers |
| Specialty filter chips | All, Strength (→ "Strength Training"), Weight Loss, Mobility, Functional Training |
| Time slots (minutes) | 540, 630, 720, 960, 1110, 1200 |
| Date window | 14 days from today |
| Closed weekday | Sunday |
| Unavailable (Fri, Sat) | slot 0 (9:00 AM), slot 3 (4:00 PM) |
| Unavailable (Mon–Thu) | slot 2 (12:00 PM) |
| Payment simulation delay | 900 ms |
| Snackbar duration | 4 s |
| Currency format | `"QAR " + NumberFormat('en').format(n)` |
| Date formats | `d MMM y` (summary/reviews), `d MMMM y` (details/success), `MMMM y` (month label), `d MMM` + uppercase month (booking badge), weekday `EEE` (date tiles) |
| Phone default | "+974 ", hint "+974 3000 0000" |
