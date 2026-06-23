import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'
import { HistoryPanelView } from './HistoryPanel'

describe('HistoryPanelView', () => {
	test('renders empty state and refresh action', () => {
		const markup = renderToStaticMarkup(
			<HistoryPanelView
				error={null}
				isLoading={false}
				onRefresh={() => undefined}
				onRestore={() => undefined}
				restoringId={null}
				status={null}
				versions={[]}
			/>
		)

		expect(markup).toContain('Canvas History')
		expect(markup).toContain('No saved versions yet')
		expect(markup).toContain('Refresh')
	})

	test('renders restore buttons for version rows', () => {
		const markup = renderToStaticMarkup(
			<HistoryPanelView
				error={null}
				isLoading={false}
				onRefresh={() => undefined}
				onRestore={vi.fn()}
				restoringId={null}
				status="Loaded 2 versions"
				versions={[
					{ id: 'v2', createdAt: '2026-06-24T12:00:00.000Z' },
					{ id: 'v1', createdAt: '2026-06-24T11:00:00.000Z' },
				]}
			/>
		)

		expect(markup).toContain('Loaded 2 versions')
		expect(markup).toContain('v2')
		expect(markup).toContain('2026-06-24 12:00')
		expect(markup).toContain('Restore')
	})

	test('marks the active restore row', () => {
		const markup = renderToStaticMarkup(
			<HistoryPanelView
				error="Restore failed"
				isLoading={false}
				onRefresh={() => undefined}
				onRestore={() => undefined}
				restoringId="v1"
				status={null}
				versions={[{ id: 'v1', createdAt: '2026-06-24T11:00:00.000Z' }]}
			/>
		)

		expect(markup).toContain('Restoring…')
		expect(markup).toContain('Restore failed')
	})
})
