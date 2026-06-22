import { describe, expect, test, vi } from 'vitest'
import { createServiceController } from './service-controller'

describe('createServiceController', () => {
	test('opens the main window after ready', () => {
		const openMainWindow = vi.fn()
		const controller = createServiceController({
			openMainWindow,
			showFailure: vi.fn(),
			terminateUtility: vi.fn(),
		})

		controller.handle({ type: 'ready', port: 43_123 })

		expect(openMainWindow).toHaveBeenCalledOnce()
		expect(openMainWindow).toHaveBeenCalledWith(43_123)
	})

	test('shows a startup failure', () => {
		const showFailure = vi.fn()
		const controller = createServiceController({
			openMainWindow: vi.fn(),
			showFailure,
			terminateUtility: vi.fn(),
		})

		controller.handle({ type: 'exit', code: 1 })

		expect(showFailure).toHaveBeenCalledWith('LocalArt service exited before ready (code 1)')
	})

	test('terminates only the injected LocalArt utility once', () => {
		const terminateUtility = vi.fn()
		const controller = createServiceController({
			openMainWindow: vi.fn(),
			showFailure: vi.fn(),
			terminateUtility,
		})

		controller.shutdown()
		controller.shutdown()

		expect(terminateUtility).toHaveBeenCalledOnce()
	})
})
