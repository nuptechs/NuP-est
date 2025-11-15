/**
 * UI Component Shims
 * Provides fallback components when @nup/ui is not available
 */

// Cache for monorepo detection
let realUIPackage: any = null;
let detectionAttempted = false;

async function tryLoadRealUI() {
  if (detectionAttempted) return realUIPackage;
  
  detectionAttempted = true;
  
  try {
    // Try dynamic import for ESM
    realUIPackage = await import('@nup/ui');
    console.log('✅ Using real @nup/ui components');
    return realUIPackage;
  } catch {
    console.log('ℹ️  Using @nup/app-kit UI shims (standalone mode)');
    return null;
  }
}

// Synchronous check - must be initialized before first component render
let isMonorepo = false;

// Try to load synchronously if possible (for CJS compatibility)
try {
  if (typeof require !== 'undefined') {
    require('@nup/ui');
    isMonorepo = true;
  }
} catch {
  isMonorepo = false;
}

// Button Component
export function Button(props: any) {
  // In monorepo, use real component
  if (isMonorepo && typeof require !== 'undefined') {
    const { Button: RealButton } = require('@nup/ui');
    return <RealButton {...props} />;
  }
  
  // Standalone fallback
  const { children, className = '', type = 'button', variant, size, ...rest } = props;
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// Card Component
export function Card(props: any) {
  if (isMonorepo && typeof require !== 'undefined') {
    const { Card: RealCard } = require('@nup/ui');
    return <RealCard {...props} />;
  }
  
  const { children, className = '', ...rest } = props;
  return (
    <div
      className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

// Input Component
export function Input(props: any) {
  if (isMonorepo && typeof require !== 'undefined') {
    const { Input: RealInput } = require('@nup/ui');
    return <RealInput {...props} />;
  }
  
  const { className = '', type = 'text', ...rest } = props;
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    />
  );
}

// Label Component
export function Label(props: any) {
  if (isMonorepo && typeof require !== 'undefined') {
    const { Label: RealLabel } = require('@nup/ui');
    return <RealLabel {...props} />;
  }
  
  const { children, className = '', ...rest } = props;
  return (
    <label
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
      {...rest}
    >
      {children}
    </label>
  );
}

export const USING_UI_SHIMS = !isMonorepo;
