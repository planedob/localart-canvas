export interface ComfyWorkflowNode {
	class_type: string
	inputs: Record<string, unknown>
	[key: string]: unknown
}

export type ComfyWorkflow = Record<string, ComfyWorkflowNode>

export interface ComfyGenerationResult {
	promptId: string
	filename: string
	mimeType: string
	imageBytes: Uint8Array
}

interface ComfyUIClientOptions {
	baseUrl: string
	workflow: ComfyWorkflow
	promptNodeId: string
	fetchImplementation?: typeof fetch
	pollIntervalMs?: number
	maxPollAttempts?: number
}

interface PromptSubmissionResponse {
	prompt_id?: string
	error?: { message?: string } | string
	node_errors?: Record<string, { errors?: Array<{ message?: string }> }>
}

interface ComfyImageReference {
	filename: string
	subfolder?: string
	type?: string
}

interface HistoryEntry {
	outputs?: Record<string, { images?: ComfyImageReference[] }>
	status?: {
		status_str?: string
		messages?: unknown[]
	}
}

export function patchWorkflowPrompt(
	workflow: ComfyWorkflow,
	promptNodeId: string,
	prompt: string
): ComfyWorkflow {
	const patched = structuredClone(workflow)
	const node = patched[promptNodeId]
	if (!node || typeof node.inputs !== 'object' || !('text' in node.inputs)) {
		throw new Error(
			`ComfyUI prompt node "${promptNodeId}" was not found or has no text input`
		)
	}
	node.inputs.text = prompt
	return patched
}

function formatPromptError(status: number, body: PromptSubmissionResponse): string {
	const baseMessage =
		typeof body.error === 'string'
			? body.error
			: body.error?.message ?? 'prompt submission failed'
	const nodeMessages = Object.entries(body.node_errors ?? {}).flatMap(([nodeId, detail]) =>
		(detail.errors ?? []).map((error) => `node ${nodeId}: ${error.message ?? 'validation error'}`)
	)
	return `ComfyUI prompt failed (${status}): ${[baseMessage, ...nodeMessages].join('; ')}`
}

function findFirstImage(entry: HistoryEntry | undefined): ComfyImageReference | null {
	if (!entry?.outputs) return null
	for (const output of Object.values(entry.outputs)) {
		const image = output.images?.[0]
		if (image?.filename) return image
	}
	return null
}

function delay(milliseconds: number): Promise<void> {
	if (milliseconds <= 0) return Promise.resolve()
	return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export class ComfyUIClient {
	private readonly baseUrl: string
	private readonly workflow: ComfyWorkflow
	private readonly promptNodeId: string
	private readonly fetchImplementation: typeof fetch
	private readonly pollIntervalMs: number
	private readonly maxPollAttempts: number

	constructor({
		baseUrl,
		workflow,
		promptNodeId,
		fetchImplementation = fetch,
		pollIntervalMs = 500,
		maxPollAttempts = 240,
	}: ComfyUIClientOptions) {
		this.baseUrl = baseUrl.replace(/\/+$/, '')
		this.workflow = workflow
		this.promptNodeId = promptNodeId
		this.fetchImplementation = fetchImplementation
		this.pollIntervalMs = pollIntervalMs
		this.maxPollAttempts = maxPollAttempts
	}

	async generate(prompt: string): Promise<ComfyGenerationResult> {
		const patchedWorkflow = patchWorkflowPrompt(this.workflow, this.promptNodeId, prompt)
		let submissionResponse: Response
		try {
			submissionResponse = await this.fetchImplementation(`${this.baseUrl}/prompt`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt: patchedWorkflow,
					client_id: 'localart-canvas',
				}),
			})
		} catch (error) {
			throw new Error(`Could not connect to ComfyUI at ${this.baseUrl}`, { cause: error })
		}

		const submission = (await submissionResponse.json()) as PromptSubmissionResponse
		if (!submissionResponse.ok || !submission.prompt_id) {
			throw new Error(formatPromptError(submissionResponse.status, submission))
		}

		const promptId = submission.prompt_id
		for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
			if (attempt > 0) await delay(this.pollIntervalMs)
			const historyResponse = await this.fetchImplementation(
				`${this.baseUrl}/history/${encodeURIComponent(promptId)}`
			)
			if (!historyResponse.ok) {
				throw new Error(`ComfyUI history request failed (${historyResponse.status})`)
			}
			const history = (await historyResponse.json()) as Record<string, HistoryEntry>
			const entry = history[promptId]
			if (entry?.status?.status_str === 'error') {
				throw new Error(`ComfyUI execution failed for prompt ${promptId}`)
			}
			const image = findFirstImage(entry)
			if (!image) continue

			const query = new URLSearchParams({
				filename: image.filename,
				subfolder: image.subfolder ?? '',
				type: image.type ?? 'output',
			})
			const imageResponse = await this.fetchImplementation(`${this.baseUrl}/view?${query}`)
			if (!imageResponse.ok) {
				throw new Error(`ComfyUI image download failed (${imageResponse.status})`)
			}
			return {
				promptId,
				filename: image.filename,
				mimeType: imageResponse.headers.get('Content-Type') ?? 'application/octet-stream',
				imageBytes: new Uint8Array(await imageResponse.arrayBuffer()),
			}
		}

		throw new Error(`ComfyUI generation timed out for prompt ${promptId}`)
	}
}
