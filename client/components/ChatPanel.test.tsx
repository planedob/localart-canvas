import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { ChatEntryView, ChatSubmitLabel } from './ChatPanel'

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
})
