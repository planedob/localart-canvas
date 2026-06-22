import { describe, expect, test } from 'vitest'
import { classifyHttpError, ProviderError, toProviderError } from './ProviderError'

describe('ProviderError', () => {
	test.each([
		[429, 'rate_limit', true],
		[500, 'server', true],
		[503, 'server', true],
		[401, 'auth', false],
		[404, 'model_not_found', false],
		[400, 'invalid_request', false],
	] as const)('classifies HTTP %s as %s', (status, kind, retryable) => {
		const error = classifyHttpError(status, { error: { message: 'provider detail' } })
		expect(error).toBeInstanceOf(ProviderError)
		expect(error).toMatchObject({ kind, retryable, status })
	})

	test('turns fetch failures and aborts into safe retryable errors', () => {
		expect(toProviderError(new TypeError('fetch failed'))).toMatchObject({
			kind: 'network',
			retryable: true,
		})
		expect(toProviderError(new DOMException('timed out', 'TimeoutError'))).toMatchObject({
			kind: 'timeout',
			retryable: true,
		})
	})
})
