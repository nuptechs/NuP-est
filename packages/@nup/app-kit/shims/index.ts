/**
 * Shims for standalone development
 * 
 * These provide basic implementations of @nup/* packages
 * when developing outside the monorepo
 */

// Check if we're in monorepo or standalone
const isMonorepo = () => {
  try {
    // Try to require a monorepo package
    require.resolve('@nup/ui');
    return true;
  } catch {
    return false;
  }
};

// UI Components Shims
export const Button = isMonorepo()
  ? require('@nup/ui').Button
  : ({ children, className = '', ...props }: any) => (
      <button
        className={`px-4 py-2 bg-primary text-primary-foreground rounded-md ${className}`}
        {...props}
      >
        {children}
      </button>
    );

export const Card = isMonorepo()
  ? require('@nup/ui').Card
  : ({ children, className = '', ...props }: any) => (
      <div className={`border rounded-lg p-4 ${className}`} {...props}>
        {children}
      </div>
    );

export const Input = isMonorepo()
  ? require('@nup/ui').Input
  : ({ className = '', ...props }: any) => (
      <input
        className={`w-full px-3 py-2 border rounded-md ${className}`}
        {...props}
      />
    );

// API Client Shim
export const apiRequest = isMonorepo()
  ? require('@nup/api-client').apiRequest
  : async (url: string, options?: RequestInit) => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      return response.json();
    };

// Export info about shim status
export const USING_SHIMS = !isMonorepo();

export { isMonorepo };
