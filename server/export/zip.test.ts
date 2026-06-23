import { describe, expect, it } from 'vitest'
import { createStoredZipArchive } from './zip'

function findAscii(buffer: Buffer, text: string): boolean {
	return buffer.indexOf(Buffer.from(text, 'utf8')) !== -1
}

describe('createStoredZipArchive', () => {
	it('creates a deterministic ZIP containing every named entry', () => {
		const archive = createStoredZipArchive([
			{ path: 'assets/example.txt', data: 'asset body' },
			{ path: 'document.json', data: '{"store":{}}' },
		])

		expect(archive.subarray(0, 4).toString('hex')).toBe('504b0304')
		expect(findAscii(archive, 'document.json')).toBe(true)
		expect(findAscii(archive, 'assets/example.txt')).toBe(true)
		expect(findAscii(archive, 'asset body')).toBe(true)
		expect(archive.subarray(-22, -18).toString('hex')).toBe('504b0506')
	})

	it('rejects unsafe entry paths', () => {
		expect(() =>
			createStoredZipArchive([{ path: '../document.json', data: '{}' }])
		).toThrow('Unsafe ZIP entry path')
	})
})
