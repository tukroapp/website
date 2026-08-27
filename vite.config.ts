import tailwindcss from "@tailwindcss/vite";
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit({
            compilerOptions: {
                // Força o modo runes no projeto, menos nas bibliotecas. Dá para remover no svelte 6.
                runes: ({ filename }) =>
                    filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
                experimental: { async: true },
            },
            adapter: adapter({
                pages: "build",
                assets: "build",
                fallback: "index.html",
                precompress: false,
                strict: true,
            }),
            experimental: { remoteFunctions: true },
        }),
    ],
});
