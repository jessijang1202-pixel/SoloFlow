# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Supabase Configuration

This project is set up with Supabase. 

1. **Environment Variables**:
   Create a `.env.local` file at the root of the project with the following contents:
   ```env
   VITE_SUPABASE_URL=https://nyoylqmvhfvuxtpousok.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
2. **Supabase Client**:
   The client is initialized in [supabaseClient.ts](file:///e:/project/Scheduler/src/services/supabaseClient.ts). You can import `supabase` and make queries directly:
   ```typescript
   import { supabase } from './services/supabaseClient';
   ```

