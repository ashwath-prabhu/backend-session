// ESLint checks code quality: likely bugs and bad patterns such as unused
// variables or `any`. It does NOT check types; that is `tsc`'s job, configured
// in tsconfig.json. Prettier (plugged in below) checks formatting.
import eslint from '@eslint/js'; // ESLint's core JavaScript rules
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint'; // lets ESLint read TS syntax + adds TS-specific rules

export default tseslint.config(
  // Don't lint installed or generated code.
  { ignores: ['node_modules/', '.serverless/', '.esbuild/'] },
  // General JS rules: unused variables, unreachable code, etc.
  eslint.configs.recommended,
  // TypeScript rules: no `any`, unused TS-specific code, etc.
  ...tseslint.configs.recommended,
  // Report Prettier formatting problems (spacing, quotes, semicolons) as ESLint errors.
  // Keep this last so it turns off any ESLint rules that conflict with Prettier.
  eslintPluginPrettierRecommended,
);
