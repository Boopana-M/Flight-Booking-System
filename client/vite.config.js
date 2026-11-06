// STEP 1: Vite config file (React)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// STEP 2: export config
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});

