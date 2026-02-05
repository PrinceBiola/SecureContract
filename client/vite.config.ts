import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig(({ mode }) => ({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:3001',
                ws: true,
            }
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: mode === 'development',
        minify: 'esbuild',
        rollupOptions: {
            output: {
                manualChunks: {
                    // Vendor chunk for core dependencies
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    // PDF viewer chunk
                    pdf: ['pdfjs-dist'],
                    // Real-time collaboration chunk
                    realtime: ['yjs', 'y-websocket', 'socket.io-client'],
                    // UI components
                    ui: ['@radix-ui/react-slot', 'class-variance-authority', 'clsx'],
                }
            }
        },
        // Increase chunk warning limit for PDF library
        chunkSizeWarningLimit: 1500,
    },
    // Optimize dependencies
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', 'pdfjs-dist'],
    },
}))
