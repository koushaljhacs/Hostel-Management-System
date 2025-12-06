# Production Build Pipeline

This folder contains the tooling required to generate an isolated production-ready snapshot of HMS Central.

## Contents

- `webpack.config.js` – bundles and minifies every JS/JSX/CSS asset under `web-interfaces/` and `hostel-booking/client/`, applies Babel transforms for JSX, extracts CSS, and compresses images before emitting to `production/dist/`.
- `security-headers.json` – declarative blueprint of the HTTP response headers that must be enforced at the CDN / reverse-proxy layer for hardened deployments (HSTS, CSP, click-jacking protection, etc.).

## Build Process

1. From the repository root run:
   ```bash
   npm run build:production
   ```
2. The command executes webpack with the configuration above and emits:
   - `production/dist/assets/**/*.js|css` – minified, tree-shaken bundles (React JSX is precompiled to ES5 for CDN delivery).
   - `production/dist/web-interfaces` & `production/dist/hostel-booking/client` – static HTML/assets copied with non-code resources preserved.
   - `production/dist/security-headers.json` – ready to be consumed by nginx/CloudFront/Netlify header configuration.

## Deployment Flow

- **Development** – iterate under the existing `web-interfaces/` and service folders as usual.
- **Promotion** – `npm run build:production` regenerates the production snapshot. Sync the `production/dist` directory to the hardened environment (S3+CloudFront, nginx, etc.) to keep dev/prod cleanly separated.
- **Security Automation** – CI can validate that every build produces an updated `security-headers.json`, guaranteeing that required headers stay in sync with the static assets.

