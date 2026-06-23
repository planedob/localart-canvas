import { FormEvent, useEffect, useState } from 'react'
import { createShapeId, Editor, FileHelpers, useValue } from 'tldraw'
import { getAgentShortcutAction } from '../agent-shortcuts'
import { getCanvasExportFilename, getCanvasExportUrl } from '../export-api'
import { requestGeneration, requestLocalChat } from '../local-api'
import { downloadCanvasPng } from '../png-export'
import { summarizeSelectedShapes } from '../revision-context'
import { insertGeneratedRevisionShape } from '../revision-shape'
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

export function CanvasExportLinks() {
	return <>
		<a download={getCanvasExportFilename('json')} href={getCanvasExportUrl('json')}>
			Export JSON
		</a>
		<a download={getCanvasExportFilename('zip')} href={getCanvasExportUrl('zip')}>
			Export ZIP
		</a>
	</>
}

export function CanvasExportActions({ onExportPng }: { onExportPng: () => void }) {
	return <>
		<CanvasExportLinks />
		<button type="button" onClick={onExportPng}>
			<span>Export PNG</span>
			<small>⌘/Ctrl+Shift+P</small>
		</button>
	</>
}

export function AgentActionButtons({
	canGenerateRevision,
	isGenerating = false,
	onAddPlaceholder,
	onClearConversation,
	onExportPng,
	onGenerateRevision,
}: {
	canGenerateRevision: boolean
	isGenerating?: boolean
	onAddPlaceholder: () => void
	onClearConversation?: () => void
	onExportPng: () => void
	onGenerateRevision: () => void
}) {
	return <>
		<CanvasExportActions onExportPng={onExportPng} />
		<button type="button" onClick={onAddPlaceholder}>
			Add AI placeholder
		</button>
		<button
			className="local-generate-button"
			disabled={!canGenerateRevision || isGenerating}
			onClick={onGenerateRevision}
			type="button"
		>
			{isGenerating ? 'Generating…' : 'Generate revision · ⌘/Ctrl+Shift+G'}
		</button>
		{onClearConversation ? (
			<button type="button" onClick={onClearConversation} aria-label="Clear conversation">
				Clear
			</button>
		) : null}
	</>
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
			insertGeneratedRevisionShape(editor, generation, revisionPrompt, createShapeId)
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

	async function exportPng() {
		try {
			await downloadCanvasPng(editor)
		} catch (error) {
			setEntries((current) => [
				...current,
				{
					role: 'error',
					text: error instanceof Error ? error.message : 'PNG export failed',
				},
			])
		}
	}

	useEffect(() => {
		function handleAgentShortcut(event: KeyboardEvent) {
			const action = getAgentShortcutAction(event)
			if (!action) return
			event.preventDefault()
			if (action === 'exportPng') void exportPng()
			if (action === 'generateRevision') void generateRevision()
		}

		document.addEventListener('keydown', handleAgentShortcut)
		return () => document.removeEventListener('keydown', handleAgentShortcut)
	}, [editor, revisionPrompt, isGenerating])

	return (
		<aside className="chat-panel local-chat-panel tl-theme__dark">
			<header className="local-chat-header">
				<div>
					<strong>LocalArt Agent</strong>
					<span>Primary → Backup</span>
				</div>
				<div className="local-chat-header-actions">
					<AgentActionButtons
						canGenerateRevision={Boolean(revisionPrompt)}
						isGenerating={isGenerating}
						onAddPlaceholder={addPlaceholder}
						onClearConversation={() => setEntries([])}
						onExportPng={exportPng}
						onGenerateRevision={() => void generateRevision()}
					/>
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
			</form>
		</aside>
	)
}
