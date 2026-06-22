import { build } from 'esbuild'

await build({
	entryPoints: {
		main: 'desktop/main.ts',
		preload: 'desktop/preload.ts',
		utility: 'desktop/utility.ts',
	},
	outdir: '.desktop',
	outExtension: { '.js': '.cjs' },
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node22',
	external: ['electron'],
	sourcemap: true,
})
