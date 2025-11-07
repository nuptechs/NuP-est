/**
 * ESLint Plugin para Governança Arquitetural do Monorepo NuP
 * 
 * Valida regras de dependência entre services, features e packages
 */

const path = require('path');
const fs = require('fs');

/**
 * Cache para packages e features descobertos dinamicamente
 */
let _cachedPackages = null;
let _cachedFeatures = null;

/**
 * Descobre packages do workspace dinamicamente
 */
function discoverPackages() {
  if (_cachedPackages) return _cachedPackages;
  
  const packages = [];
  const packagesDir = path.join(process.cwd(), 'packages/@nup');
  
  try {
    if (fs.existsSync(packagesDir)) {
      const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          packages.push(`@nup/${entry.name}`);
        }
      }
    }
  } catch (error) {
    // Fallback para lista conhecida se descoberta falhar
    console.warn('[eslint-plugin-nup-monorepo] Descoberta de packages falhou, usando fallback');
  }
  
  // Se não encontrou nada, usa fallback
  if (packages.length === 0) {
    packages.push(
      '@nup/ui',
      '@nup/api-client',
      '@nup/auth-client',
      '@nup/shared-types',
      '@nup/shared-utils'
    );
  }
  
  _cachedPackages = packages;
  return packages;
}

/**
 * Descobre features do workspace dinamicamente
 */
function discoverFeatures() {
  if (_cachedFeatures) return _cachedFeatures;
  
  const features = [];
  const featuresDir = path.join(process.cwd(), 'features/@nup');
  
  try {
    if (fs.existsSync(featuresDir)) {
      const entries = fs.readdirSync(featuresDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          features.push(`@nup/${entry.name}`);
        }
      }
    }
  } catch (error) {
    // Fallback para lista conhecida se descoberta falhar
    console.warn('[eslint-plugin-nup-monorepo] Descoberta de features falhou, usando fallback');
  }
  
  // Se não encontrou nada, usa fallback
  if (features.length === 0) {
    features.push(
      '@nup/mindmaps',
      '@nup/professor-ia',
      '@nup/flashcards'
    );
  }
  
  _cachedFeatures = features;
  return features;
}

/**
 * Verifica se um import viola as regras arquiteturais
 */
function checkImportPath(context, node, importPath) {
  const filename = context.getFilename();
  const violations = [];

  // Ignora imports relativos (./component, ../utils)
  if (importPath.startsWith('.')) {
    return violations;
  }

  // Detecta camada atual baseado no caminho do arquivo
  const currentLayer = detectLayer(filename);
  const targetLayer = detectLayer(importPath);

  // Regra 1: Features não podem importar outras features
  if (currentLayer === 'feature' && targetLayer === 'feature') {
    const currentFeature = extractFeatureName(filename);
    const targetFeature = extractFeatureName(importPath);
    
    if (currentFeature !== targetFeature) {
      violations.push({
        message: `Features não podem importar outras features. "${currentFeature}" está tentando importar "${targetFeature}". Mova o código compartilhado para packages/@nup/.`,
        node,
      });
    }
  }

  // Regra 2: Packages não podem importar features
  if (currentLayer === 'package' && targetLayer === 'feature') {
    violations.push({
      message: `Packages não podem importar features. Packages são a base da pirâmide arquitetural. Remova o import de "${importPath}".`,
      node,
    });
  }

  // Regra 3: Packages não podem importar apps
  if (currentLayer === 'package' && targetLayer === 'app') {
    violations.push({
      message: `Packages não podem importar apps. Packages devem ser genéricos e reutilizáveis. Remova o import de "${importPath}".`,
      node,
    });
  }

  // Regra 4: Services não podem importar nada do workspace
  if (currentLayer === 'service' && (targetLayer === 'app' || targetLayer === 'feature' || targetLayer === 'package')) {
    violations.push({
      message: `Services são isolados e não podem importar código do workspace. Use HTTP/API para comunicação. Remova o import de "${importPath}".`,
      node,
    });
  }

  return violations;
}

/**
 * Normaliza caminho para usar sempre forward slashes (compatibilidade Windows)
 */
function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

/**
 * Detecta a camada arquitetural baseado no caminho
 * 
 * Para imports de módulos (ex: '@nup/ui'):
 * - Descobre packages e features dinamicamente do filesystem
 * - Verifica contra listas descobertas
 * 
 * Para caminhos de arquivos (ex: 'features/@nup/mindmaps/src/...'):
 * - Detecta pela estrutura de pastas
 * 
 * IMPORTANTE: Normaliza caminhos para compatibilidade Windows/POSIX
 */
function detectLayer(filePath) {
  // Normaliza caminho (Windows: \ → /)
  const normalized = normalizePath(filePath);

  // Para caminhos de arquivos (detectar pela pasta)
  if (normalized.includes('features/@nup/')) {
    return 'feature';
  }
  if (normalized.includes('packages/@nup/')) {
    return 'package';
  }
  if (normalized.includes('apps/')) {
    return 'app';
  }
  if (normalized.includes('services/')) {
    return 'service';
  }

  // Para imports de módulos (ex: '@nup/ui', '@nup/mindmaps')
  if (normalized.startsWith('@nup/')) {
    // Descobre packages e features dinamicamente
    const packages = discoverPackages();
    const features = discoverFeatures();

    // Verifica se é um package
    if (packages.includes(normalized) || packages.some(pkg => normalized.startsWith(pkg + '/'))) {
      return 'package';
    }
    // Verifica se é uma feature
    if (features.includes(normalized) || features.some(feat => normalized.startsWith(feat + '/'))) {
      return 'feature';
    }
    // Se não está em nenhuma lista, assume package (menos restritivo)
    // Provavelmente é uma dep externa ou package não descoberto
    return 'package';
  }

  return 'unknown';
}

/**
 * Extrai o nome da feature do caminho
 * IMPORTANTE: Normaliza caminho para compatibilidade Windows
 */
function extractFeatureName(filePath) {
  const normalized = normalizePath(filePath);
  const match = normalized.match(/features\/@nup\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Regra: no-feature-to-feature-imports
 */
const noFeatureToFeatureImports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Proíbe features de importar outras features',
      category: 'Architecture',
      recommended: true,
    },
    messages: {
      noFeatureToFeature: '{{message}}',
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const violations = checkImportPath(context, node, importPath);
        
        violations.forEach(violation => {
          context.report({
            node: violation.node,
            messageId: 'noFeatureToFeature',
            data: {
              message: violation.message,
            },
          });
        });
      },
    };
  },
};

/**
 * Regra: no-package-to-feature-imports
 */
const noPackageToFeatureImports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Proíbe packages de importar features',
      category: 'Architecture',
      recommended: true,
    },
    messages: {
      noPackageToFeature: '{{message}}',
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const violations = checkImportPath(context, node, importPath);
        
        violations.forEach(violation => {
          context.report({
            node: violation.node,
            messageId: 'noPackageToFeature',
            data: {
              message: violation.message,
            },
          });
        });
      },
    };
  },
};

/**
 * Regra: no-service-workspace-imports
 */
const noServiceWorkspaceImports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Proíbe services de importar código do workspace',
      category: 'Architecture',
      recommended: true,
    },
    messages: {
      noServiceWorkspace: '{{message}}',
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const violations = checkImportPath(context, node, importPath);
        
        violations.forEach(violation => {
          context.report({
            node: violation.node,
            messageId: 'noServiceWorkspace',
            data: {
              message: violation.message,
            },
          });
        });
      },
    };
  },
};

module.exports = {
  rules: {
    'no-feature-to-feature-imports': noFeatureToFeatureImports,
    'no-package-to-feature-imports': noPackageToFeatureImports,
    'no-service-workspace-imports': noServiceWorkspaceImports,
  },
  configs: {
    recommended: {
      plugins: ['nup-monorepo'],
      rules: {
        'nup-monorepo/no-feature-to-feature-imports': 'error',
        'nup-monorepo/no-package-to-feature-imports': 'error',
        'nup-monorepo/no-service-workspace-imports': 'error',
      },
    },
  },
};
