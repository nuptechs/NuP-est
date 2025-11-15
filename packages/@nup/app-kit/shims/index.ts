/**
 * @nup/app-kit Shims
 * 
 * Provides fallback implementations when @nup/* packages are not available
 * Used for standalone development outside the monorepo
 */

export * from './ui';
export * from './api';

// Check if we're in monorepo or standalone
export function isMonorepo(): boolean {
  try {
    require.resolve('@nup/ui');
    return true;
  } catch {
    return false;
  }
}

export const USING_SHIMS = !isMonorepo();
