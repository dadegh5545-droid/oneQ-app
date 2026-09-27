# OneQ web demo

A shareable Expo Web build of the OneQ app, hosted on AWS Amplify from the `demo` branch.

- URL: https://demo.dweiv1p133gtf.amplifyapp.com (Amplify app `oneQ-app`, `dweiv1p133gtf`, ap-south-1)
- Branch: `demo`. `main` keeps its backend-only build and placeholder page (see `amplify.yml`).
- Backend: the `demo` branch's own Amplify Gen 2 backend (`amplify-dweiv1p133gtf-demo-branch-*`), separate from
  the developer sandbox and from `main`. Sandbox-only helpers (auto-confirmed test accounts, fixtures) are off.
- Payments are simulated (`PAYMENT_PROVIDER=mock`); checkout says so (`EXPO_PUBLIC_APP_ENV=demo`).

## How it builds

`amplify.yml`, on the `demo` branch only:

1. `ampx pipeline-deploy` deploys the demo backend and writes `amplify_outputs.json` (never committed).
2. `node scripts/seed-catalogue.mjs` makes sure the approved catalogue exists (create-only; admin edits are kept).
3. `EXPO_PUBLIC_APP_ENV=demo npx expo export --platform web` → `dist/` is published.

Direct links and refreshes (`/gym/power-house`, `/bookings`, …) are served by the app's rewrite rule
`/<*> → /index.html (404-200)`.

## On the web

- The phone layout is kept: a 480 pt column, centred on tablets and desktops (`src/components/WebFrame.tsx`).
- `public/index.html` holds the title, description, theme colour, share image and a boot screen that matches the
  app's splash until the first screen is ready.
- Notifications are native only (nothing is scheduled on the web); "Add to Calendar" explains that it works in the
  phone app.
- Sign-up sends a real confirmation code by email (Cognito's default sender until SES is configured).
- Authorization is the same as in the apps: management screens need an account in the `admin` group.

## Maintenance (AWS profile `oneq-dev`)

Target the demo backend by setting the app and branch, as the Amplify build does:

```bash
AWS_PROFILE=oneq-dev AWS_APP_ID=dweiv1p133gtf AWS_BRANCH=demo npm run seed              # restore missing catalogue records
AWS_PROFILE=oneq-dev AWS_APP_ID=dweiv1p133gtf AWS_BRANCH=demo npm run admin:grant <email>
```

To update the demo, merge `main` into `demo` and push; Amplify rebuilds it.
