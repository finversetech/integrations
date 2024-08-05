const { FinverseSdk, isTokenValid } = require('./finverse');

describe('test isTokenValid()', () => {
  test('should return false when input is non-string or empty string', () => {
    expect(isTokenValid('')).toBe(false);
    expect(isTokenValid(null)).toBe(false);
    expect(isTokenValid(undefined)).toBe(false);
    expect(isTokenValid({})).toBe(false);
    expect(isTokenValid(12345)).toBe(false);
  });

  test('should return false when input is not valid JWT', () => {
    expect(isTokenValid('invalidJwt')).toBe(false);
    expect(isTokenValid('abcdefg.hijklmonp.qrstuv')).toBe(false);
  });

  test('should return false when input is valid JWT past expiry', () => {
    const expiredJwt =
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE3MjI4MzQxMzAsImV4cCI6MTcyMjgzNDEzNiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSJ9.OTDgk3sWWAVfUZMREFH10yruP6ASDoI2ulCyceod7Xc';
    expect(isTokenValid(expiredJwt)).toBe(false);
  });

  test('should return true when input is valid JWT that is before expiry time', () => {
    const expiredJwt =
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE3MjI4MzQxMzAsImV4cCI6MTcyMjgzNDEzNiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSJ9.OTDgk3sWWAVfUZMREFH10yruP6ASDoI2ulCyceod7Xc';
    jest.useFakeTimers().setSystemTime(new Date('2024-08-01'));
    expect(isTokenValid(expiredJwt)).toBe(true);
    jest.useRealTimers();
  });
});

describe('Finverse SDK', () => {
  const sdk = new FinverseSdk('clientId', 'clientSecret');

  beforeEach(() => {
    jest.restoreAllMocks();
    sdk.fetchFinverse = jest.fn();
  });

  test('getPayment', async () => {
    sdk.fetchFinverse.mockResolvedValue('PAYMENT_RESPONSE');

    const resp = await sdk.getPayment('paymentId');
    expect(resp).toBe('PAYMENT_RESPONSE');
    expect(sdk.fetchFinverse).toHaveBeenCalledTimes(1);
    expect(sdk.fetchFinverse).toHaveBeenCalledWith('payments/paymentId');
  });

  test('verifySignature', async () => {
    const validPayload =
      '{"login_identity_id":"01J4GWV95W745T23YJKPNBSK2T","event_type":"AUTHENTICATED","event_time":"2024-08-05T09:10:15.05107677Z","event_id":""}';
    const validSignature =
      'MEYCIQDCIzUGnMBucExKXQHRYR4JAY6jRFueIGbrZ/1BNu77PgIhAOqXe7BWflzykJzRP5dAlqMxrWllTDqnjinRbOuLBK/A';

    const invalidPayload = '{"key":"value"}';
    const invalidSignature = 'abcdefghi';

    expect(sdk.verifySignature(validPayload, validSignature)).toBe(true);
    expect(sdk.verifySignature(validPayload, invalidSignature)).toBe(false);
    expect(sdk.verifySignature(invalidPayload, validSignature)).toBe(false);
    expect(sdk.verifySignature(invalidPayload, invalidSignature)).toBe(false);
  });
});