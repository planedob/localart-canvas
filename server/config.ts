import path from 'node:path'

export interface RuntimeConfig {
	host: string
	port: number
	ollamaBaseUrl: string
	ollamaModel: string | null
	comfyuiBaseUrl: string
	comfyuiWorkflowPath: string
	comfyuiPromptNodeId: string
	canvasDirectory: string
}

type RuntimeEnvironment = Record<string, string | undefined>

function normalizeBaseUrl(value: string): string {
	return value.replace(/\/+$/, '')
}

function resolveFromProject(projectDirectory: string, value: string): string {
	return path.resolve(projectDirectory, value)
}

function parsePort(value: string | undefined): number {
	if (value === undefined) return 3001

	const port = Number(value)
	if (!Number.isInteger(port) || port < 1 || port > 65_535) {
		throw new Error(`LOCALART_PORT must be an integer between 1 and 65535; received ${value}`)
	}
	return port
}

export function createRuntimeConfig(
	environment: RuntimeEnvironment = process.env,
	projectDirectory = process.cwd()
): RuntimeConfig {
	return {
		host: environment.LOCALART_HOST ?? '127.0.0.1',
		port: parsePort(environment.LOCALART_PORT),
		ollamaBaseUrl: normalizeBaseUrl(
			environment.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434'
		),
		ollamaModel: environment.OLLAMA_MODEL?.trim() || null,
		comfyuiBaseUrl: normalizeBaseUrl(
			environment.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188'
		),
		comfyuiWorkflowPath: resolveFromProject(
			projectDirectory,
			environment.COMFYUI_WORKFLOW_PATH ?? 'config/comfyui-workflow.json'
		),
		comfyuiPromptNodeId: environment.COMFYUI_PROMPT_NODE_ID?.trim() || '6',
		canvasDirectory: resolveFromProject(
			projectDirectory,
			environment.LOCALART_CANVAS_DIR ?? 'canvas'
		),
	}
}
