import type { LocalChatRequest } from '../server/ollama/OllamaClient'
import type { RoutedChatResponse } from '../server/model/types'

interface ApiErrorBody {
	error?: string
}

export interface GenerationResponse {
	assetId: string
	url: string
	promptId: string
}

export async function requestLocalChat(
	request: LocalChatRequest,
	fetchImplementation: typeof fetch = fetch
): Promise<RoutedChatResponse> {
	const response = await fetchImplementation('/api/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request),
	})
	const body = (await response.json()) as RoutedChatResponse | ApiErrorBody

	if (!response.ok) {
		throw new Error('error' in body && body.error ? body.error : `Local chat failed (${response.status})`)
	}

	return body as RoutedChatResponse
}

export async function requestGeneration(
	prompt: string,
	fetchImplementation: typeof fetch = fetch
): Promise<GenerationResponse> {
	const response = await fetchImplementation('/api/generations', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ prompt }),
	})
	const body = (await response.json()) as GenerationResponse | ApiErrorBody
	if (!response.ok) {
		throw new Error(
			'error' in body && body.error ? body.error : `Image generation failed (${response.status})`
		)
	}
	return body as GenerationResponse
}
