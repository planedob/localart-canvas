type ApiTargetEnvironment = Record<string, string | undefined>

export function getApiTarget(environment: ApiTargetEnvironment): string {
	const value = environment.LOCALART_API_TARGET ?? 'http://127.0.0.1:3001'
	const url = new URL(value)
	if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') {
		throw new Error('LOCALART_API_TARGET must use http://127.0.0.1')
	}
	return url.origin
}
