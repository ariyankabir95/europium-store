# TypeScript → JavaScript conversion

This project was converted from TypeScript to JavaScript. Behaviour is unchanged; only type annotations were removed.

- `.ts` → `.js`, `.tsx` → `.jsx`, `.mts` → `.mjs` (Netlify scheduled function).
- `tsconfig.json` → `jsconfig.json` (keeps the `@/*` import alias).
- `typescript`, `@types/*` and the `typecheck` script were removed.
- `tailwind.config.js` now uses CommonJS, like `postcss.config.js`.

Because there is no type checking any more, run `npm run build` and test the main flows (checkout, admin, auth) after any change.
