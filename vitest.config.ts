import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['client/**/*.test.ts', 'client/**/*.test.tsx', 'server/**/*.test.ts'],
	},
})
