import { defineConfig } from "vite";

// base relativa: funciona tanto en la raíz como en GitHub Pages (usuario.github.io/repo/)
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
  },
});
