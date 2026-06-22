import { parentPort } from 'electron'
import { startUtilityService } from './utility-service'

function requiredEnvironment(name: string): string {
	const value = process.env[name]
	if (!value) throw new Error(`${name} is required`)
	return value
}

let closeService: (() => Promise<void>) | undefined

async function shutdown() {
	await closeService?.().catch(() => undefined)
	process.exit(0)
}

try {
	const service = await startUtilityService({
		environment: process.env,
		projectDirectory: requiredEnvironment('LOCALART_PROJECT_DIR'),
		rendererDirectory: process.env.LOCALART_RENDERER_DIR,
		serveRenderer: process.env.LOCALART_SERVE_RENDERER === '1',
	})
	closeService = service.close
	parentPort.postMessage({ type: 'ready', port: service.port })
} catch (error) {
	parentPort.postMessage({
		type: 'error',
		message: error instanceof Error ? error.message : 'LocalArt service failed to start',
	})
	process.exitCode = 1
}

process.once('SIGTERM', () => void shutdown())
process.once('disconnect', () => void shutdown())
