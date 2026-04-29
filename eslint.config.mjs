// @ts-check
import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import securityPlugin from 'eslint-plugin-security'
import sonarjs from 'eslint-plugin-sonarjs'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  sonarjs.configs.recommended,
  securityPlugin.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // General code style & clarity
      quotes: ['warn', 'single'],
      'no-duplicate-imports': 'warn',
      'class-methods-use-this': 'warn',
      'no-constructor-return': 'warn',

      // Complexity & size limits (SRP, readable functions)
      complexity: ['warn', { max: 10 }],
      'max-depth': ['warn', 3],
      'max-params': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 75, skipBlankLines: true, skipComments: true }],
      'max-classes-per-file': ['warn', 1],
      'sonarjs/cognitive-complexity': ['warn', 15],

      // TypeScript-specific robustness (clear interfaces and contracts)
      '@typescript-eslint/explicit-member-accessibility': ['warn', { accessibility: 'explicit' }],
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
      '@typescript-eslint/prefer-readonly': 'warn',
      '@typescript-eslint/no-extraneous-class': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-misused-promises': ['warn', { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/strict-boolean-expressions': ['warn', { allowNullableString: true, allowNullableBoolean: true, allowNullableNumber: true, allowAny: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],

      // Member ordering (cohesion and readability)
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            // 🏛️ 1. Static and constants first
            'public-static-field',
            'protected-static-field',
            'private-static-field',

            // 🧱 2. Instance fields next
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',

            // 🧩 3. Constructors
            'constructor',

            // ⚙️ 4. Public interface
            'public-static-method',
            'public-instance-method',

            // 🔒 5. Protected internals
            'protected-static-method',
            'protected-instance-method',

            // 🧰 6. Private helpers
            'private-static-method',
            'private-instance-method',
          ],
        },
      ],

      // Naming (self-documenting code)
      '@typescript-eslint/naming-convention': [
        'warn',
        { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
        { selector: 'typeAlias', format: ['PascalCase'] },
        { selector: 'class', format: ['PascalCase'] },
        { selector: 'enum', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['PascalCase', 'UPPER_CASE'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'memberLike', modifiers: ['private'], format: ['camelCase'], leadingUnderscore: 'allow' },
      ],
    },
  }
)
