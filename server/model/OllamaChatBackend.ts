import { LocalChatRequest, LocalChatResponse } from '../ollama/OllamaClient'
import { ProviderError, toProviderError } from './ProviderError'
import { ChatBackend, ChatRequest, ChatResult } from './types'

interface OllamaClientLike {
	chat(request: LocalChatRequest): Promise<LocalChatResponse>
}

export class OllamaChatBackend implements ChatBackend {
	constructor(private readonly client: OllamaClientLike) {}

	async chat(request: ChatRequest): Promise<ChatResult> {
		try {
			return await this.client.chat(request)
		} catch (error) {
			if (error instanceof Error && /timed out|timeout/i.test(error.message)) {
				throw new ProviderError('timeout', error.message, { retryable: true, cause: error })
			}
			if (error instanceof Error && /request failed \(5\d\d\)/i.test(error.message)) {
				throw new ProviderError('server', error.message, { retryable: true, cause: error })
			}
			throw toProviderError(error)
		}
	}
}
