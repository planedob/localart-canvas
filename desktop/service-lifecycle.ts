export type ServiceState =
	| { status: 'starting' }
	| { status: 'ready'; port: number }
	| { status: 'failed'; message: string }

export type ServiceEvent =
	| { type: 'ready'; port: number }
	| { type: 'error'; message: string }
	| { type: 'exit'; code: number }

export function reduceServiceState(state: ServiceState, event: ServiceEvent): ServiceState {
	if (event.type === 'ready') {
		if (!Number.isInteger(event.port) || event.port < 1 || event.port > 65_535) {
			return {
				status: 'failed',
				message: `LocalArt service reported an invalid port: ${event.port}`,
			}
		}
		return { status: 'ready', port: event.port }
	}

	if (event.type === 'error') {
		return {
			status: 'failed',
			message: event.message.trim() || 'LocalArt service failed to start',
		}
	}

	return {
		status: 'failed',
		message:
			state.status === 'ready'
				? `LocalArt service exited unexpectedly (code ${event.code})`
				: `LocalArt service exited before ready (code ${event.code})`,
	}
}
