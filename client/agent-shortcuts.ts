export type AgentShortcutAction = 'exportPng' | 'generateRevision'

interface ShortcutLikeEvent {
	ctrlKey: boolean
	key: string
	metaKey: boolean
	shiftKey: boolean
	target: unknown
}

interface EditableLikeTarget {
	isContentEditable?: boolean
	tagName?: string
}

export function isEditableShortcutTarget(target: unknown): boolean {
	if (!target || typeof target !== 'object') return false
	const candidate = target as EditableLikeTarget
	if (candidate.isContentEditable) return true
	const tagName = candidate.tagName?.toLowerCase()
	return tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

export function getAgentShortcutAction(event: ShortcutLikeEvent): AgentShortcutAction | null {
	if (isEditableShortcutTarget(event.target)) return null
	if (!event.shiftKey) return null
	if (!event.metaKey && !event.ctrlKey) return null

	const key = event.key.toLowerCase()
	if (key === 'p') return 'exportPng'
	if (key === 'g') return 'generateRevision'
	return null
}
