import { constants } from 'node:fs'
import { access, mkdir, stat } from 'node:fs/promises'
import { createServer, Server } from 'node:http'
import path from 'node:path'
import { createApp } from '../server/app'
import { createGenerationService } from '../server/comfy/GenerationService'
import { createRuntimeConfig } from '../server/config'
import { ModelConfigStore } from '../server/model/ModelConfigStore'
import { ModelRoutingService } from '../server/model/ModelRoutingService'

export interface UtilityServiceOptions {
	environment: Record<string, string | undefined>
	projectDirectory: string
	rendererDirectory?: string
	serveRenderer: boolean
	fetchImplementation?: typeof fetch
}

export interface RunningUtilityService {
	host: '127.0.0.1'
	port: number
	origin: string
	close(): Promise<void>
}

async function validateRendererDirectory(directory: string): Promise<string> {
	try {
		if (!(await stat(directory)).isDirectory()) throw new Error('path is not a directory')
		const indexPath = path.join(directory, 'index.html')
		await access(indexPath, constants.R_OK)
		return indexPath
	} catch (error) {
		throw new Error(
			`Renderer directory is unavailable at ${directory}: ${
				error instanceof Error ? error.message : 'unknown error'
			}`
		)
	}
}

function listen(server: Server, host: string): Promise<number> {
	return new Promise((resolve, reject) => {
		const onError = (error: Error) => reject(error)
		server.once('error', onError)
		server.listen(0, host, () => {
			server.off('error', onError)
			const address = server.address()
			if (!address || typeof address === 'string') {
				reject(new Error('LocalArt service did not receive a TCP port'))
				return
			}
			resolve(address.port)
		})
	})
}

export async function startUtilityService(
	options: UtilityServiceOptions
): Promise<RunningUtilityService> {
	const host = '127.0.0.1' as const
	const baseConfig = createRuntimeConfig(options.environment, options.projectDirectory)
	const config = { ...baseConfig, host, port: 0 }

	await mkdir(config.canvasDirectory, { recursive: true })
	await access(config.canvasDirectory, constants.R_OK | constants.W_OK)
	await mkdir(config.modelConfigDirectory, { recursive: true })
	await access(config.modelConfigDirectory, constants.R_OK | constants.W_OK)

	const indexPath =
		options.serveRenderer && options.rendererDirectory
			? await validateRendererDirectory(options.rendererDirectory)
			: undefined
	if (options.serveRenderer && !indexPath) {
		throw new Error('Renderer directory is required when serving the packaged application')
	}

	const generationService = await createGenerationService({
		baseUrl: config.comfyuiBaseUrl,
		workflowPath: config.comfyuiWorkflowPath,
		promptNodeId: config.comfyuiPromptNodeId,
		canvasDirectory: config.canvasDirectory,
	}).catch(() => undefined)
	const fetchImplementation = options.fetchImplementation ?? fetch
	const modelRoutingService = new ModelRoutingService({
		store: new ModelConfigStore({
			directory: config.modelConfigDirectory,
			environment: options.environment,
		}),
		fetchImplementation,
	})
	const app = createApp(config, fetchImplementation, { generationService, modelRoutingService })

	if (options.serveRenderer && options.rendererDirectory && indexPath) {
		const express = await import('express')
		app.use(express.default.static(options.rendererDirectory))
		app.use((request, response, next) => {
			if (request.method !== 'GET') {
				next()
				return
			}
			response.sendFile(indexPath)
		})
	}

	const server = createServer(app)
	const port = await listen(server, host)

	return {
		host,
		port,
		origin: `http://${host}:${port}`,
		close: () =>
			new Promise<void>((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()))
			}),
	}
}
