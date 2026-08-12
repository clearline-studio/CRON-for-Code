import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';

// Inline environment globals (avoids an extra dependency on the `globals` package).
// - Browser: used by React/UI sources (.ts/.tsx).
// - Node: used by Electron main/preload, scripts and dev tooling (.mjs/.cjs).
// - CommonJS: used by the Electron preload (.cjs).
// - Tests: browser + node (tests run under Node and exercise the DOM via jsdom).
const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  location: 'readonly',
  history: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  getComputedStyle: 'readonly',
  queueMicrotask: 'readonly',
  crypto: 'readonly',
  File: 'readonly',
  Blob: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  performance: 'readonly',
  Event: 'readonly',
  CustomEvent: 'readonly',
  EventTarget: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  structuredClone: 'readonly',
  matchMedia: 'readonly',
};

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly',
  queueMicrotask: 'readonly',
  global: 'readonly',
  globalThis: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  performance: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  structuredClone: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
};

const commonjsGlobals = {
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
};

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-renderer/**',
      '**/node_modules/**',
      '**/.pnpm/**',
      '**/coverage/**',
      '**/.runtime/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: browserGlobals,
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  {
    files: ['**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...nodeGlobals,
        ...commonjsGlobals,
      },
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['apps/standalone/electron/**/*.{mjs,cjs}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
