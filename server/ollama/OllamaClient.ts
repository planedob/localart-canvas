export interface LocalChatRequest {
	message: string
	selectedShapes: unknown[]
	screenshotDataUrl?: string
}

export interface LocalChatResponse {
	message: string
	model: string
}

interface OllamaClientOptions {
	baseUrl: string
	model: string | null
	fetchImplementation?: typeof fetch
}

interface OllamaTagsResponse {
	models?: Array<{ name?: string }>
}

interface OllamaChatResponse {
	choices?: Array<{ message?: { content?: string } }>
	error?: string
}

async function readJson<T>(response: Response): Promise<T> {
	return (await response.json()) as T
}

export class OllamaClient {
	private readonly baseUrl: string
	private readonly configuredModel: string | null
	private readonly fetchImplementation: typeof fetch

	constructor({
		baseUrl,
		model,
		fetchImplementation = fetch,
	}: OllamaClientOptions) {
		this.baseUrl = baseUrl.replace(/\/+$/, '')
		this.configuredModel = model
		this.fetchImplementation = fetchImplementation
	}

	async listModels(): Promise<string[]> {
		let response: Response
		try {
			response = await this.fetchImplementation(`${this.baseUrl}/api/tags`)
		} catch (error) {
			throw new Error(`Could not connect to Ollama at ${this.baseUrl}`, { cause: error })
		}

		if (!response.ok) {
			throw new Error(`Ollama model discovery failed (${response.status})`)
		}

		const body = await readJson<OllamaTagsResponse>(response)
		return (body.models ?? [])
			.map((model) => model.name)
			.filter((name): name is string => Boolean(name))
	}

	private async resolveModel(): Promise<string> {
		const installedModels = await this.listModels()
		if (installedModels.length === 0) {
			throw new Error('No Ollama models are installed. Run "ollama pull <model>" and try again.')
		}

		if (!this.configuredModel) return installedModels[0]
		if (!installedModels.includes(this.configuredModel)) {
			throw new Error(
				`Configured Ollama model "${this.configuredModel}" is not installed. Installed models: ${installedModels.join(', ')}`
			)
		}
		return this.configuredModel
	}

	async chat(request: LocalChatRequest): Promise<LocalChatResponse> {
		const model = await this.resolveModel()
		const context = JSON.stringify(request.selectedShapes)
		const text = `${request.message}\n\nSelected canvas shapes:\n${context}`
		const userContent = request.screenshotDataUrl
			? [
					{ type: 'text', text },
					{ type: 'image_url', image_url: { url: request.screenshotDataUrl } },
				]
			: text

		let response: Response
		try {
			response = await this.fetchImplementation(`${this.baseUrl}/v1/chat/completions`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer ollama',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model,
					messages: [{ role: 'user', content: userContent }],
					stream: false,
				}),
			})
		} catch (error) {
			throw new Error(`Could not connect to Ollama at ${this.baseUrl}`, { cause: error })
		}

		const body = await readJson<OllamaChatResponse>(response)
		if (!response.ok) {
			throw new Error(
				`Ollama request failed (${response.status}): ${body.error ?? response.statusText}`
			)
		}

		const message = body.choices?.[0]?.message?.content?.trim()
		if (!message) {
			throw new Error('Ollama returned an empty response')
		}

		return { message, model }
	}
}
