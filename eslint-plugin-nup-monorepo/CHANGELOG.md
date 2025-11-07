# Changelog - eslint-plugin-nup-monorepo

## [1.1.1] - 2025-11-07

### 🐛 Bug Fixes

- **CRÍTICO:** Corrigido bug de compatibilidade com Windows
  - Problema: Caminhos do Windows usam `\`, mas plugin verificava apenas `/`
  - Causa: `filePath.includes('features/@nup/')` não funcionava no Windows
  - Solução: Função `normalizePath()` converte `\` → `/` antes de verificar
  - Impacto: Plugin agora funciona corretamente em Windows E Linux/Mac
  - Afetava: `detectLayer()` e `extractFeatureName()`

## [1.1.0] - 2025-11-07

### ✨ Features

- **Descoberta automática** de packages e features do filesystem
  - Elimina necessidade de manutenção manual de listas
  - Plugin se adapta automaticamente a novos workspaces
  - Implementado com cache para performance

### 🐛 Bug Fixes

- **CRÍTICO:** Corrigido falso positivo em `detectLayer()` que classificava packages como features
  - Problema: `@nup/ui`, `@nup/api-client`, etc eram detectados como features
  - Causa: Lógica `filePath.startsWith('@nup/') && !filePath.includes('packages')` estava incorreta
  - Solução: Descoberta dinâmica de packages/features via `fs.readdirSync`
  - Impacto: Plugin agora permite corretamente que features importem packages
  - Fallback seguro se descoberta falhar

### 📝 Documentação

- Atualizado README explicando descoberta automática
- Removida necessidade de manutenção manual de listas
- Documentado sistema de fallback

## [1.0.0] - 2025-11-07

### ✨ Features

- Implementada regra `no-feature-to-feature-imports`
- Implementada regra `no-package-to-feature-imports`
- Implementada regra `no-service-workspace-imports`
- Configuração recomendada para monorepo NuP
- Mensagens de erro descritivas com sugestões de correção

### 📚 Documentação

- README com exemplos de uso
- Documentação de cada regra
- Exemplos de violações e correções
