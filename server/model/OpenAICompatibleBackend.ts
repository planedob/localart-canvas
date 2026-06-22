import { ChatBackend, ChatRequest, ChatResult } from './types'
import { classifyHttpError, ProviderError, toProviderError } from './ProviderError'

interface OpenAICompatibleBackendOptions {
	baseUrl: string
	apiKey: string
	model: string
	timeoutMs: number
	fetchImplementation?: typeof fetch
}

function buildUserContent(request: ChatRequest): string | unknown[] {
	const text = `${request.message}\n\nSelected canvas shapes:\n${JSON.stringify(request.selectedShapes)}`
	return request.screenshotDataUrl
		? [
				{ type: 'text', text },
				{ type: 'image_url', image_url: { url: request.screenshotDataUrl } },
			]
		: text
}

async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json()
	} catch (error) {
		throw new ProviderError('malformed_response', 'Model provider returned invalid JSON', {
			retryable: false,
			cause: error,
		})
	}
}

export class OpenAICompatibleBackend implements ChatBackend {
	private readonly options: OpenAICompatibleBackendOptions

	constructor(options: OpenAICompatibleBackendOptions) {
		this.options = options
	}

	async chat(request: ChatRequest): Promise<ChatResult> {
		let response: Response
		try {
			response = await (this.options.fetchImplementation ?? fetch)(
				`${this.options.baseUrl.replace(/\/+$/, '')}/chat/completions`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${this.options.apiKey}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						model: this.options.model,
						messages: [{ role: 'user', content: buildUserContent(request) }],
						stream: false,
					}),
					signal: AbortSignal.timeout(this.options.timeoutMs),
				}
			)
		} catch (error) {
			throw toProviderError(error)
		}

		const body = await readJson(response)
		if (!response.ok) throw classifyHttpError(response.status, body)
		const message = (body as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]
			?.message?.content
		if (typeof message !== 'string' || !message.trim()) {
			throw new ProviderError('malformed_response', 'Model provider returned an empty response', {
				retryable: false,
			})
		}
		return { message: message.trim(), model: this.options.model }
	}
}
