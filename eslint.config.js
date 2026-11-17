import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'data/', 'public/vendor/'] },
  js.configs.recommended,
  {
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-properties': ['error', { property: 'innerHTML' }, { property: 'getElementById' }],
    },
  },
  { files: ['src/**', 'test/**', 'scripts/**', 'eslint.config.js'], languageOptions: { globals: globals.node } },
  { files: ['public/js/**'], languageOptions: { globals: globals.browser } },
];
