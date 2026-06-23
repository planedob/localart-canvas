import { describe, expect, test } from 'vitest'
import { getAgentShortcutAction, isEditableShortcutTarget } from './agent-shortcuts'

describe('agent shortcuts', () => {
	test('matches png export shortcut on meta or control shift p', () => {
		expect(getAgentShortcutAction({ key: 'p', shiftKey: true, metaKey: true, ctrlKey: false, target: null })).toBe('exportPng')
		expect(getAgentShortcutAction({ key: 'P', shiftKey: true, metaKey: false, ctrlKey: true, target: null })).toBe('exportPng')
	})

	test('matches generate revision shortcut on meta or control shift g', () => {
		expect(getAgentShortcutAction({ key: 'g', shiftKey: true, metaKey: true, ctrlKey: false, target: null })).toBe('generateRevision')
		expect(getAgentShortcutAction({ key: 'G', shiftKey: true, metaKey: false, ctrlKey: true, target: null })).toBe('generateRevision')
	})

	test('ignores shortcuts without platform modifier or shift', () => {
		expect(getAgentShortcutAction({ key: 'p', shiftKey: false, metaKey: true, ctrlKey: false, target: null })).toBe(null)
		expect(getAgentShortcutAction({ key: 'g', shiftKey: true, metaKey: false, ctrlKey: false, target: null })).toBe(null)
	})

	test('detects editable shortcut targets', () => {
		expect(isEditableShortcutTarget({ tagName: 'TEXTAREA' })).toBe(true)
		expect(isEditableShortcutTarget({ tagName: 'INPUT' })).toBe(true)
		expect(isEditableShortcutTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
		expect(isEditableShortcutTarget({ tagName: 'BUTTON' })).toBe(false)
	})

	test('skips shortcuts from editable targets', () => {
		expect(getAgentShortcutAction({
			key: 'p',
			shiftKey: true,
			metaKey: true,
			ctrlKey: false,
			target: { tagName: 'TEXTAREA' },
		})).toBe(null)
	})
})
