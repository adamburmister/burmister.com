import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
	site: "https://burmister.com",
	output: "server",
	adapter: cloudflare({
		imageService: "compile",
	}),
	session: {
		driver: "memory",
	},
	integrations: [sitemap()],
	vite: {
		build: {
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (id.includes("node_modules/three")) {
							return "three";
						}
						if (id.includes("node_modules/cool-retro-term-renderer")) {
							return "crt-renderer";
						}
						if (id.includes("node_modules/@xterm")) {
							return "xterm";
						}
						if (id.includes("src/terminal/")) {
							return "terminal-programs";
						}
					},
				},
			},
		},
	},
});
