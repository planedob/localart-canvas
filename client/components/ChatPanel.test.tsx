import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { CanvasExportActions, ChatEntryView, ChatSubmitLabel } from './ChatPanel'

describe('chat route feedback', () => {
	test('renders the actual backup model and fallback reason', () => {
		const markup = renderToStaticMarkup(
			<ChatEntryView entry={{
				role: 'assistant', text: 'Answer', model: 'claude-model', slot: 'backup',
				preset: 'aibuff', fallbackReason: 'Primary timed out',
			}} />
		)
		expect(markup).toContain('Backup · AIBuff · claude-model')
		expect(markup).toContain('Primary timed out')
	})

	test('uses provider-neutral submit copy', () => {
		expect(renderToStaticMarkup(<ChatSubmitLabel isSending={false} />)).toContain('Send to model')
	})

	test('renders canvas export links', () => {
		const markup = renderToStaticMarkup(<CanvasExportActions onExportPng={() => undefined} />)

		expect(markup).toContain('/api/export/canvas.json')
		expect(markup).toContain('/api/export/canvas.zip')
		expect(markup).toContain('Export JSON')
		expect(markup).toContain('Export ZIP')
		expect(markup).toContain('Export PNG')
		expect(markup).toContain('⌘/Ctrl+Shift+P')
	})
})
