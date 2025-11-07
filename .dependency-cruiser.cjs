/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'warn',
      comment:
        'Dependências circulares tornam o código difícil de manter e podem causar problemas em runtime',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-feature-to-feature',
      severity: 'error',
      comment:
        'Features não podem depender de outras features. Se precisar compartilhar código, mova para packages/@nup/',
      from: {
        path: '^features/@nup/([^/]+)',
      },
      to: {
        path: '^features/@nup/([^/]+)',
        pathNot: '^features/@nup/$1',
      },
    },
    {
      name: 'no-package-to-feature',
      severity: 'error',
      comment:
        'Packages não podem depender de features. Packages são a base da pirâmide arquitetural.',
      from: {
        path: '^packages/@nup/',
      },
      to: {
        path: '^features/@nup/',
      },
    },
    {
      name: 'no-package-to-app',
      severity: 'error',
      comment:
        'Packages não podem depender de apps. Packages devem ser genéricos e reutilizáveis.',
      from: {
        path: '^packages/@nup/',
      },
      to: {
        path: '^apps/',
      },
    },
    {
      name: 'no-service-workspace-imports',
      severity: 'error',
      comment:
        'Services são isolados e não devem importar código do workspace. Use HTTP/API para comunicação.',
      from: {
        path: '^services/',
      },
      to: {
        path: '^(apps|features|packages)/',
      },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        'Arquivos órfãos (não importados por ninguém) podem indicar código morto',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$', // configs (. no início)
          '\\.d\\.ts$', // type declarations
          '(^|/)tsconfig\\.json$',
          '(^|/)(babel|webpack)\\.config\\.(js|cjs|mjs|ts|json)$',
          '(^|/)\\.(eslint|prettier)rc\\.(js|cjs|json|yml)$',
          '^tests?/',
          '\\.(spec|test)\\.(js|mjs|cjs|ts|tsx)$',
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: {
      path: [
        'node_modules',
        'dist',
        'build',
        'coverage',
        '\\.d\\.ts$',
      ],
    },
    includeOnly: [
      '^apps',
      '^features/@nup',
      '^packages/@nup',
      '^services',
    ],
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
      },
      archi: {
        collapsePattern: '^(apps|features/@nup|packages/@nup|services)/[^/]+',
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
