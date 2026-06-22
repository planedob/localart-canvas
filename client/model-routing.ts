import type {
	ChatResult,
	ModelSlotName,
	RoutingConfigUpdate,
	SanitizedRoutingConfig,
} from '../server/model/types'

interface ApiErrorBody {
	error?: string
}

async function responseJson<T>(response: Response): Promise<T> {
	const body = (await response.json()) as T | ApiErrorBody
	if (!response.ok) {
		throw new Error('error' in body && body.error ? body.error : `Model routing failed (${response.status})`)
	}
	return body as T
}

export async function getModelRouting(fetchImplementation: typeof fetch = fetch): Promise<SanitizedRoutingConfig> {
	return responseJson(await fetchImplementation('/api/model-routing'))
}

export async function saveModelRouting(
	update: RoutingConfigUpdate,
	fetchImplementation: typeof fetch = fetch
): Promise<void> {
	const response = await fetchImplementation('/api/model-routing', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(update),
	})
	if (!response.ok) {
		const body = (await response.json()) as ApiErrorBody
		throw new Error(body.error ?? `Model routing save failed (${response.status})`)
	}
}

export async function testModelSlot(
	slot: ModelSlotName,
	fetchImplementation: typeof fetch = fetch
): Promise<ChatResult> {
	return responseJson(
		await fetchImplementation('/api/model-routing/test', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slot }),
		})
	)
}
