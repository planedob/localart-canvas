import { describe, expect, test } from 'vitest'
import { buildSavePayload, createEditorState, swapSlots } from './model-routing-state'
import { SanitizedRoutingConfig } from '../server/model/types'

const routing: SanitizedRoutingConfig = {
	primary: {
		enabled: true, provider: 'ollama', preset: 'ollama', baseUrl: 'http://localhost:11434',
		model: '', timeoutMs: 120000, hasApiKey: false, environmentOverrides: [],
	},
	backup: {
		enabled: false, provider: 'openai-compatible', preset: 'aibuff', baseUrl: 'https://api.aibuff.cc/v1',
		model: 'cloud', timeoutMs: 120000, hasApiKey: true, environmentOverrides: [],
	},
}

describe('model routing editor state', () => {
	test('swaps complete slots including pending secret input', () => {
		const state = createEditorState(routing)
		state.primaryApiKeyInput = 'primary-new-key'
		const swapped = swapSlots(state)
		expect(swapped.primary.preset).toBe('aibuff')
		expect(swapped.backupApiKeyInput).toBe('primary-new-key')
	})

	test('retains empty keys and clears only explicit clear actions', () => {
		const state = createEditorState(routing)
		expect(buildSavePayload(state).secretUpdates.primary).toEqual({ action: 'retain' })
		state.backupClearApiKey = true
		expect(buildSavePayload(state).secretUpdates.backup).toEqual({ action: 'clear' })
		state.primaryApiKeyInput = 'new-key'
		expect(buildSavePayload(state).secretUpdates.primary).toEqual({ action: 'set', value: 'new-key' })
	})
})
