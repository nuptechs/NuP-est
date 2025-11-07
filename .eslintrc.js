module.exports = {
  root: true,
  
  // Performance: Cache agressivo
  cache: true,
  cacheLocation: 'node_modules/.cache/eslint',
  
  // Ignora arquivos de build e configuração
  ignorePatterns: [
    'dist/',
    'build/',
    'node_modules/',
    'coverage/',
    '*.config.js',
    '*.config.ts',
    '.next/',
    '.turbo/',
    'out/',
    'public/',
    'uploads/',
    'data/',
  ],
  
  // Configuração base para todos os arquivos
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  
  extends: [
    'eslint:recommended',
  ],
  
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  
  // Regras gerais (leves)
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  
  // Configurações específicas por tipo de arquivo
  overrides: [
    // TypeScript files
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        // Performance: Não usar project para parsing (evita overhead de type-checking)
        // project: './tsconfig.json', ← COMENTADO para melhor performance
        ecmaFeatures: {
          jsx: true,
        },
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    
    // React files
    {
      files: ['**/*.jsx', '**/*.tsx'],
      plugins: ['react', 'react-hooks'],
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
      ],
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        'react/react-in-jsx-scope': 'off', // Next.js/Vite não precisa
        'react/prop-types': 'off', // Usa TypeScript
      },
    },
    
    // VALIDAÇÃO ARQUITETURAL - Apenas em features/ e packages/
    {
      files: [
        'features/@nup/**/*.{js,jsx,ts,tsx}',
        'packages/@nup/**/*.{js,jsx,ts,tsx}',
        'services/**/*.{js,jsx,ts,tsx}',
      ],
      plugins: ['nup-monorepo'],
      rules: {
        'nup-monorepo/no-feature-to-feature-imports': 'error',
        'nup-monorepo/no-package-to-feature-imports': 'error',
        'nup-monorepo/no-service-workspace-imports': 'error',
      },
    },
  ],
};
