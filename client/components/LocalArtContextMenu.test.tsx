import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'
import { LocalArtContextMenuActions } from './LocalArtContextMenu'

describe('LocalArtContextMenuActions', () => {
	test('renders LocalArt right-click actions', () => {
		const markup = renderToStaticMarkup(<LocalArtContextMenuActions dispatchAgentAction={vi.fn()} />)

		expect(markup).toContain('LocalArt')
		expect(markup).toContain('Export selection PNG')
		expect(markup).toContain('Add AI placeholder')
		expect(markup).toContain('Generate revision')
	})
})
