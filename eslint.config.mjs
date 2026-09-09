import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularParser from '@angular-eslint/template-parser';
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/.angular/**',
      '**/coverage/**',
      '**/dist/**',
      '**/node_modules/**',
      'apps/api/src/generated/**',
      'docs/MASTER_EXECUTION_PROMPT.md',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { '@angular-eslint': angular },
    rules: {
      '@angular-eslint/component-class-suffix': 'error',
      '@angular-eslint/directive-class-suffix': 'error',
      'max-len': ['error', { code: 120, ignoreComments: false, ignoreStrings: false }],
    },
  },
  {
    files: ['apps/web/**/*.html'],
    languageOptions: { parser: angularParser },
    plugins: { '@angular-eslint/template': angularTemplate },
    rules: {
      '@angular-eslint/template/attributes-order': 'error',
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
      'max-len': ['error', { code: 120 }],
    },
  },
  prettier,
);
