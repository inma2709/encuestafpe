import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import { fileURLToPath } from "node:url";

export default defineConfig({
  site: "https://encuestafpe.vercel.app",
  output: "server",
  adapter: vercel(),
  security: {
    // Trust only Vercel's forwarded production host while keeping Astro's CSRF check enabled.
    checkOrigin: true,
    allowedDomains: [
      {
        protocol: "https",
        hostname: "encuestafpe.vercel.app",
      },
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
