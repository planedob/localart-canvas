import { createApp } from './app'
import { createGenerationService } from './comfy/GenerationService'
import { createRuntimeConfig } from './config'

const config = createRuntimeConfig()
const generationService = await createGenerationService({
	baseUrl: config.comfyuiBaseUrl,
	workflowPath: config.comfyuiWorkflowPath,
	promptNodeId: config.comfyuiPromptNodeId,
	canvasDirectory: config.canvasDirectory,
}).catch((error) => {
	console.warn(
		`ComfyUI generation disabled: ${
			error instanceof Error ? error.message : 'workflow could not be loaded'
		}`
	)
	return undefined
})
const app = createApp(config, fetch, { generationService })

app.listen(config.port, config.host, () => {
	console.log(`LocalArt tool server listening at http://${config.host}:${config.port}`)
})
