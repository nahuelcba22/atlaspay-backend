import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSslOptions } from '../src/config/dbSsl';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildSslOptions', () => {
  it.each([undefined, '', '  ', 'true', 'TRUE'])(
    'verifies the certificate by default (%j)',
    (value) => {
      expect(buildSslOptions(value)).toEqual({
        require: true,
        rejectUnauthorized: true,
      });
    },
  );

  it('disables verification only with an explicit false, and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(buildSslOptions('false')).toEqual({
      require: true,
      rejectUnauthorized: false,
    });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it.each(['0', 'no', 'off', 'falso'])(
    'rejects the ambiguous value %j instead of disabling verification',
    (value) => {
      expect(() => buildSslOptions(value)).toThrow('DB_SSL_REJECT_UNAUTHORIZED');
    },
  );
});