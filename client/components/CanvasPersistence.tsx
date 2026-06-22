import { useEffect } from 'react'
import { useEditor } from 'tldraw'
import { loadCanvasState, startCanvasAutosave } from '../canvas-persistence'

export function CanvasPersistence() {
	const editor = useEditor()

	useEffect(() => {
		let isDisposed = false
		let stopAutosave: (() => void) | undefined

		void loadCanvasState(editor)
			.catch((error) => {
				console.warn(error)
			})
			.finally(() => {
				if (!isDisposed) stopAutosave = startCanvasAutosave(editor)
			})

		return () => {
			isDisposed = true
			stopAutosave?.()
		}
	}, [editor])

	return null
}
