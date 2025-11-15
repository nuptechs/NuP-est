declare module '@nup/api-client' {
  export function apiRequest(url: string, options?: RequestInit): Promise<any>;
}
