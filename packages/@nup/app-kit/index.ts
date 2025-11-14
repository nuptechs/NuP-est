/**
 * @nup/app-kit
 * 
 * Toolkit for creating portable NuP apps that work both standalone and in monorepo
 */

export { defineNupAppConfig } from './configs/vite.config.shared.js';
export { nupTailwindConfig } from './configs/tailwind.config.shared.js';

// Re-export shims for standalone development
export * from './shims';

// Types
export interface NupAppMetadata {
  name: string;
  displayName: string;
  port: number;
  gateway?: {
    path: string;
    enabled: boolean;
  };
  database?: {
    schema: string;
    required: boolean;
  };
  env?: {
    required: string[];
    optional: string[];
  };
}

export const version = '1.0.0';
