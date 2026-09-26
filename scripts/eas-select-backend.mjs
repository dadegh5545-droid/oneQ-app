// EAS build hook (package.json "eas-build-pre-install"): makes the backend of each build explicit.
//   ONEQ_BACKEND=sandbox → the uploaded amplify_outputs.json (developer sandbox, ap-south-1)
//   ONEQ_BACKEND=main    → amplify_outputs.main.json, generated from the GitHub `main` branch backend with
//                          `npx ampx generate outputs --app-id <id> --branch main` and renamed (not committed).
// A missing file fails the build instead of silently pointing the app at the wrong backend.
import { copyFileSync, existsSync, readFileSync } from 'node:fs';

const backend = process.env.ONEQ_BACKEND ?? 'sandbox';
const source = backend === 'sandbox' ? 'amplify_outputs.json' : `amplify_outputs.${backend}.json`;

if (!existsSync(source)) {
  console.error(`ONEQ_BACKEND=${backend}: ${source} is missing. See docs/PRODUCTION-READINESS.md (Environments).`);
  process.exit(1);
}
if (source !== 'amplify_outputs.json') copyFileSync(source, 'amplify_outputs.json');

const outputs = JSON.parse(readFileSync('amplify_outputs.json', 'utf8'));
console.log(`OneQ backend: ${backend} (${outputs.data?.aws_region}, ${outputs.data?.url})`);
