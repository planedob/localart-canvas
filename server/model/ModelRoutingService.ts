import { OllamaClient } from '../ollama/OllamaClient'
import { ChatRouter } from './ChatRouter'
import { ModelConfigStore } from './ModelConfigStore'
import { OllamaChatBackend } from './OllamaChatBackend'
import { OpenAICompatibleBackend } from './OpenAICompatibleBackend'
import { ProviderError } from './ProviderError'
import {
	ChatBackend,
	ChatRequest,
	ChatResult,
	ModelSlotName,
	ResolvedModelSlot,
	RoutedChatResponse,
	RoutingConfigUpdate,
	SanitizedRoutingConfig,
} from './types'

interface ModelRoutingServiceOptions {
	store: ModelConfigStore
	fetchImplementation?: typeof fetch
}

export class ModelRoutingService {
	private readonly store: ModelConfigStore
	private readonly fetchImplementation: typeof fetch

	constructor({ store, fetchImplementation = fetch }: ModelRoutingServiceOptions) {
		this.store = store
		this.fetchImplementation = fetchImplementation
	}

	readSanitized(): Promise<SanitizedRoutingConfig> {
		return this.store.readSanitized()
	}

	update(update: RoutingConfigUpdate): Promise<void> {
		return this.store.update(update)
	}

	private buildBackend(slot: ResolvedModelSlot): ChatBackend {
		if (!slot.enabled) {
			throw new ProviderError('config', 'The selected model slot is disabled', { retryable: false })
		}
		if (slot.provider === 'ollama') {
			return new OllamaChatBackend(
				new OllamaClient({
					baseUrl: slot.baseUrl,
					model: slot.model || null,
					fetchImplementation: this.fetchImplementation,
				})
			)
		}
		if (!slot.apiKey) {
			throw new ProviderError('config', 'API key is required for this model slot', {
				retryable: false,
			})
		}
		return new OpenAICompatibleBackend({
			baseUrl: slot.baseUrl,
			apiKey: slot.apiKey,
			model: slot.model,
			timeoutMs: slot.timeoutMs,
			fetchImplementation: this.fetchImplementation,
		})
	}

	async chat(request: ChatRequest): Promise<RoutedChatResponse> {
		const config = await this.store.readResolved()
		if (!config.primary.enabled) {
			throw new ProviderError('config', 'Primary model slot is disabled', { retryable: false })
		}
		const router = new ChatRouter({
			primary: {
				backend: this.buildBackend(config.primary),
				provider: config.primary.provider,
				preset: config.primary.preset,
			},
			...(config.backup.enabled
				? {
						backup: {
							backend: this.buildBackend(config.backup),
							provider: config.backup.provider,
							preset: config.backup.preset,
						},
					}
				: {}),
		})
		return router.chat(request)
	}

	async testConnection(slotName: ModelSlotName): Promise<ChatResult> {
		const config = await this.store.readResolved()
		return this.buildBackend(config[slotName]).chat({
			message: 'Reply with LOCALART_CONNECTION_OK.',
			selectedShapes: [],
		})
	}
}
