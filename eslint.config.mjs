//do not change !!

// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          legacyDecorators: true
        },
        project: ['./tsconfig.json', './apps/*/tsconfig.json', './libs/*/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname
      },
    },
  },
  {
    rules: {
      // This allows property decorators like @Column()
      '@typescript-eslint/explicit-member-accessibility': ['off'],
      '@typescript-eslint/no-explicit-any': 'off',
      'prettier/prettier': "off",
      "@typescript-eslint": "off",
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unused-vars': ['warn'],
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
);