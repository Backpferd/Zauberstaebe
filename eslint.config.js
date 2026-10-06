import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      '.vite/**',
      // Arbeitskopien der Agenten liegen unter .claude/worktrees/.
      '.claude/**',
      // Die Konzeptszene ist eine fertige Referenz und wird nicht angefasst.
      'konzept/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      // Unterstrich-Präfix markiert absichtlich ungenutzte Parameter.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Nur type-Importe als solche kennzeichnen, passend zu verbatimModuleSyntax.
      '@typescript-eslint/consistent-type-imports': 'error',
      // Debug-Ausgaben sind im Spiel erlaubt (F3/F8-Werkzeuge kommen mit der Engine).
      'no-console': 'off',
    },
  },
  {
    // Konfigurationsdateien und Tests laufen in Node.
    files: ['*.config.{js,ts}', 'tests/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  // Muss zuletzt stehen: schaltet Stilregeln ab, die Prettier übernimmt.
  prettier,
);
