import { defineConfig } from "astro/config"
import mdx from "@astrojs/mdx"

// User site: served from the root of sharmazenith.github.io.
// The old section lived at /kalam. Keep these in step with SECTION.slug in src/config.ts.
export default defineConfig({
  site: "https://sharmazenith.github.io",
  output: "static",
  server: { port: 3000 },
  integrations: [mdx()],
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  redirects: {
    "/kalam": "/elsewhere",
    "/kalam/[type]": "/elsewhere/[type]",
    "/kalam/[type]/[slug]": "/elsewhere/[type]/[slug]",
  },
})
