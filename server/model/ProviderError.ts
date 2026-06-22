export type ProviderErrorKind =
	| 'network'
	| 'timeout'
	| 'rate_limit'
	| 'server'
	| 'auth'
	| 'invalid_request'
	| 'model_not_found'
	| 'policy'
	| 'malformed_response'
	| 'config'

interface ProviderErrorOptions {
	retryable: boolean
	status?: number
	cause?: unknown
}

export class ProviderError extends Error {
	readonly kind: ProviderErrorKind
	readonly retryable: boolean
	readonly status?: number

	constructor(kind: ProviderErrorKind, safeMessage: string, options: ProviderErrorOptions) {
		super(safeMessage, options.cause === undefined ? undefined : { cause: options.cause })
		this.name = 'ProviderError'
		this.kind = kind
		this.retryable = options.retryable
		this.status = options.status
	}
}

function providerMessage(body: unknown, fallback: string): string {
	if (!body || typeof body !== 'object') return fallback
	const error = (body as { error?: unknown }).error
	if (typeof error === 'string' && error.trim()) return error.trim()
	if (error && typeof error === 'object') {
		const message = (error as { message?: unknown }).message
		if (typeof message === 'string' && message.trim()) return message.trim()
	}
	return fallback
}

export function classifyHttpError(status: number, body: unknown): ProviderError {
	const detail = providerMessage(body, `Provider request failed (${status})`)
	if (status === 429) {
		return new ProviderError('rate_limit', detail, { retryable: true, status })
	}
	if (status >= 500) {
		return new ProviderError('server', detail, { retryable: true, status })
	}
	if (status === 401 || status === 403) {
		return new ProviderError('auth', detail, { retryable: false, status })
	}
	if (status === 404) {
		return new ProviderError('model_not_found', detail, { retryable: false, status })
	}
	return new ProviderError('invalid_request', detail, { retryable: false, status })
}

export function toProviderError(error: unknown): ProviderError {
	if (error instanceof ProviderError) return error
	if (error instanceof DOMException && ['AbortError', 'TimeoutError'].includes(error.name)) {
		return new ProviderError('timeout', 'Model request timed out', {
			retryable: true,
			cause: error,
		})
	}
	if (error instanceof TypeError) {
		return new ProviderError('network', 'Could not connect to the model provider', {
			retryable: true,
			cause: error,
		})
	}
	if (error instanceof Error && /could not connect/i.test(error.message)) {
		return new ProviderError('network', error.message, { retryable: true, cause: error })
	}
	return new ProviderError('invalid_request', error instanceof Error ? error.message : 'Model request failed', {
		retryable: false,
		cause: error,
	})
}
