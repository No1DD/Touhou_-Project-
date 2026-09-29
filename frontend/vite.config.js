import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const [owner, repository] = (process.env.GITHUB_REPOSITORY || "").split("/");
const isGitHubPages = process.env.GITHUB_ACTIONS === "true" && Boolean(repository);
const base = isGitHubPages
  ? repository.toLowerCase() === `${owner.toLowerCase()}.github.io`
    ? "/"
    : `/${repository}/`
  : "/";

export default defineConfig({
  plugins: [react()],
  base,
});
