import { nupTailwindConfig } from "@nup/app-kit/tailwind";
import type { Config } from "tailwindcss";

export default {
  ...nupTailwindConfig,
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
} satisfies Config;
