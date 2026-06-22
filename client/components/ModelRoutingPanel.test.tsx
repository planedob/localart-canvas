import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'
import { createEditorState } from '../model-routing-state'
import { ModelRoutingPanelView } from './ModelRoutingPanel'

describe('ModelRoutingPanelView', () => {
	test('renders both full slot cards and save controls', () => {
		const state = createEditorState({
			primary: { enabled: true, provider: 'ollama', preset: 'ollama', baseUrl: 'http://localhost:11434', model: '', timeoutMs: 120000, hasApiKey: false, environmentOverrides: [] },
			backup: { enabled: false, provider: 'openai-compatible', preset: 'aibuff', baseUrl: 'https://api.aibuff.cc/v1', model: 'cloud', timeoutMs: 120000, hasApiKey: true, environmentOverrides: ['apiKey'] },
		})
		const markup = renderToStaticMarkup(
			<ModelRoutingPanelView state={state} status="idle" onStateChange={vi.fn()} onSave={vi.fn()} onTest={vi.fn()} />
		)
		expect(markup).toContain('Primary → Backup')
		expect(markup).toContain('AIBuff')
		expect(markup).toContain('API key configured')
		expect(markup).toContain('Save routing')
	})
})
