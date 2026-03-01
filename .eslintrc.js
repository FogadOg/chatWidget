module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@next/next/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    // disable common noisy warnings project-wide
    '@typescript-eslint/no-unused-vars': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
  overrides: [
    {
      files: ['__tests__/**', 'src/components/ai-elements/**'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'react-hooks/exhaustive-deps': 'off',
        '@next/next/no-img-element': 'off',
      },
    },
  ],
};
