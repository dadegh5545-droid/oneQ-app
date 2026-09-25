# 06 — Forms and Fields

Field style (all forms): Material outlined text field, height 48, radius 16, fill `surface`, border 1 pt `outline`; label floats into the border when focused/filled (Outfit 12); focused border 1.2 pt `primary`; error border & helper text in `error` color (Outfit 12–13) below the field. Validation mode: **on submit first, then on user interaction** (errors update as the user types).

## 1. Home search (S02)

| Field | Type | Placeholder | Rules |
|---|---|---|---|
| search | text, single line | "Search gyms or locations" | none; live filter (see 05-FEATURES F3) |

Trailing search icon (decorative). Rebuild: `returnKeyType="search"`, clear button, `autoCorrect=false`.

## 2. Guest details (S12 — "How would you like to continue?")

Selector (radio cards): **Continue as Guest** (default) · **Sign In**. Fields shown only for Guest.

| # | Label | Keyboard | Initial value | Input filter | Validation (exact) | Error message |
|---|---|---|---|---|---|---|
| 1 | Full Name | text, words capitalised | previous guest name or "" | — | `trim().length >= 3` | **Please enter your full name** |
| 2 | Phone Number | phone (`tel`) | previous phone or **"+974 "**; hint **"+974 3000 0000"**; label always floating | allow only digits, "+", spaces | digits-only length ≥ 8 | **Enter a valid Qatar phone number** |
| 3 | Email (optional) | email | previous email or "" | — | empty OK; else must contain "@" | **Enter a valid email** |

Submit button: **"Continue to Payment"** (or **"Sign In"** when the Sign In option is selected → navigates to S13 without validating).

On success, stored guest = `{ fullName: trimmed, phone: normalised "+974 XXXX XXXX", email: trimmed or null }`.

**Rebuild rules (stricter):**
- Full name: 3–60 chars, letters/spaces/Arabic letters, at least 2 words recommended.
- Phone: fixed "+974" prefix chip + 8-digit local number; Qatar mobile numbers start with 3, 5, 6 or 7 → regex `^[3567]\d{7}$`; display as "3333 4444"; store E.164 `+97433334444`.
- Email: RFC-lite regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
- Autofill content types: `name`, `telephoneNumber`, `emailAddress`.

## 3. Sign In (S13)

| # | Label | Keyboard | Validation | Error |
|---|---|---|---|---|
| 1 | Email or phone number | email-address | `trim()` not empty | **Please enter your email or phone number** |
| 2 | Password | secure text, eye toggle (visibility / visibility_off) | not empty | **Please enter your password** |

Buttons: **Forgot password?** (text, primary) → snackbar "A reset link has been sent." · **Sign In** (primary, submits; Enter key on password also submits) · **Create Account** (outlined).

Rebuild: min password 8 chars with letter+number; server errors: "Incorrect email/phone or password.", "Too many attempts. Try again later."; loading state on button.

## 4. New forms required for the rebuild (not on the live site)

### 4.1 Create Account
| Field | Rules |
|---|---|
| Full name | required, 3–60 |
| Email | required, valid |
| Phone (+974) | required, Qatar mobile |
| Password | ≥ 8, letter + number |
| Confirm password | equals password |
| Accept Terms & Privacy | checkbox required — "I agree to the Terms & Conditions and Privacy Policy" |
Button: "Create Account" → OTP verification screen (6-digit code, resend after 60 s).

### 4.2 Forgot password
Step 1: Email or phone → "Send reset code". Step 2: 6-digit code + new password + confirm → "Reset password" → success snackbar "Your password has been updated."

### 4.3 Edit profile
Full name, email, phone (re-verify on change), avatar (optional).

### 4.4 Review submission
Rating 1–5 (required), text 10–500 chars (optional). "Submit review".

### 4.5 Cancel booking
Confirmation dialog: "Cancel this booking?" + policy text + reason select (optional) → "Cancel booking" (destructive) / "Keep booking".

## 5. Selection controls (non-text inputs)

| Screen | Control | Options | Default | Rule |
|---|---|---|---|---|
| S02 | Category chips | All, Gyms, Classes, Trainers | All | single select |
| S07 | Segmented tabs | Overview, Reviews, Memberships | Overview | single |
| S08 | Plan cards | Monthly, 3 Months, 6 Months | none | single, required for Continue |
| S09 | Specialty chips | All, Strength, Weight Loss, Mobility, Functional Training | All | single |
| S11 | Date tiles | 14 days | first non-Sunday | Sundays disabled |
| S11 | Time pills | 6 slots | none | unavailable disabled; required for Continue |
| S12 | Radio cards | Continue as Guest, Sign In | Guest | single |
| S14 | Payment rows | Card, Apple Pay (iOS), Google Pay (Android) | Card | single |
| S16 | Segmented tabs | Upcoming, Past | Upcoming | single |
| S20 language | Option rows | English, العربية | English | (live: display only) |

## 6. All validation, error and system messages (verbatim)

**Field validation**
- Please enter your full name
- Enter a valid Qatar phone number
- Enter a valid email
- Please enter your email or phone number
- Please enter your password

**Snackbars**
- A reset link has been sent.
- Calendar integration will be available soon.
- Please choose this trainer from a gym first.
- Payment could not be completed.

**Empty / error / not-found states (title — body — button)**
| Where | Title | Body | Button |
|---|---|---|---|
| Home gyms error | Unable to load gyms | Please try again in a moment. | (Retry) |
| Search empty | No gyms found | Try another search or browse featured gyms. | — |
| Classes | Classes | Group training experiences are coming soon. / Discover gyms and personal trainers in the meantime. | Explore Gyms |
| Trainers tab hint | — | Choose a gym to explore its trainers. | — |
| Gym not found | Gym not found | It may have been removed from the directory. | Browse Gyms |
| Gym error | Gym unavailable | This gym could not be loaded. | Retry |
| Reviews | Unable to load reviews / No reviews yet. / Reviews could not be loaded. | | |
| Plans | Unable to load plans / Plans could not be loaded. / This membership is no longer available. | | |
| Trainers error | Unable to load trainers | Please try again shortly. | Retry |
| Trainers no gym | — | Trainers are available through a selected gym. | |
| Trainers not found | Gym not found | Please go back and try again. | |
| Trainer filter empty | No trainers found | Try another specialty | |
| Trainer not found | Trainer not found | This profile is no longer available. | |
| Trainer error | Trainer unavailable | Please return to the gym and try again. | |
| Booking (no context) | Nothing to book | Choose a gym and trainer to continue. | Browse Gyms |
| Times error | — | Times could not be loaded. | |
| Checkout (no context) | Checkout unavailable | Complete your booking details first. | Browse Gyms |
| Bookings error | Unable to load bookings | Please try again. | Retry |
| Upcoming empty | No upcoming bookings | Your next training session will appear here. | Explore Gyms |
| Past empty | No past bookings | Completed visits will be kept here. | — |
| Booking not found | Booking not found | It may have been removed from this device. | Bookings |
| Booking error | Unable to load booking | Please try again from your bookings tab. | |
| Favorites empty | No favorites yet | Save gyms you love and find them here. | Browse Gyms |
| Favorites error | Unable to load favorites | | |
| 404 | Page Not Found | (exception text) | Home |
