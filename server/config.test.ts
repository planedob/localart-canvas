import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createRuntimeConfig } from './config'

describe('createRuntimeConfig', () => {
	it('uses local-first defaults', () => {
		const projectDirectory = path.resolve('/workspace/localart-canvas')
		const config = createRuntimeConfig({}, projectDirectory)

			expect(config).toEqual({
			host: '127.0.0.1',
			port: 3001,
			ollamaBaseUrl: 'http://127.0.0.1:11434',
			ollamaModel: null,
			comfyuiBaseUrl: 'http://127.0.0.1:8188',
			comfyuiWorkflowPath: path.join(projectDirectory, 'config/comfyui-workflow.json'),
			comfyuiPromptNodeId: '4',
			canvasDirectory: path.join(projectDirectory, 'canvas'),
			modelConfigDirectory: path.join(projectDirectory, '.localart'),
		})
	})

	it('accepts explicit environment overrides', () => {
		const projectDirectory = path.resolve('/workspace/localart-canvas')
		const config = createRuntimeConfig(
			{
				LOCALART_HOST: '0.0.0.0',
				LOCALART_PORT: '4100',
				OLLAMA_BASE_URL: 'http://ollama.test:11434/',
				OLLAMA_MODEL: 'qwen3:4b',
				COMFYUI_BASE_URL: 'http://comfy.test:8188/',
				COMFYUI_WORKFLOW_PATH: './fixtures/workflow.json',
				COMFYUI_PROMPT_NODE_ID: '42',
				LOCALART_CANVAS_DIR: './tmp/canvas',
				LOCALART_CONFIG_DIR: './tmp/model-config',
			},
			projectDirectory
		)

		expect(config).toEqual({
			host: '0.0.0.0',
			port: 4100,
			ollamaBaseUrl: 'http://ollama.test:11434',
			ollamaModel: 'qwen3:4b',
			comfyuiBaseUrl: 'http://comfy.test:8188',
			comfyuiWorkflowPath: path.join(projectDirectory, 'fixtures/workflow.json'),
			comfyuiPromptNodeId: '42',
			canvasDirectory: path.join(projectDirectory, 'tmp/canvas'),
			modelConfigDirectory: path.join(projectDirectory, 'tmp/model-config'),
		})
	})

	it.each(['0', '70000', 'not-a-number'])('rejects invalid ports: %s', (port) => {
		expect(() => createRuntimeConfig({ LOCALART_PORT: port }, '/workspace')).toThrow(
			'LOCALART_PORT'
		)
	})
})
