# Config Directory

Shared configuration files for all apps and packages.

## Planned Configs

- `eslint.config.js` - ESLint shared config
- `prettier.config.js` - Prettier shared config
- `tsconfig.json` - Base TypeScript config (already at root)
- `tailwind.preset.js` - Tailwind preset

## Usage

Apps and packages will extend these configs:

```json
{
  "extends": "../../config/eslint.config.js"
}
```
