import type {
	ModelSlotConfig,
	RoutingConfigUpdate,
	SanitizedModelSlot,
	SanitizedRoutingConfig,
	SecretUpdate,
} from '../server/model/types'

export interface ModelRoutingEditorState extends SanitizedRoutingConfig {
	primaryApiKeyInput: string
	backupApiKeyInput: string
	primaryClearApiKey: boolean
	backupClearApiKey: boolean
}

export function createEditorState(config: SanitizedRoutingConfig): ModelRoutingEditorState {
	return {
		primary: structuredClone(config.primary),
		backup: structuredClone(config.backup),
		primaryApiKeyInput: '',
		backupApiKeyInput: '',
		primaryClearApiKey: false,
		backupClearApiKey: false,
	}
}

export function swapSlots(state: ModelRoutingEditorState): ModelRoutingEditorState {
	return {
		primary: state.backup,
		backup: state.primary,
		primaryApiKeyInput: state.backupApiKeyInput,
		backupApiKeyInput: state.primaryApiKeyInput,
		primaryClearApiKey: state.backupClearApiKey,
		backupClearApiKey: state.primaryClearApiKey,
	}
}

function publicSlot(slot: SanitizedModelSlot): ModelSlotConfig {
	const { hasApiKey: _hasApiKey, environmentOverrides: _environmentOverrides, ...config } = slot
	return config
}

function secretUpdate(input: string, clear: boolean): SecretUpdate {
	if (clear) return { action: 'clear' }
	if (input.trim()) return { action: 'set', value: input.trim() }
	return { action: 'retain' }
}

export function buildSavePayload(state: ModelRoutingEditorState): RoutingConfigUpdate {
	return {
		config: { primary: publicSlot(state.primary), backup: publicSlot(state.backup) },
		secretUpdates: {
			primary: secretUpdate(state.primaryApiKeyInput, state.primaryClearApiKey),
			backup: secretUpdate(state.backupApiKeyInput, state.backupClearApiKey),
		},
	}
}
