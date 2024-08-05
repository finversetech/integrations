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
