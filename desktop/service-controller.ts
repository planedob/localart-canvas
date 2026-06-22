import { reduceServiceState, ServiceEvent, ServiceState } from './service-lifecycle'

interface ServiceControllerDependencies {
	openMainWindow(port: number): void
	showFailure(message: string): void
	terminateUtility(): void
}

export interface ServiceController {
	handle(event: ServiceEvent): void
	shutdown(): void
	getState(): ServiceState
}

export function createServiceController(
	dependencies: ServiceControllerDependencies
): ServiceController {
	let state: ServiceState = { status: 'starting' }
	let shutdownStarted = false

	return {
		handle(event) {
			const previousState = state
			state = reduceServiceState(state, event)
			if (state.status === 'ready' && previousState.status !== 'ready') {
				dependencies.openMainWindow(state.port)
			}
			if (state.status === 'failed' && previousState.status !== 'failed') {
				dependencies.showFailure(state.message)
			}
		},
		shutdown() {
			if (shutdownStarted) return
			shutdownStarted = true
			dependencies.terminateUtility()
		},
		getState() {
			return state
		},
	}
}
