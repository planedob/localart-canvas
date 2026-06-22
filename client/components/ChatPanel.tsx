import { FormEvent, useState } from 'react'
import { createShapeId, useValue } from 'tldraw'
import { requestLocalChat } from '../local-api'
import { summarizeSelectedShapes } from '../revision-context'
import { useAgent } from '../agent/TldrawAgentAppProvider'
import {
	AI_IMAGE_HOLDER_DEFAULT_PROPS,
	AI_IMAGE_HOLDER_TYPE,
	AIImageHolderShape,
} from '../shapes/AIImageHolderShape'

interface ChatEntry {
	role: 'user' | 'assistant' | 'error'
	text: string
	model?: string
}

export function ChatPanel() {
	const { editor } = useAgent()
	const selectedShapes = useValue('local-chat-selection', () => editor.getSelectedShapes(), [
		editor,
	])
	const [input, setInput] = useState('')
	const [entries, setEntries] = useState<ChatEntry[]>([])
	const [isSending, setIsSending] = useState(false)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const message = input.trim()
		if (!message || isSending) return

		setInput('')
		setIsSending(true)
		setEntries((current) => [...current, { role: 'user', text: message }])

		try {
			const response = await requestLocalChat({
				message,
				selectedShapes: summarizeSelectedShapes(selectedShapes),
			})
			setEntries((current) => [
				...current,
				{ role: 'assistant', text: response.message, model: response.model },
			])
		} catch (error) {
			setEntries((current) => [
				...current,
				{
					role: 'error',
					text: error instanceof Error ? error.message : 'Local model request failed',
				},
			])
		} finally {
			setIsSending(false)
		}
	}

	function addPlaceholder() {
		const viewport = editor.getViewportPageBounds()
		const id = createShapeId()
		editor.createShape<AIImageHolderShape>({
			id,
			type: AI_IMAGE_HOLDER_TYPE,
			x: viewport.center.x - AI_IMAGE_HOLDER_DEFAULT_PROPS.w / 2,
			y: viewport.center.y - AI_IMAGE_HOLDER_DEFAULT_PROPS.h / 2,
			props: {
				...AI_IMAGE_HOLDER_DEFAULT_PROPS,
				prompt: 'Placeholder revision',
			},
		})
		editor.select(id)
	}

	return (
		<aside className="chat-panel local-chat-panel tl-theme__dark">
			<header className="local-chat-header">
				<div>
					<strong>LocalArt Agent</strong>
					<span>Ollama · local</span>
				</div>
				<div className="local-chat-header-actions">
					<button type="button" onClick={addPlaceholder}>
						Add AI placeholder
					</button>
					<button type="button" onClick={() => setEntries([])} aria-label="Clear conversation">
						Clear
					</button>
				</div>
			</header>

			<div className="local-chat-history" aria-live="polite">
				{entries.length === 0 ? (
					<p className="local-chat-empty">
						Select canvas shapes, then describe the revision you want.
					</p>
				) : (
					entries.map((entry, index) => (
						<div className={`local-chat-entry ${entry.role}`} key={`${entry.role}-${index}`}>
							<span>{entry.role === 'user' ? 'You' : entry.role === 'error' ? 'Error' : 'Agent'}</span>
							<p>{entry.text}</p>
							{entry.model && <small>{entry.model}</small>}
						</div>
					))
				)}
			</div>

			<form className="local-chat-form" onSubmit={handleSubmit}>
				<div className="local-chat-context">
					{selectedShapes.length} selected shape{selectedShapes.length === 1 ? '' : 's'}
				</div>
				<textarea
					aria-label="Revision request"
					placeholder="Describe the revision"
					value={input}
					onChange={(event) => setInput(event.currentTarget.value)}
				/>
				<button disabled={!input.trim() || isSending}>
					{isSending ? 'Thinking…' : 'Send to Ollama'}
				</button>
			</form>
		</aside>
	)
}
