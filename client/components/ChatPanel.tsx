import { FormEvent, useState } from 'react'
import { createShapeId, Editor, FileHelpers, useValue } from 'tldraw'
import { requestGeneration, requestLocalChat } from '../local-api'
import { getRevisionPlacement, summarizeSelectedShapes } from '../revision-context'
import {
	AI_IMAGE_HOLDER_DEFAULT_PROPS,
	AI_IMAGE_HOLDER_TYPE,
	AIImageHolderShape,
} from '../shapes/AIImageHolderShape'

interface ChatEntry {
	role: 'user' | 'assistant' | 'error'
	text: string
	model?: string
	slot?: 'primary' | 'backup'
	preset?: 'ollama' | 'aibuff' | 'openai' | 'custom'
	fallbackReason?: string
}

const PRESET_LABELS = { ollama: 'Ollama', aibuff: 'AIBuff', openai: 'OpenAI', custom: 'Custom' } as const

export function ChatEntryView({ entry }: { entry: ChatEntry }) {
	const route = entry.model && entry.slot && entry.preset
		? `${entry.slot === 'primary' ? 'Primary' : 'Backup'} · ${PRESET_LABELS[entry.preset]} · ${entry.model}`
		: entry.model
	return <div className={`local-chat-entry ${entry.role}`}>
		<span>{entry.role === 'user' ? 'You' : entry.role === 'error' ? 'Error' : 'Agent'}</span>
		<p>{entry.text}</p>
		{route ? <small>{route}</small> : null}
		{entry.fallbackReason ? <small className="local-chat-fallback">Fallback: {entry.fallbackReason}</small> : null}
	</div>
}

export function ChatSubmitLabel({ isSending }: { isSending: boolean }) {
	return <>{isSending ? 'Thinking…' : 'Send to model'}</>
}

export function ChatPanel({ editor }: { editor: Editor }) {
	const selectedShapes = useValue('local-chat-selection', () => editor.getSelectedShapes(), [
		editor,
	])
	const [input, setInput] = useState('')
	const [entries, setEntries] = useState<ChatEntry[]>([])
	const [isSending, setIsSending] = useState(false)
	const [isGenerating, setIsGenerating] = useState(false)
	const [revisionPrompt, setRevisionPrompt] = useState('')

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const message = input.trim()
		if (!message || isSending) return

		setInput('')
		setIsSending(true)
		setEntries((current) => [...current, { role: 'user', text: message }])

		try {
			const screenshotDataUrl =
				selectedShapes.length > 0
					? await editor
							.toImage(selectedShapes, {
								format: 'jpeg',
								background: true,
								padding: 16,
								pixelRatio: 1,
							})
							.then((result) => FileHelpers.blobToDataUrl(result.blob))
					: undefined
			const response = await requestLocalChat({
				message,
				selectedShapes: summarizeSelectedShapes(selectedShapes),
				...(screenshotDataUrl ? { screenshotDataUrl } : {}),
			})
			setRevisionPrompt(response.message)
			setEntries((current) => [
				...current,
				{
					role: 'assistant',
					text: response.message,
					model: response.model,
					slot: response.slot,
					preset: response.preset,
					fallbackReason: response.fallback?.reason,
				},
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

	async function generateRevision() {
		if (!revisionPrompt || isGenerating) return
		setIsGenerating(true)
		try {
			const generation = await requestGeneration(revisionPrompt)
			const sourceBounds = editor.getSelectionPageBounds()
			const placement = getRevisionPlacement(
				sourceBounds,
				AI_IMAGE_HOLDER_DEFAULT_PROPS,
				editor.getViewportPageBounds()
			)
			const id = createShapeId()
			editor.createShape<AIImageHolderShape>({
				id,
				type: AI_IMAGE_HOLDER_TYPE,
				x: placement.x,
				y: placement.y,
				props: {
					...AI_IMAGE_HOLDER_DEFAULT_PROPS,
					assetUrl: generation.url,
					prompt: revisionPrompt,
				},
			})
			editor.select(id)
		} catch (error) {
			setEntries((current) => [
				...current,
				{
					role: 'error',
					text: error instanceof Error ? error.message : 'Image generation failed',
				},
			])
		} finally {
			setIsGenerating(false)
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
					<span>Primary → Backup</span>
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
					entries.map((entry, index) => <ChatEntryView entry={entry} key={`${entry.role}-${index}`} />)
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
					<ChatSubmitLabel isSending={isSending} />
				</button>
				<button
					className="local-generate-button"
					disabled={!revisionPrompt || isGenerating}
					onClick={generateRevision}
					type="button"
				>
					{isGenerating ? 'Generating…' : 'Generate revision'}
				</button>
			</form>
		</aside>
	)
}
