import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: [
			'client/**/*.test.ts',
			'client/**/*.test.tsx',
			'desktop/**/*.test.ts',
			'server/**/*.test.ts',
			'scripts/**/*.test.mjs',
		],
	},
})
