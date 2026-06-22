export type ModelSlotName = 'primary' | 'backup'
export type ModelProvider = 'ollama' | 'openai-compatible'
export type ModelPreset = 'ollama' | 'aibuff' | 'openai' | 'custom'

export interface ModelSlotConfig {
	enabled: boolean
	provider: ModelProvider
	preset: ModelPreset
	baseUrl: string
	model: string
	timeoutMs: number
}

export interface RoutingConfig {
	primary: ModelSlotConfig
	backup: ModelSlotConfig
}

export type EnvironmentOverrideField = keyof ModelSlotConfig | 'apiKey'

export interface ResolvedModelSlot extends ModelSlotConfig {
	apiKey?: string
}

export interface ResolvedRoutingConfig {
	primary: ResolvedModelSlot
	backup: ResolvedModelSlot
}

export interface SanitizedModelSlot extends ModelSlotConfig {
	hasApiKey: boolean
	environmentOverrides: EnvironmentOverrideField[]
}

export interface SanitizedRoutingConfig {
	primary: SanitizedModelSlot
	backup: SanitizedModelSlot
}

export type SecretUpdate =
	| { action: 'retain' }
	| { action: 'set'; value: string }
	| { action: 'clear' }

export interface RoutingConfigUpdate {
	config: RoutingConfig
	secretUpdates: Record<ModelSlotName, SecretUpdate>
}

export interface ChatRequest {
	message: string
	selectedShapes: unknown[]
	screenshotDataUrl?: string
}

export interface ChatResult {
	message: string
	model: string
}

export interface ChatBackend {
	chat(request: ChatRequest): Promise<ChatResult>
}

export interface RoutedChatResponse extends ChatResult {
	slot: ModelSlotName
	provider: ModelProvider
	preset: ModelPreset
	fallback?: { from: 'primary'; reason: string }
}
