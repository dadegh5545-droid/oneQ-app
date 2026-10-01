# OneQ — approved design boards (reference for Claude Code)

Source of truth: the OneQ design canvas on claude.ai (33 boards). This folder is an exported copy so Claude Code can read it inside the repo.

- `boards/` — PNG of every board (2x). Phone boards are 390 px wide; dashboards 1280 px.
- `source/` — the HTML source of each board (exact colours, sizes, spacing, text). Read these for precise values; the PNG is the visual check.

## Rules when using these boards
- They are **visual references**, not code to copy. Build with the app's own components and the theme tokens.
- Photos are **placeholders** (dark striped blocks with a caption). Use real photos in the app.
- Facility and person names are **fictional placeholders**. Boards 1–21 still show "Power House" / "Oxygen Club" — do **not** use these names (they are real Doha gyms).
- Numbers and prices are sample data.
- Section accent colours (proposed, approved by Rodeo, final client sign-off pending): gyms `#5A0020`, hospitals `#1F4E79`, clinics `#2F6B67`, salons `#A34A6B`. Brand: burgundy `#5A0020`, cream `#F7F0EA`, surface `#FFFCF7`, line `#E7DBD1`, ink `#231A18`, muted `#7A6D68`, gold `#B5561E`. Fonts: Playfair Display (wordmark), Noto Kufi Arabic (Arabic headings), IBM Plex Sans Arabic (body).
- Hospitals have **no boards yet**; build them in the same pattern as clinics (boards 26–28, 32) with the navy accent — boards will be added after Rodeo says "صمّم".
- Boards 16 (bold style) and 22–24 (animated intro) are optional explorations, not part of the current scope unless Rodeo confirms.

## Board index
| # | File | Screen | Size |
|---|---|---|---|
| 01 | boards/01-Main.png · source/Main.dc.html | شاشة البداية | 390×844 |
| 02 | boards/02-Onboarding.png · source/Onboarding.dc.html | الترحيب | 390×844 |
| 03 | boards/03-Home.png · source/Home.dc.html | الرئيسية | 390×1480 |
| 04 | boards/04-Gym.png · source/Gym.dc.html | صفحة النادي | 390×1300 |
| 05 | boards/05-Success.png · source/Success.dc.html | تم الاشتراك | 390×844 |
| 06 | boards/06-Owner.png · source/Owner.dc.html | لوحة صاحب النادي | 1280×820 |
| 07 | boards/07-Quiz.png · source/Quiz.dc.html | اختبار الهدف | 390×844 |
| 08 | boards/08-Plan.png · source/Plan.dc.html | خطتك جاهزة | 390×844 |
| 09 | boards/09-Map.png · source/Map.dc.html | خريطة النوادي | 390×844 |
| 10 | boards/10-Booking.png · source/Booking.dc.html | حجز جلسة | 390×844 |
| 11 | boards/11-Membership.png · source/Membership.dc.html | اشتراكي | 390×1000 |
| 12 | boards/12-Checkin.png · source/Checkin.dc.html | دخول النادي بالـ QR | 390×844 |
| 13 | boards/13-Progress.png · source/Progress.dc.html | تقدّمي | 390×844 |
| 14 | boards/14-OwnerInsights.png · source/OwnerInsights.dc.html | تنبيهات ذكية وأوقات الذروة | 1280×900 |
| 15 | boards/15-OwnerMember.png · source/OwnerMember.dc.html | ملف عضو | 1280×820 |
| 16 | boards/16-HomeBold.png · source/HomeBold.dc.html | الرئيسية بستايل رياضي جريء | 390×844 |
| 17 | boards/17-Classes.png · source/Classes.dc.html | الحصص وقائمة الانتظار | 390×844 |
| 18 | boards/18-Freeze.png · source/Freeze.dc.html | تجميد الاشتراك | 390×844 |
| 19 | boards/19-Notifications.png · source/Notifications.dc.html | الإشعارات | 390×844 |
| 20 | boards/20-OwnerAtRisk.png · source/OwnerAtRisk.dc.html | الاحتفاظ بالعملاء | 1280×900 |
| 21 | boards/21-WhyOneQ.png · source/WhyOneQ.dc.html | لماذا OneQ — صفحة البيع | 1280×900 |
| 22 | boards/22-Intro1.png · source/Intro1.dc.html | ترحيب متحرك — تمرين | 390×844 |
| 23 | boards/23-Intro2.png · source/Intro2.dc.html | ترحيب متحرك — جري | 390×844 |
| 24 | boards/24-Intro3.png · source/Intro3.dc.html | ترحيب متحرك — حديد | 390×844 |
| 25 | boards/25-Hub.png · source/Hub.dc.html | الرئيسية بالأقسام | 390×844 |
| 26 | boards/26-Clinics.png · source/Clinics.dc.html | العيادات | 390×844 |
| 27 | boards/27-Clinic.png · source/Clinic.dc.html | صفحة العيادة | 390×1300 |
| 28 | boards/28-ClinicBooking.png · source/ClinicBooking.dc.html | حجز موعد عيادة | 390×1000 |
| 29 | boards/29-Salons.png · source/Salons.dc.html | الصالونات النسائية | 390×844 |
| 30 | boards/30-Salon.png · source/Salon.dc.html | صفحة الصالون | 390×1150 |
| 31 | boards/31-SalonBooking.png · source/SalonBooking.dc.html | حجز خدمة صالون | 390×960 |
| 32 | boards/32-ClinicOwner.png · source/ClinicOwner.dc.html | لوحة العيادة | 1280×800 |
| 33 | boards/33-SalonOwner.png · source/SalonOwner.dc.html | لوحة الصالون | 1280×800 |