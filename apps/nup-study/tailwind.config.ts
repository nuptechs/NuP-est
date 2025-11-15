import { nupTailwindConfig } from "@nup/app-kit/tailwind";
import type { Config } from "tailwindcss";

export default {
  ...nupTailwindConfig,
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    ...nupTailwindConfig.theme,
    extend: {
      ...nupTailwindConfig.theme?.extend,
      colors: {
        ...(nupTailwindConfig.theme?.extend as any)?.colors,
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
        },
        info: {
          DEFAULT: "var(--info)",
          foreground: "var(--info-foreground)",
        },
      },
    },
  },
  plugins: [
    ...(nupTailwindConfig.plugins || []),
    require("@tailwindcss/typography"),
  ],
} satisfies Config;
