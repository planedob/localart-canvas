import { describe, expect, it, vi } from 'vitest'
import { ComfyUIClient, patchWorkflowPrompt } from './ComfyUIClient'

const workflow = {
	'6': {
		class_type: 'CLIPTextEncode',
		inputs: { text: 'old prompt', clip: ['4', 1] },
	},
	'9': {
		class_type: 'SaveImage',
		inputs: { filename_prefix: 'ComfyUI', images: ['8', 0] },
	},
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

describe('patchWorkflowPrompt', () => {
	it('clones the workflow and replaces only the configured prompt node text', () => {
		const patched = patchWorkflowPrompt(workflow, '6', 'make it cinematic')

		expect(patched['6'].inputs.text).toBe('make it cinematic')
		expect(patched['6'].inputs.clip).toEqual(['4', 1])
		expect(workflow['6'].inputs.text).toBe('old prompt')
	})

	it('rejects a missing or incompatible prompt node', () => {
		expect(() => patchWorkflowPrompt(workflow, '404', 'prompt')).toThrow(
			'ComfyUI prompt node "404" was not found'
		)
	})
})

describe('ComfyUIClient.generate', () => {
	it('submits a workflow, waits for output, and downloads the image', async () => {
		const imageBytes = new Uint8Array([1, 2, 3, 4])
		const fetchImplementation = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ prompt_id: 'prompt-1', number: 1 }))
			.mockResolvedValueOnce(
				jsonResponse({
					'prompt-1': {
						outputs: {
							'9': {
								images: [
									{ filename: 'result.png', subfolder: 'localart', type: 'output' },
								],
							},
						},
					},
				})
			)
			.mockResolvedValueOnce(
				new Response(imageBytes, {
					status: 200,
					headers: { 'Content-Type': 'image/png' },
				})
			)
		const client = new ComfyUIClient({
			baseUrl: 'http://comfy.test',
			workflow,
			promptNodeId: '6',
			fetchImplementation,
			pollIntervalMs: 0,
			maxPollAttempts: 2,
		})

		const result = await client.generate('make it cinematic')

		expect(result).toEqual({
			promptId: 'prompt-1',
			filename: 'result.png',
			mimeType: 'image/png',
			imageBytes,
		})
		expect(fetchImplementation.mock.calls[0][0]).toBe('http://comfy.test/prompt')
		expect(JSON.parse(String(fetchImplementation.mock.calls[0][1]?.body))).toMatchObject({
			prompt: { '6': { inputs: { text: 'make it cinematic' } } },
		})
		expect(String(fetchImplementation.mock.calls[2][0])).toContain('/view?')
	})

	it('surfaces node validation errors from prompt submission', async () => {
		const client = new ComfyUIClient({
			baseUrl: 'http://comfy.test',
			workflow,
			promptNodeId: '6',
			fetchImplementation: vi.fn().mockResolvedValue(
				jsonResponse(
					{
						error: { message: 'Prompt outputs failed validation' },
						node_errors: { '6': { errors: [{ message: 'text is required' }] } },
					},
					400
				)
			),
			pollIntervalMs: 0,
			maxPollAttempts: 1,
		})

		await expect(client.generate('')).rejects.toThrow(
			'ComfyUI prompt failed (400): Prompt outputs failed validation; node 6: text is required'
		)
	})

	it('times out when the prompt never produces an image', async () => {
		const fetchImplementation = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ prompt_id: 'prompt-2', number: 1 }))
			.mockImplementation(async () => jsonResponse({}))
		const client = new ComfyUIClient({
			baseUrl: 'http://comfy.test',
			workflow,
			promptNodeId: '6',
			fetchImplementation,
			pollIntervalMs: 0,
			maxPollAttempts: 2,
		})

		await expect(client.generate('prompt')).rejects.toThrow(
			'ComfyUI generation timed out for prompt prompt-2'
		)
	})
})
