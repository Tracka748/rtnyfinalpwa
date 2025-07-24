// vite.config.ts
import { defineConfig } from "file:///C:/Users/Stock/rtnyfinalpwa/rtny-frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Stock/rtnyfinalpwa/rtny-frontend/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Stock\\rtnyfinalpwa\\rtny-frontend";
var vite_config_default = defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,tsx}",
      exclude: /node_modules/,
      // Exclude node_modules
      babel: {
        parserOpts: {
          plugins: ["typescript", "jsx"]
        }
      }
    })
  ],
  server: {
    port: 3e3,
    host: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
  },
  esbuild: {
    loader: "tsx",
    include: [/\.tsx?$/],
    // More specific pattern
    exclude: [/node_modules/],
    target: "es2020"
  },
  optimizeDeps: {
    include: ["react", "react-dom"]
  },
  build: {
    target: "es2020",
    minify: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxTdG9ja1xcXFxydG55ZmluYWxwd2FcXFxccnRueS1mcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcU3RvY2tcXFxccnRueWZpbmFscHdhXFxcXHJ0bnktZnJvbnRlbmRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL1N0b2NrL3J0bnlmaW5hbHB3YS9ydG55LWZyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3Qoe1xuICAgICAgaW5jbHVkZTogXCIqKi8qLntqc3gsdHN4fVwiLFxuICAgICAgZXhjbHVkZTogL25vZGVfbW9kdWxlcy8sIC8vIEV4Y2x1ZGUgbm9kZV9tb2R1bGVzXG4gICAgICBiYWJlbDoge1xuICAgICAgICBwYXJzZXJPcHRzOiB7XG4gICAgICAgICAgcGx1Z2luczogWyd0eXBlc2NyaXB0JywgJ2pzeCddXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIGhvc3Q6IHRydWVcbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpXG4gICAgfSxcbiAgICBleHRlbnNpb25zOiBbJy50cycsICcudHN4JywgJy5qcycsICcuanN4JywgJy5qc29uJ11cbiAgfSxcbiAgZXNidWlsZDoge1xuICAgIGxvYWRlcjogJ3RzeCcsXG4gICAgaW5jbHVkZTogWy9cXC50c3g/JC9dLCAvLyBNb3JlIHNwZWNpZmljIHBhdHRlcm5cbiAgICBleGNsdWRlOiBbL25vZGVfbW9kdWxlcy9dLFxuICAgIHRhcmdldDogJ2VzMjAyMCdcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogWydyZWFjdCcsICdyZWFjdC1kb20nXVxuICB9LFxuICBidWlsZDoge1xuICAgIHRhcmdldDogJ2VzMjAyMCcsXG4gICAgbWluaWZ5OiB0cnVlXG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXVULFNBQVMsb0JBQW9CO0FBQ3BWLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFGakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLE1BQ0osU0FBUztBQUFBLE1BQ1QsU0FBUztBQUFBO0FBQUEsTUFDVCxPQUFPO0FBQUEsUUFDTCxZQUFZO0FBQUEsVUFDVixTQUFTLENBQUMsY0FBYyxLQUFLO0FBQUEsUUFDL0I7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLElBQ0EsWUFBWSxDQUFDLE9BQU8sUUFBUSxPQUFPLFFBQVEsT0FBTztBQUFBLEVBQ3BEO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixTQUFTLENBQUMsU0FBUztBQUFBO0FBQUEsSUFDbkIsU0FBUyxDQUFDLGNBQWM7QUFBQSxJQUN4QixRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLFNBQVMsV0FBVztBQUFBLEVBQ2hDO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsRUFDVjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
