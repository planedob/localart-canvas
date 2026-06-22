import { ProviderError, toProviderError } from './ProviderError'
import {
	ChatBackend,
	ChatRequest,
	ModelPreset,
	ModelProvider,
	RoutedChatResponse,
} from './types'

interface BackendRoute {
	backend: ChatBackend
	provider: ModelProvider
	preset: ModelPreset
}

interface ChatRouterOptions {
	primary: BackendRoute
	backup?: BackendRoute
}

export class ChatRouter {
	constructor(private readonly routes: ChatRouterOptions) {}

	async chat(request: ChatRequest): Promise<RoutedChatResponse> {
		try {
			const result = await this.routes.primary.backend.chat(request)
			return {
				...result,
				slot: 'primary',
				provider: this.routes.primary.provider,
				preset: this.routes.primary.preset,
			}
		} catch (error) {
			const primaryError = toProviderError(error)
			if (!primaryError.retryable) throw primaryError
			if (!this.routes.backup) {
				throw new ProviderError(
					primaryError.kind,
					`${primaryError.message}; no backup model is available`,
					{ retryable: false, status: primaryError.status, cause: primaryError }
				)
			}

			try {
				const result = await this.routes.backup.backend.chat(request)
				return {
					...result,
					slot: 'backup',
					provider: this.routes.backup.provider,
					preset: this.routes.backup.preset,
					fallback: { from: 'primary', reason: primaryError.message },
				}
			} catch (error) {
				const backupError = toProviderError(error)
				throw new ProviderError(
					backupError.kind,
					`Primary failed: ${primaryError.message}; Backup failed: ${backupError.message}`,
					{ retryable: false, status: backupError.status, cause: backupError }
				)
			}
		}
	}
}
