import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { CanvasStore } from './CanvasStore'

describe('CanvasStore', () => {
	it('returns null when no canvas document exists', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'localart-store-'))
		const store = new CanvasStore(directory)

		await expect(store.read()).resolves.toBeNull()
	})

	it('writes and reads a canvas document atomically', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'localart-store-'))
		const store = new CanvasStore(directory)
		const document = { store: { 'shape:1': { typeName: 'shape' } }, schema: { version: 1 } }

		await store.write(document)

		await expect(store.read()).resolves.toEqual(document)
		await expect(readFile(path.join(directory, 'document.json'), 'utf8')).resolves.toContain(
			'"shape:1"'
		)
	})

	it('snapshots the previous document when writing a new version', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'localart-store-'))
		const store = new CanvasStore(directory, {
			createVersionId: () => 'version-1',
			now: () => new Date('2026-06-24T01:02:03.004Z'),
		})
		const firstDocument = { store: { first: true } }
		const secondDocument = { store: { second: true } }

		await store.write(firstDocument)
		await store.write(secondDocument)

		const versions = await store.listVersions()
		expect(versions).toEqual([
			{
				id: '2026-06-24T01-02-03-004Z-version-1',
				createdAt: '2026-06-24T01:02:03.004Z',
			},
		])
		await expect(store.readVersion(versions[0].id)).resolves.toEqual(firstDocument)
	})

	it('restores a saved version as the current document', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'localart-store-'))
		const store = new CanvasStore(directory, {
			createVersionId: () => 'version-1',
			now: () => new Date('2026-06-24T01:02:03.004Z'),
		})
		const firstDocument = { store: { first: true } }
		const secondDocument = { store: { second: true } }

		await store.write(firstDocument)
		await store.write(secondDocument)
		const [{ id }] = await store.listVersions()

		await expect(store.restoreVersion(id)).resolves.toEqual(firstDocument)
		await expect(store.read()).resolves.toEqual(firstDocument)
	})

	it('does not create duplicate versions for identical writes', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'localart-store-'))
		const store = new CanvasStore(directory)
		const document = { store: { same: true } }

		await store.write(document)
		await store.write(document)

		await expect(store.listVersions()).resolves.toEqual([])
	})

	it('recovers from corrupt JSON and reports the problem', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'localart-store-'))
		await writeFile(path.join(directory, 'document.json'), '{broken')
		const onWarning = vi.fn()
		const store = new CanvasStore(directory, { onWarning })

		await expect(store.read()).resolves.toBeNull()
		expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('Could not parse'))
	})

	it('rejects asset paths that escape the asset directory', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'localart-store-'))
		const store = new CanvasStore(directory)

		expect(() => store.resolveAssetPath('../secrets.txt')).toThrow('Invalid asset path')
		expect(store.resolveAssetPath('generated.png')).toBe(
			path.join(directory, 'assets', 'generated.png')
		)
	})
})
