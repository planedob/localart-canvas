import { useEffect, useState } from 'react'
import type { ModelPreset, ModelSlotName, SanitizedModelSlot } from '../../server/model/types'
import { getModelRouting, saveModelRouting, testModelSlot } from '../model-routing'
import {
	buildSavePayload,
	createEditorState,
	ModelRoutingEditorState,
	swapSlots,
} from '../model-routing-state'

type PanelStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

interface ViewProps {
	state: ModelRoutingEditorState
	status: PanelStatus
	message?: string
	onStateChange(state: ModelRoutingEditorState): void
	onSave(): void
	onTest(slot: ModelSlotName): void
}

const PRESETS: Record<ModelPreset, { label: string; provider: SanitizedModelSlot['provider']; baseUrl: string }> = {
	ollama: { label: 'Ollama', provider: 'ollama', baseUrl: 'http://127.0.0.1:11434' },
	aibuff: { label: 'AIBuff', provider: 'openai-compatible', baseUrl: 'https://api.aibuff.cc/v1' },
	openai: { label: 'OpenAI', provider: 'openai-compatible', baseUrl: 'https://api.openai.com/v1' },
	custom: { label: 'Custom', provider: 'openai-compatible', baseUrl: '' },
}

function SlotCard({
	name,
	slot,
	apiKeyInput,
	clearApiKey,
	onSlotChange,
	onApiKeyChange,
	onClearChange,
	onTest,
}: {
	name: ModelSlotName
	slot: SanitizedModelSlot
	apiKeyInput: string
	clearApiKey: boolean
	onSlotChange(slot: SanitizedModelSlot): void
	onApiKeyChange(value: string): void
	onClearChange(value: boolean): void
	onTest(): void
}) {
	const locked = new Set(slot.environmentOverrides)
	const label = name === 'primary' ? 'Primary' : 'Backup'
	return (
		<fieldset className="model-slot-card">
			<legend>{label}</legend>
			<label><input type="checkbox" checked={slot.enabled} disabled={locked.has('enabled')} onChange={(event) => onSlotChange({ ...slot, enabled: event.currentTarget.checked })} /> Enabled</label>
			<label>Provider preset
				<select aria-label={`${label} provider preset`} value={slot.preset} disabled={locked.has('preset')} onChange={(event) => {
					const preset = event.currentTarget.value as ModelPreset
					const defaults = PRESETS[preset]
					onSlotChange({ ...slot, preset, provider: defaults.provider, baseUrl: defaults.baseUrl || slot.baseUrl })
				}}>{Object.entries(PRESETS).map(([value, preset]) => <option key={value} value={value}>{preset.label}</option>)}</select>
			</label>
			<label>Base URL<input value={slot.baseUrl} disabled={locked.has('baseUrl')} onChange={(event) => onSlotChange({ ...slot, baseUrl: event.currentTarget.value })} /></label>
			<label>Model<input value={slot.model} disabled={locked.has('model')} onChange={(event) => onSlotChange({ ...slot, model: event.currentTarget.value })} /></label>
			{slot.provider === 'openai-compatible' ? <>
				<label>API key<input type="password" value={apiKeyInput} disabled={locked.has('apiKey') || clearApiKey} placeholder={slot.hasApiKey ? 'API key configured' : 'Enter API key'} onChange={(event) => onApiKeyChange(event.currentTarget.value)} /></label>
				<label><input type="checkbox" checked={clearApiKey} disabled={locked.has('apiKey')} onChange={(event) => onClearChange(event.currentTarget.checked)} /> Clear saved key</label>
			</> : null}
			<label>Timeout (ms)<input type="number" min="1000" max="300000" value={slot.timeoutMs} disabled={locked.has('timeoutMs')} onChange={(event) => onSlotChange({ ...slot, timeoutMs: Number(event.currentTarget.value) })} /></label>
			{slot.environmentOverrides.length > 0 ? <small>Environment override: {slot.environmentOverrides.join(', ')}</small> : null}
			<button type="button" onClick={onTest}>Test connection</button>
		</fieldset>
	)
}

export function ModelRoutingPanelView({ state, status, message, onStateChange, onSave, onTest }: ViewProps) {
	function updateSlot(name: ModelSlotName, slot: SanitizedModelSlot) {
		onStateChange({ ...state, [name]: slot })
	}
	return <section className="model-routing-panel">
		<header><strong>Primary → Backup</strong><button type="button" onClick={() => onStateChange(swapSlots(state))}>Swap order</button></header>
		<SlotCard name="primary" slot={state.primary} apiKeyInput={state.primaryApiKeyInput} clearApiKey={state.primaryClearApiKey} onSlotChange={(slot) => updateSlot('primary', slot)} onApiKeyChange={(value) => onStateChange({ ...state, primaryApiKeyInput: value, primaryClearApiKey: false })} onClearChange={(value) => onStateChange({ ...state, primaryClearApiKey: value })} onTest={() => onTest('primary')} />
		<SlotCard name="backup" slot={state.backup} apiKeyInput={state.backupApiKeyInput} clearApiKey={state.backupClearApiKey} onSlotChange={(slot) => updateSlot('backup', slot)} onApiKeyChange={(value) => onStateChange({ ...state, backupApiKeyInput: value, backupClearApiKey: false })} onClearChange={(value) => onStateChange({ ...state, backupClearApiKey: value })} onTest={() => onTest('backup')} />
		<button type="button" className="model-routing-save" disabled={status === 'saving'} onClick={onSave}>{status === 'saving' ? 'Saving…' : 'Save routing'}</button>
		{message ? <p className={status === 'error' ? 'model-routing-error' : 'model-routing-message'}>{message}</p> : null}
	</section>
}

export function ModelRoutingPanel() {
	const [state, setState] = useState<ModelRoutingEditorState | null>(null)
	const [status, setStatus] = useState<PanelStatus>('loading')
	const [message, setMessage] = useState('')

	useEffect(() => {
		let active = true
		void getModelRouting().then((config) => {
			if (!active) return
			setState(createEditorState(config)); setStatus('idle')
		}).catch((error) => { if (active) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Could not load model routing') } })
		return () => { active = false }
	}, [])

	if (!state) return <section className="model-routing-panel">{status === 'error' ? message : 'Loading model routing…'}</section>
	async function save() {
		setStatus('saving'); setMessage('')
		try { await saveModelRouting(buildSavePayload(state)); setState(createEditorState(await getModelRouting())); setStatus('saved'); setMessage('Routing saved') }
		catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Could not save routing') }
	}
	async function test(slot: ModelSlotName) {
		setMessage(`Testing ${slot}…`)
		try { const result = await testModelSlot(slot); setStatus('idle'); setMessage(`${slot} connected: ${result.model}`) }
		catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Connection test failed') }
	}
	return <ModelRoutingPanelView state={state} status={status} message={message} onStateChange={setState} onSave={() => void save()} onTest={(slot) => void test(slot)} />
}
