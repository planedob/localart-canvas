export interface ZipEntry {
	path: string
	data: Buffer | Uint8Array | string
}

const CRC32_TABLE = new Uint32Array(256).map((_value, index) => {
	let crc = index
	for (let bit = 0; bit < 8; bit += 1) {
		crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
	}
	return crc >>> 0
})

function crc32(data: Buffer): number {
	let crc = 0xffffffff
	for (const byte of data) {
		crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
	}
	return (crc ^ 0xffffffff) >>> 0
}

function toBuffer(data: ZipEntry['data']): Buffer {
	return typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data)
}

function sanitizeEntryPath(entryPath: string): string {
	const normalized = entryPath.replaceAll('\\', '/')
	const parts = normalized.split('/')
	if (
		!normalized ||
		normalized.startsWith('/') ||
		parts.some((part) => part === '..' || part === '')
	) {
		throw new Error(`Unsafe ZIP entry path: ${entryPath}`)
	}
	return normalized
}

function writeDosTimestamp(header: Buffer, offset: number): void {
	header.writeUInt16LE(0, offset)
	header.writeUInt16LE(0x0021, offset + 2)
}

export function createStoredZipArchive(entries: ZipEntry[]): Buffer {
	const localFileRecords: Buffer[] = []
	const centralDirectoryRecords: Buffer[] = []
	let offset = 0

	for (const entry of entries
		.map((item) => ({ ...item, path: sanitizeEntryPath(item.path) }))
		.sort((left, right) => left.path.localeCompare(right.path))) {
		const name = Buffer.from(entry.path, 'utf8')
		const data = toBuffer(entry.data)
		const checksum = crc32(data)

		const localHeader = Buffer.alloc(30 + name.length)
		localHeader.writeUInt32LE(0x04034b50, 0)
		localHeader.writeUInt16LE(20, 4)
		localHeader.writeUInt16LE(0x0800, 6)
		localHeader.writeUInt16LE(0, 8)
		writeDosTimestamp(localHeader, 10)
		localHeader.writeUInt32LE(checksum, 14)
		localHeader.writeUInt32LE(data.length, 18)
		localHeader.writeUInt32LE(data.length, 22)
		localHeader.writeUInt16LE(name.length, 26)
		localHeader.writeUInt16LE(0, 28)
		name.copy(localHeader, 30)

		const centralHeader = Buffer.alloc(46 + name.length)
		centralHeader.writeUInt32LE(0x02014b50, 0)
		centralHeader.writeUInt16LE(20, 4)
		centralHeader.writeUInt16LE(20, 6)
		centralHeader.writeUInt16LE(0x0800, 8)
		centralHeader.writeUInt16LE(0, 10)
		writeDosTimestamp(centralHeader, 12)
		centralHeader.writeUInt32LE(checksum, 16)
		centralHeader.writeUInt32LE(data.length, 20)
		centralHeader.writeUInt32LE(data.length, 24)
		centralHeader.writeUInt16LE(name.length, 28)
		centralHeader.writeUInt16LE(0, 30)
		centralHeader.writeUInt16LE(0, 32)
		centralHeader.writeUInt16LE(0, 34)
		centralHeader.writeUInt16LE(0, 36)
		centralHeader.writeUInt32LE(0, 38)
		centralHeader.writeUInt32LE(offset, 42)
		name.copy(centralHeader, 46)

		localFileRecords.push(localHeader, data)
		centralDirectoryRecords.push(centralHeader)
		offset += localHeader.length + data.length
	}

	const centralDirectory = Buffer.concat(centralDirectoryRecords)
	const endOfCentralDirectory = Buffer.alloc(22)
	endOfCentralDirectory.writeUInt32LE(0x06054b50, 0)
	endOfCentralDirectory.writeUInt16LE(0, 4)
	endOfCentralDirectory.writeUInt16LE(0, 6)
	endOfCentralDirectory.writeUInt16LE(entries.length, 8)
	endOfCentralDirectory.writeUInt16LE(entries.length, 10)
	endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12)
	endOfCentralDirectory.writeUInt32LE(offset, 16)
	endOfCentralDirectory.writeUInt16LE(0, 20)

	return Buffer.concat([...localFileRecords, centralDirectory, endOfCentralDirectory])
}
