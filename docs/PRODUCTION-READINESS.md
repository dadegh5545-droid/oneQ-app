# Production readiness

Status of OneQ after the Phase 5 readiness pass. Backend: AWS Amplify Gen 2, **ap-south-1**. See `PHASE-4-BACKEND.md` for the backend design.

## Environments

| | Development | CI / branch | Future production |
|---|---|---|---|
| Backend | Personal sandbox `amplify-oneq-DELL-sandbox-07a24d52a0` (`ampx sandbox`) | GitHub `main` → Amplify Hosting runs `amplify.yml` (`ampx pipeline-deploy`) | A separate, controlled branch/app (e.g. `production`) |
| App config | `amplify_outputs.json` (gitignored) | `amplify_outputs.main.json` from `npx ampx generate outputs --app-id <id> --branch main` (gitignored) | Same pattern with its own outputs file |
| EAS profile | `development`, `preview` (`ONEQ_BACKEND=sandbox`) | — | `production` (`ONEQ_BACKEND=main`, `EXPO_PUBLIC_APP_ENV=production`) |
| Test accounts | SES-simulator auto-confirm (sandbox only) | never | never |
| Payments | mock | mock (`PAYMENT_PROVIDER=mock`) | real provider required |

- `scripts/eas-select-backend.mjs` (EAS `eas-build-pre-install`) picks the outputs file per profile and **fails the build** if it is missing, so a build can never silently point at the wrong backend. The installed development build keeps using the sandbox.
- Each branch deployment is its own stack with its own Cognito users and DynamoDB tables. Nothing is migrated; there are no production users yet. After the first `main` deployment: `npm run seed -- --stack <main root stack>` and `npm run admin:grant -- <email> --stack <main root stack>`.
- `.easignore` uploads `amplify_outputs*.json` to EAS (client config only: pool ids and the AppSync URL, no secrets) while they stay out of git.

## Operations

```bash
AWS_PROFILE=oneq-dev npm run seed                    # create missing catalogue records (never overwrites admin edits)
AWS_PROFILE=oneq-dev npm run seed -- --overwrite     # reset the catalogue to the approved data
AWS_PROFILE=oneq-dev npm run admin:grant -- a@b.qa   # add an existing account to the admin group (sign in again)
AWS_PROFILE=oneq-dev npm run admin:revoke -- a@b.qa
AWS_PROFILE=oneq-dev npm run backend:check           # regression + security checks (admin checks need AWS_PROFILE)
```

After installing packages, run `npm run lockfile:sync`: a full npm 11 install can write a lock that `npm ci` (EAS, Amplify CI) rejects because of bundled dependencies inside the Amplify CLI packages.

Management UI: Profile → Management (admins only) — gyms, plans, trainers, all bookings, cancel booking (releases the trainer slot). The backend enforces the `admin` group; the admin-access function has no GraphQL operation and is invokable only with IAM `lambda:InvokeFunction`. Availability is rule-based (slot templates, Sunday closed); per-trainer schedule editing would need a new model and is not built.

## Notifications and calendar

- Local notifications (`expo-notifications`): booking confirmation (notification list only), session reminders 24 h and 1 h before. Permission is asked once, after the first booking; a refusal is respected. Payloads contain only `{kind, bookingId, scope}`. Reminders of cancelled bookings are removed when the Bookings tab loads; account reminders are removed on sign-out.
- Server push (reminders for changes made elsewhere, marketing) is **not** connected: it needs FCM credentials (Android: `google-services.json` / FCM V1 key in EAS credentials) and an APNs key (iOS), plus a device-token model and a scheduler (EventBridge Scheduler → Lambda → Expo Push API). The `services/notifications` API is the integration point.
- Add to Calendar (`expo-calendar`): asks permission on tap (iOS: write-only access), creates the event in the default/primary calendar, remembers the event id to avoid duplicates. Web shows a message instead.

## Payments

`PaymentProvider` (client) + `verifyPayment` (bookings function) are the boundary. Mock payments are development/testing only: production builds have no client provider, and the backend accepts `mock-` ids only while `PAYMENT_PROVIDER=mock`. Bookings are idempotent per payment id (a retry returns the same booking).

**Business decision needed:** choose a QAR provider supporting Qatar cards, Apple Pay and Google Pay (Tap Payments, SkipCash, CyberSource/QNB, Dibsy, Stripe if eligible). Integration then needs: provider SDK/sheet in `PaymentProvider`, server-side verification in `verifyPayment` (secret key in `ampx sandbox secret` / branch secrets), a webhook Lambda for asynchronous status, failure handling and refunds for cancellations. Apple Pay needs a merchant id + certificate; Google Pay needs production access.

## iOS readiness

Configured: bundle id `qa.oneq.app`, scheme `oneq`, portrait, RTL (`supportsRTL`, `CFBundleLocalizations` en/ar), safe areas and navigation (Expo Router), Amplify/Cognito (JS only, no native config), calendar usage descriptions (write-only), notifications (no usage description required). **Blocker:** an Apple Developer account (and its credentials in EAS) is needed for any iOS build; no iOS build was started.

## EAS profiles

`development` (dev client, internal APK), `preview` (internal APK, sandbox backend), `production` (AAB, remote auto-incremented versionCode/buildNumber via `appVersionSource: remote`, `main` backend, production mode). `submit.production` is a placeholder; no submission credentials are stored in the repository.

## Store technical checklist

| Item | Status |
|---|---|
| Android applicationId / iOS bundle id | `qa.oneq.app` / `qa.oneq.app` |
| Version | `1.0.0`; build numbers managed remotely by EAS (`autoIncrement` in `production`) |
| Icons, adaptive icon, splash | configured (`assets/`); store listing graphics still needed |
| Android permissions | INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE (NetInfo), POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED (reminders), READ/WRITE_CALENDAR (Add to Calendar); camera, microphone, contacts, location, media, storage, overlay, vibrate are blocked |
| iOS usage descriptions | calendar (write-only); local network (development builds only) |
| Data handled (for Play Data safety / App Store privacy, to be confirmed by the business) | account: name, email, phone (Cognito, UserProfile); bookings incl. guest name/phone/email; favorites; device-local language, favorites, guest booking tokens. No location, contacts, photos, advertising id or tracking; no analytics or crash provider connected yet |
| Encryption export compliance | HTTPS / Cognito only — to be confirmed and declared by the account holder |
| Production backend | `main` branch deployment not connected yet |
| Payment provider | not selected (see Payments) |
| Push credentials | FCM / APNs not configured |
| Email sender | Cognito default (50/day) — configure SES before launch |
| Still needed | store screenshots, feature graphic, descriptions (en/ar), privacy policy URL, support URL, content rating questionnaires |

## Observability and analytics

`services/monitoring` (errors, crashes via the global handler and the root error boundary, backend failures) and `services/analytics` (app_open, search, view_gym, view_trainer, favorite_added/removed, checkout_started, booking_completed/failed, language_changed) log to the console in development and are silent in release builds until a provider is attached with `setMonitoringProvider` / `setAnalyticsProvider` (e.g. Sentry, Amplitude). Messages are scrubbed of JWTs, guest tokens, emails and phone numbers; analytics events carry ids and counts only.

## Manual device checklist (development build)

Launch and session restore after restart · sign-up with a real email code · sign-in (email, phone) · forgot/reset with a real code · Android back (checkout locked while paying, Success → Home) · keyboard on sign-up/guest/admin forms · safe areas · Arabic RTL / English LTR switch · airplane mode: error + Retry, reconnect refetch · notification permission prompt after first booking, reminders delivered, tap opens booking · Add to Calendar (allow / deny / second tap) · admin: grant, sign in again, edit a gym, cancel a booking.
