import { describe, expect, it } from 'vitest'
import {
	buildPreflightReport,
	formatReport,
	hasSecretLikePath,
	parseGitStatus,
} from './release-preflight.mjs'

const SIGNOFF_DOC = 'docs/M2-\u9a8c\u6536\u7b7e\u6536-Claude.md'
const MANUAL_CHECKLIST_DOC = 'docs/M2-\u5269\u4f59\u4eba\u5de5\u9a8c\u6536\u6e05\u5355.md'

const baseState = {
	existingFiles: new Set([
		'README.md',
		'PROGRESS.md',
		SIGNOFF_DOC,
		MANUAL_CHECKLIST_DOC,
		'docs/release/README.md',
		'docs/release/P0-checklist.md',
		'docs/release/github-release-draft.md',
		'docs/release/manual-qa.md',
		'docs/release/rollback.md',
	]),
	tags: ['m0-done', 'm1-done', 'm2s1-done', 'm2-done'],
	trackedFiles: [
		'README.md',
		'PROGRESS.md',
		SIGNOFF_DOC,
	],
	statusEntries: [],
}

function report(overrides = {}) {
	return buildPreflightReport({ ...baseState, ...overrides })
}

describe('release preflight checks', () => {
	it('passes when required release docs and tags are present', () => {
		const result = report()
		expect(result.failures).toEqual([])
		expect(result.checks.some((check) => check.message.includes('m2-done'))).toBe(true)
	})

	it('fails when a required release document is missing', () => {
		const existingFiles = new Set(baseState.existingFiles)
		existingFiles.delete('docs/release/manual-qa.md')

		const result = report({ existingFiles })

		expect(result.failures).toContain('Missing required file: docs/release/manual-qa.md')
	})

	it('fails when m2-done tag is missing', () => {
		const result = report({ tags: ['m0-done', 'm1-done', 'm2s1-done'] })

		expect(result.failures).toContain('Missing required tag: m2-done')
	})

	it('fails when local-only or secret-looking files are tracked', () => {
		const result = report({
			trackedFiles: [
				'README.md',
				'.localart/model-secrets.json',
				'canvas/document.json',
				'config/prod-api-key.txt',
			],
		})

		expect(result.failures).toContain('Tracked local-only path: .localart/model-secrets.json')
		expect(result.failures).toContain('Tracked local-only path: canvas/document.json')
		expect(result.failures).toContain('Tracked secret-like path: config/prod-api-key.txt')
	})

	it('warns about untracked .DS_Store files without failing', () => {
		const result = report({
			statusEntries: [
				{ code: '??', path: '.DS_Store' },
				{ code: '??', path: 'docs/.DS_Store' },
			],
		})

		expect(result.failures).toEqual([])
		expect(result.warnings).toContain('Untracked macOS metadata file: .DS_Store')
		expect(result.warnings).toContain('Untracked macOS metadata file: docs/.DS_Store')
	})

	it('detects secret-like paths conservatively', () => {
		expect(hasSecretLikePath('config/model-secrets.json')).toBe(true)
		expect(hasSecretLikePath('notes/API_KEY.txt')).toBe(true)
		expect(hasSecretLikePath('docs/release/manual-qa.md')).toBe(false)
	})

	it('parses git short status without dropping the first filename character', () => {
		expect(parseGitStatus(' M PROGRESS.md\nM  README.md\n?? docs/release/README.md')).toEqual([
			{ code: ' M', path: 'PROGRESS.md' },
			{ code: 'M ', path: 'README.md' },
			{ code: '??', path: 'docs/release/README.md' },
		])
	})

	it('formats failures, warnings, and checks for terminal output', () => {
		const result = report({
			statusEntries: [{ code: '??', path: '.DS_Store' }],
			tags: ['m0-done'],
		})

		const output = formatReport(result)

		expect(output).toContain('Release preflight')
		expect(output).toContain('FAILURES')
		expect(output).toContain('WARNINGS')
		expect(output).toContain('Missing required tag: m2-done')
		expect(output).toContain('Untracked macOS metadata file: .DS_Store')
	})
})
