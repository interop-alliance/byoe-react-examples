import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

const shared = {
  extends: [
    js.configs.recommended,
    tseslint.configs.recommended,
    prettierConfig // must be last in extends
  ],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    curly: ['error', 'all'],
    'no-var': 'error',
    'prefer-const': 'error'
  }
}

// Each example is its own TypeScript project, so it gets its own block.
export default defineConfig([
  // **/.e2e holds e2e caches (WAS server state, the freewallet clone).
  globalIgnores(['**/dist', '**/.e2e', '**/*.min.js']),
  {
    files: ['examples/notes/**/*.{ts,tsx}'],
    ...shared,
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        project: ['./examples/notes/tsconfig.dev.json']
      }
    }
  },
  {
    files: ['examples/save-file/**/*.{ts,tsx}'],
    ...shared,
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        project: ['./examples/save-file/tsconfig.json']
      }
    }
  }
])
