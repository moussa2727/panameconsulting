// Configuration ESLint moderne et simple
export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: ["dist/**", "build/**", "node_modules/**"],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      'react': require('eslint-plugin-react'),
      'react-hooks': require('eslint-plugin-react-hooks'),
    },
    rules: {
      // Règles de base
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-console': 'warn',
      
      // React
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      
      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];