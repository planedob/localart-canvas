import type { LocalChatRequest, LocalChatResponse } from '../server/ollama/OllamaClient'

interface ApiErrorBody {
	error?: string
}

export async function requestLocalChat(
	request: LocalChatRequest,
	fetchImplementation: typeof fetch = fetch
): Promise<LocalChatResponse> {
	const response = await fetchImplementation('/api/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request),
	})
	const body = (await response.json()) as LocalChatResponse | ApiErrorBody

	if (!response.ok) {
		throw new Error('error' in body && body.error ? body.error : `Local chat failed (${response.status})`)
	}

	return body as LocalChatResponse
}
