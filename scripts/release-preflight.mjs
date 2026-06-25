#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const REQUIRED_FILES = [
	'README.md',
	'PROGRESS.md',
	'docs/M2-\u9a8c\u6536\u7b7e\u6536-Claude.md',
	'docs/M2-\u5269\u4f59\u4eba\u5de5\u9a8c\u6536\u6e05\u5355.md',
	'docs/release/README.md',
	'docs/release/P0-checklist.md',
	'docs/release/github-release-draft.md',
	'docs/release/manual-qa.md',
	'docs/release/rollback.md',
]

export const REQUIRED_TAGS = ['m0-done', 'm1-done', 'm2s1-done', 'm2-done']

const LOCAL_ONLY_PREFIXES = [
	'.localart/',
	'canvas/',
	'out/',
	'.desktop/',
	'dist/',
	'node_modules/',
]

const SECRET_PATH_PATTERN = /(^|[/._-])(secret|secrets|token|tokens|api[-_]?key|apikey|credential|credentials|private[-_]?key)([/._-]|$)/i
const SCAN_SKIP_DIRS = new Set([
	'.git',
	'node_modules',
	'out',
	'dist',
	'.desktop',
	'canvas',
	'.localart',
	'.vite',
])

export function hasSecretLikePath(filePath) {
	return SECRET_PATH_PATTERN.test(filePath)
}

export function parseGitStatus(output) {
	return output
		.split('\n')
		.map((line) => line.trimEnd())
		.filter(Boolean)
		.map((line) => ({
			code: line.slice(0, 2),
			path: line.slice(2).trimStart(),
		}))
}

function isLocalOnlyPath(filePath) {
	return LOCAL_ONLY_PREFIXES.some((prefix) => filePath === prefix.slice(0, -1) || filePath.startsWith(prefix))
}

function checkRequiredFiles(existingFiles) {
	return REQUIRED_FILES.map((filePath) => {
		const ok = existingFiles.has(filePath)
		return {
			ok,
			message: ok ? `Found required file: ${filePath}` : `Missing required file: ${filePath}`,
			level: ok ? 'pass' : 'failure',
		}
	})
}

function checkRequiredTags(tags) {
	return REQUIRED_TAGS.map((tag) => {
		const ok = tags.includes(tag)
		return {
			ok,
			message: ok ? `Found required tag: ${tag}` : `Missing required tag: ${tag}`,
			level: ok ? 'pass' : 'failure',
		}
	})
}

function checkTrackedFiles(trackedFiles) {
	const checks = []
	for (const filePath of trackedFiles) {
		if (isLocalOnlyPath(filePath)) {
			checks.push({
				ok: false,
				message: `Tracked local-only path: ${filePath}`,
				level: 'failure',
			})
		} else if (hasSecretLikePath(filePath)) {
			checks.push({
				ok: false,
				message: `Tracked secret-like path: ${filePath}`,
				level: 'failure',
			})
		}
	}
	if (checks.length === 0) {
		checks.push({
			ok: true,
			message: 'No tracked local-only or secret-like paths found',
			level: 'pass',
		})
	}
	return checks
}

function checkStatusEntries(statusEntries) {
	const checks = []
	for (const entry of statusEntries) {
		if (entry.path.endsWith('.DS_Store')) {
			checks.push({
				ok: true,
				message: `Untracked macOS metadata file: ${entry.path}`,
				level: 'warning',
			})
		} else if (entry.code === '??' && hasSecretLikePath(entry.path)) {
			checks.push({
				ok: false,
				message: `Untracked secret-like path present locally: ${entry.path}`,
				level: 'failure',
			})
		} else if (entry.code !== '??') {
			checks.push({
				ok: true,
				message: `Tracked working tree change present: ${entry.code} ${entry.path}`,
				level: 'warning',
			})
		}
	}
	return checks
}

export function buildPreflightReport(state) {
	const checks = [
		...checkRequiredFiles(state.existingFiles),
		...checkRequiredTags(state.tags),
		...checkTrackedFiles(state.trackedFiles),
		...checkStatusEntries(state.statusEntries),
	]
	const failures = checks.filter((check) => check.level === 'failure').map((check) => check.message)
	const warnings = checks.filter((check) => check.level === 'warning').map((check) => check.message)
	return { checks, failures, warnings }
}

function runGit(args, cwd) {
	return execFileSync('git', args, {
		cwd,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		timeout: 10_000,
	}).trim()
}

function readLooseTags(cwd) {
	const tagsDir = path.join(cwd, '.git', 'refs', 'tags')
	if (!existsSync(tagsDir)) return []
	return readdirSync(tagsDir, { withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
}

function readPackedTags(cwd) {
	const packedRefsPath = path.join(cwd, '.git', 'packed-refs')
	if (!existsSync(packedRefsPath)) return []
	return readFileSync(packedRefsPath, 'utf8')
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith('#') && !line.startsWith('^'))
		.map((line) => line.split(' ')[1])
		.filter((ref) => ref?.startsWith('refs/tags/'))
		.map((ref) => ref.replace('refs/tags/', ''))
}

function readTags(cwd) {
	return [...new Set([...readLooseTags(cwd), ...readPackedTags(cwd)])].sort()
}

function scanLocalStatusEntries(cwd, trackedFiles) {
	const tracked = new Set(trackedFiles)
	const entries = []

	function visit(relativeDir) {
		const absoluteDir = path.join(cwd, relativeDir)
		for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
			const relativePath = path.posix.join(relativeDir.split(path.sep).join(path.posix.sep), entry.name)
			if (entry.isDirectory()) {
				if (!SCAN_SKIP_DIRS.has(entry.name)) visit(relativePath)
				continue
			}
			if (!entry.isFile()) continue
			if (tracked.has(relativePath)) continue
			if (entry.name === '.DS_Store' || hasSecretLikePath(relativePath)) {
				entries.push({ code: '??', path: relativePath })
			}
		}
	}

	visit('')
	return entries
}

function readRepoState(cwd) {
	const trackedFiles = runGit(['ls-files'], cwd).split('\n').filter(Boolean)
	const tags = readTags(cwd)
	const statusEntries = scanLocalStatusEntries(cwd, trackedFiles)
	const existingFiles = new Set(REQUIRED_FILES.filter((filePath) => existsSync(path.join(cwd, filePath))))
	return { existingFiles, tags, trackedFiles, statusEntries }
}

export function formatReport(report) {
	const lines = ['Release preflight', '']
	const passingCount = report.checks.filter((check) => check.level === 'pass').length
	lines.push(`PASSING CHECKS: ${passingCount}`)
	for (const check of report.checks.filter((item) => item.level === 'pass')) {
		lines.push(`  OK ${check.message}`)
	}
	if (report.warnings.length > 0) {
		lines.push('', `WARNINGS: ${report.warnings.length}`)
		for (const warning of report.warnings) {
			lines.push(`  ! ${warning}`)
		}
	}
	if (report.failures.length > 0) {
		lines.push('', `FAILURES: ${report.failures.length}`)
		for (const failure of report.failures) {
			lines.push(`  FAIL ${failure}`)
		}
	}
	if (report.failures.length === 0) {
		lines.push('', 'Result: release preflight passed with no blocking failures.')
	} else {
		lines.push('', 'Result: release preflight failed. Fix failures before preparing a public release.')
	}
	return lines.join('\n')
}

function printHelp() {
	console.log(`Release preflight

Usage:
  node scripts/release-preflight.mjs [--help]

Runs read-only local checks for post-M2 release preparation. It does not publish,
sign, notarize, change repository settings, or read secret file contents.`)
}

function main() {
	if (process.argv.includes('--help') || process.argv.includes('-h')) {
		printHelp()
		return
	}
	const cwd = process.cwd()
	const report = buildPreflightReport(readRepoState(cwd))
	console.log(formatReport(report))
	process.exitCode = report.failures.length > 0 ? 1 : 0
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
	main()
}
