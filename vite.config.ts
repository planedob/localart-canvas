import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { zodLocalePlugin } from './scripts/vite-zod-locale-plugin.js'
import { getApiTarget } from './desktop/api-target'

// https://vitejs.dev/config/
export default defineConfig(() => {
	const apiTarget = getApiTarget(process.env)
	return {
		plugins: [
			zodLocalePlugin(fileURLToPath(new URL('./scripts/zod-locales-shim.js', import.meta.url))),
			react(),
		],
		server: {
			proxy: {
				'/api': apiTarget,
				'/assets': apiTarget,
			},
		},
	}
})
