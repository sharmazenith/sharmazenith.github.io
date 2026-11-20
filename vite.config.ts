import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// Base "/" works for a user site (username.github.io).
// For a project site (username.github.io/repo) set base to "/repo/".
export default defineConfig({
  plugins: [react()],
  base: "/",
})
