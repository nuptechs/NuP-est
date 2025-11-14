import { nupTailwindConfig } from '@nup/app-kit/tailwind';

export default {
  ...nupTailwindConfig,
  content: [
    "./client/index.html",
    "./client/src/**/*.{ts,tsx}",
  ],
};
