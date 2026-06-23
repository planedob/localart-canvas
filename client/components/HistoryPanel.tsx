import { useEffect, useState } from 'react'
import type { Editor } from 'tldraw'
import { CanvasVersionSummary, listCanvasVersions, restoreCanvasVersion } from '../canvas-history'

interface HistoryPanelViewProps {
	error: string | null
	isLoading: boolean
	onRefresh(): void
	onRestore(id: string): void
	restoringId: string | null
	status: string | null
	versions: CanvasVersionSummary[]
}

export function formatCanvasVersionTime(value: string): string {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toISOString().slice(0, 16).replace('T', ' ')
}

export function HistoryPanelView({
	error,
	isLoading,
	onRefresh,
	onRestore,
	restoringId,
	status,
	versions,
}: HistoryPanelViewProps) {
	return (
		<section className="canvas-history-panel">
			<header>
				<div>
					<strong>Canvas History</strong>
					<span>{versions.length} version{versions.length === 1 ? '' : 's'}</span>
				</div>
				<button type="button" onClick={onRefresh} disabled={isLoading}>
					{isLoading ? 'Loading…' : 'Refresh'}
				</button>
			</header>

			{status ? <p className="canvas-history-status">{status}</p> : null}
			{error ? <p className="canvas-history-error">{error}</p> : null}

			{versions.length === 0 ? (
				<p className="canvas-history-empty">No saved versions yet</p>
			) : (
				<ol className="canvas-history-list">
					{versions.map((version) => {
						const isRestoring = restoringId === version.id
						return (
							<li key={version.id}>
								<div>
									<time dateTime={version.createdAt}>{formatCanvasVersionTime(version.createdAt)}</time>
									<code>{version.id}</code>
								</div>
								<button type="button" onClick={() => onRestore(version.id)} disabled={Boolean(restoringId)}>
									{isRestoring ? 'Restoring…' : 'Restore'}
								</button>
							</li>
						)
					})}
				</ol>
			)}
		</section>
	)
}

export function HistoryPanel({ editor }: { editor: Editor }) {
	const [versions, setVersions] = useState<CanvasVersionSummary[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [restoringId, setRestoringId] = useState<string | null>(null)
	const [status, setStatus] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	async function refresh() {
		setIsLoading(true)
		setError(null)
		try {
			const nextVersions = await listCanvasVersions()
			setVersions(nextVersions)
			setStatus(nextVersions.length === 0 ? 'No restorable snapshots yet' : `Loaded ${nextVersions.length} versions`)
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : 'Canvas versions could not be loaded')
		} finally {
			setIsLoading(false)
		}
	}

	async function restore(id: string) {
		setRestoringId(id)
		setError(null)
		try {
			const document = await restoreCanvasVersion(id)
			if (!document) throw new Error('Canvas version did not include a document')
			editor.loadSnapshot(document)
			setStatus('Canvas version restored')
			await refresh()
		} catch (restoreError) {
			setError(restoreError instanceof Error ? restoreError.message : 'Canvas version could not be restored')
		} finally {
			setRestoringId(null)
		}
	}

	useEffect(() => {
		void refresh()
	}, [])

	return (
		<HistoryPanelView
			error={error}
			isLoading={isLoading}
			onRefresh={() => void refresh()}
			onRestore={(id) => void restore(id)}
			restoringId={restoringId}
			status={status}
			versions={versions}
		/>
	)
}
