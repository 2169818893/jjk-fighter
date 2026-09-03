import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/',
      'public/server/node_modules/',
      'src-tauri/',
      'dist/',
      'bf/'
    ]
  },
  js.configs.recommended,
  {
    files: ['public/js/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // main.js 启动时注入 window.Game = Game，audio/fighter-core 等运行时模块按此全局读取
        Game: 'readonly'
      }
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['public/server/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-var': 'error'
    }
  }
];
