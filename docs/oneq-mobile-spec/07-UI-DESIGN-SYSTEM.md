# 07 — UI Design System

Visual identity: **quiet luxury / boutique wellness** — warm cream backgrounds, a deep wine/burgundy primary, serif display headings, clean geometric sans body text, generous whitespace, soft rounded cards with hairline borders, almost no shadows. Built on **Material 3** in the original.

> Color values below were **sampled from rendered screenshots** (the live site is a canvas app, so exact hex constants could not be read directly). They are accurate to within a few RGB points; adjust if an official brand sheet exists.

## 1. Color tokens

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#5A0020` | Wine/burgundy. Splash background, primary buttons, selected chips/tabs text, prices, active tab, wordmark, focused borders, favorite (filled heart), selected date tile |
| `primaryPressed` | `#45001A` | Pressed state of primary buttons |
| `onPrimary` | `#FFFFFF` | Text/icons on primary |
| `primaryDisabled` | `#5A0020` @ 40 % (≈ `#B48A95` on cream) | Disabled primary button |
| `primaryTint` | `#F3E6E6` | Selected plan / payment row background, outlined button fill tint |
| `background` | `#F7F0EA` | App background (warm cream) |
| `surface` | `#FFFCF7` | Cards, inputs, bottom bar, unselected chips |
| `surfaceVariant` | `#F1E7DD` | Segmented control track, icon circles, skeletons, disabled date tile, unavailable time pill, image placeholder |
| `outline` | `#E7DBD1` | 1 pt borders on cards/inputs/chips, dividers |
| `textPrimary` | `#231A18` | Headlines, titles, values |
| `textSecondary` | `#7A6D68` | Subtitles, labels, muted text ("West Bay, Doha", greeting) |
| `textTertiary` | `#A89C96` | Disabled text, section labels (SUPPORT/SETTINGS/LEGAL) |
| `accent` | `#B5561E` | Rating star, "Save 10%", "Most Popular" |
| `success` | `#3F7A4F` | Status chip text, success check |
| `successTint` | `#E3EFE5` | Status chip background, success circle |
| `error` | `#A3302F` | Validation text & error borders |
| `overlayDark` | `#000000` @ 35 % | Circular buttons on photos |
| `snackbar` | `#241C1B` | Snackbar background (text `#FFFFFF`) |
| `splashUnderline` | `#F7F0EA` @ 70 % | Line under splash wordmark |

Dark mode: not present in the live app. Optional for rebuild (primary → `#C7657F`, background `#140E0D`, surface `#1E1716`).

## 2. Typography

Two Google Fonts:
- **Playfair Display** (serif) — display & page titles, wordmark, big numbers (date badge day).
- **Outfit** (geometric sans) — everything else.
- Arabic (rebuild): **IBM Plex Sans Arabic** or **Noto Kufi Arabic** for body, **Noto Naskh Arabic** / **Amiri** for display.

| Style | Font | Size / line | Weight | Used for |
|---|---|---|---|---|
| `displayXL` | Playfair Display | 64 / 72 | 700 | Splash wordmark |
| `displayL` | Playfair Display | 30 / 36 | 700 | Home headline "Find your perfect workout", gym name |
| `titleL` | Playfair Display | 28 / 34 | 700 | Page titles (Bookings, Favorites, Profile, Choose a plan, You're booked!, Welcome back) |
| `titleM` | Playfair Display | 22–24 / 28 | 600–700 | Empty-state titles, month label, "Welcome to OneQ", wordmark small (22) |
| `headline` | Outfit | 18–20 / 24 | 600 | Section titles (Featured Gyms, About, Facilities…), card titles, app-bar titles |
| `bodyL` | Outfit | 16 / 24 | 400 | Paragraphs (About, info pages), list-row labels |
| `bodyM` | Outfit | 15 / 21 | 400 | Subtitles, locations, greeting |
| `bodyS` | Outfit | 13 / 17 | 400–500 | Meta rows (reviews, yrs), dates, badges |
| `label` | Outfit | 14–16 / 20 | 600 | Buttons (16), chips (14), tabs (15) |
| `overline` | Outfit | 12 / 16, letter-spacing 0.8 | 600, uppercase | SUPPORT / SETTINGS / LEGAL |
| `price` | Outfit | 16–18 | 600–700, `primary` | Prices |

## 3. Spacing, sizing, radii

- Base unit **4 pt**. Common: 4, 8, 12, 16, 20, 24, 32.
- Screen horizontal padding: **20 pt**. Section spacing: 24–32 pt. Card inner padding: 16 pt (plan/summary cards 16–20).
- Radii: inputs **16**, cards **16**, chips/pills **full (999)** for category chips, **12** for time pills and thumbnails, **14** date tiles, **20** large empty-state card, **12** snackbar, images in cards 12–16.
- Borders: 1 pt `outline`; selected 1.2–1.4 pt `primary`.
- Elevation: essentially flat (0). Use at most a subtle shadow (y 2, blur 8, 4 % black) on the bottom bar in native.
- Touch targets ≥ 44 pt (icon buttons are 40 pt circles inside 44 pt hit areas).

| Component | Size |
|---|---|
| Primary / outlined button | height 52, full width, radius 16 |
| Small outlined button (Sign out) | height 44 |
| Text button | height 32 |
| Search field | height 48 |
| Category chip | height 37, horizontal padding 16 |
| Segmented control | height 41 (track padding 4) |
| Bottom tab bar | 64 + safe area |
| App bar | 56 |
| Featured gym card | 228 × 287 (image 200 tall) |
| Near-you card | 220 × 88 (image 88 × 88) |
| Gym list card | full width × 114 (image 80 × 80) |
| Trainer card | full width × 135 (image 82 × 82) |
| Booking card | full width × 115–139 (image 72 × 88) |
| Date tile | 58 × 76 |
| Time pill | height 37, min width 74 |
| Gym hero | full width × 242 |
| Icon circle (empty states) | 64 |
| Success badge | 72 |

## 4. Components

1. **PrimaryButton** — filled `primary`, white Outfit 16/600, radius 16, height 52; disabled 40 % opacity; loading shows 20 pt white spinner replacing label.
2. **OutlinedButton** — `primary` 1 pt border, `primary` text, transparent or `primaryTint` fill.
3. **TextButton** — `primary` text, no border.
4. **IconCircleButton** — 40 pt circle; on photos: translucent dark with white icon; on cards: outlined heart.
5. **SearchField** — see 06.
6. **Chip (category/filter)** — pill; selected: `primary` fill + white text; unselected: `surface` + `outline` border + `textPrimary`.
7. **SegmentedControl** — track `surfaceVariant` radius 14; selected segment `surface` radius 12 with `primary` 600 text; unselected `textSecondary`.
8. **GymCardFeatured**, **GymCardCompact**, **GymListCard**, **TrainerCard**, **BookingCard**, **ReviewCard**, **PlanCard**, **PathCard** (icon tile + title + subtitle + price + chevron), **SummaryCard** (title "Booking Summary", label/value rows, divider, total in primary), **StatRow** (3 columns with dividers), **FacilityChip** (label + small icon), **InfoRow** (label + value + chevron, 56 tall), **SectionLabel** (overline), **RadioOptionCard**, **PaymentMethodRow**, **DateTile**, **TimePill** (available / selected / unavailable-strikethrough), **StatusChip** (Confirmed / Completed / Cancelled), **DateBadge** (day Playfair 22 + month overline), **EmptyState**, **Skeleton**, **Snackbar**, **PageDots**.
9. **RatingInline** — value (Outfit 13/600) + star icon in `accent` + "· 128 reviews" muted.

## 5. Icons

Material Symbols (rounded/outlined) in the original. Map to `@expo/vector-icons` MaterialIcons / MaterialCommunityIcons or Phosphor:
home, calendar_today, favorite / favorite_border, person / person_outline, search, search_off, arrow_back, chevron_right (mirrored in RTL), star, fitness_center (dumbbell — Gym Membership, Weights), person (Personal Trainer), directions_run (Cardio), pool, hot_tub/sauna, lock (Locker Rooms), local_parking (Parking), groups (Classes), person_off (trainer not found), check / check_circle, radio_button_checked / unchecked, credit_card, visibility / visibility_off, event (calendar empty state), apple (Apple Pay), google (Google Pay).

## 6. Imagery

- Photography: moody, desaturated gym interiors (some black-and-white), dumbbell racks, trainers mid-exercise. Source in mock: Unsplash (`images.unsplash.com/photo-…?auto=format&fit=crop&w=1400&q=80` for gyms, `w=900` for trainers) plus two local assets (`assets/images/power-house.jpg`, `assets/images/noura-abdullah.jpg`).
- Aspect ratios: hero 16:10, cards ~8:7, thumbnails 1:1, trainer portrait ~4:5.
- Placeholders: `surfaceVariant` block with small centered primary spinner.

## 7. Motion

- Splash: fade-in of "One" (300 ms), reveal of "Q" + underline (400 ms), then overlay fade/scale to Home (500 ms, ease-out).
- Page transitions: platform default (iOS slide, Android fade-through).
- Chips/tabs: color transition 200 ms.
- Selection (plan, time, payment): ripple + border color change 150 ms; add light haptic in native.
- Success badge: scale 0.6 → 1.0 with overshoot (400 ms) + success haptic.
- Skeletons: static tint (optionally slow shimmer 1.2 s).
- Respect OS Reduce Motion.

## 8. Layout & responsiveness

- The live site is a **single-column phone layout that simply stretches** on wide screens (cards keep fixed widths, large empty areas on desktop). There is no tablet/desktop layout.
- Mobile rebuild: design for 360–430 pt widths; on tablets (≥ 768) use max content width 600 centered, or 2-column grids for gym lists.
- Always wrap content in SafeArea; sticky bottom CTA bars sit above the home indicator with 16 pt padding and a top hairline.
- Directionality: LTR for English, RTL for Arabic (mirror chevrons/back arrows, not media/logos). Keep numbers and times in Latin digits unless the user opts in.

## 9. Theme implementation (TypeScript)

```ts
export const colors = {
  primary: '#5A0020', primaryPressed: '#45001A', onPrimary: '#FFFFFF',
  primaryTint: '#F3E6E6', background: '#F7F0EA', surface: '#FFFCF7',
  surfaceVariant: '#F1E7DD', outline: '#E7DBD1',
  textPrimary: '#231A18', textSecondary: '#7A6D68', textTertiary: '#A89C96',
  accent: '#B5561E', success: '#3F7A4F', successTint: '#E3EFE5',
  error: '#A3302F', snackbar: '#241C1B', overlayDark: 'rgba(0,0,0,0.35)',
} as const;
export const radius = { sm: 12, md: 16, lg: 20, pill: 999, tile: 14 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const fonts = {
  display: 'PlayfairDisplay_700Bold', displaySemi: 'PlayfairDisplay_600SemiBold',
  body: 'Outfit_400Regular', bodyMedium: 'Outfit_500Medium', bodySemi: 'Outfit_600SemiBold', bodyBold: 'Outfit_700Bold',
} as const;
```
