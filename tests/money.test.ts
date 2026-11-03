import { describe, it, expect } from 'vitest';
import { AppError } from '../src/utils/appError';
import {
  centsFromDecimal,
  convertCents,
  decimalFromCents,
  toPositiveCents,
} from '../src/utils/money';

describe('AppError', () => {
  it('defaults to status 400', () => {
    const error = new AppError('boom');
    expect(error.status).toBe(400);
    expect(error.message).toBe('boom');
  });

  it('keeps a custom status and remains an Error instance', () => {
    const error = new AppError('not found', 404);
    expect(error.status).toBe(404);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('toPositiveCents', () => {
  it.each([
    [10, 1000],
    [0.07, 7],
    [19.99, 1999],
    [0.01, 1],
  ])('converts %s to %s cents', (input, expected) => {
    expect(toPositiveCents(input)).toBe(expected);
  });

  it.each([0, -1, -0.01, NaN, Infinity, -Infinity])(
    'rejects invalid amount %s',
    (input) => {
      expect(() => toPositiveCents(input)).toThrow(AppError);
    },
  );

  it('rejects more than 2 decimal places', () => {
    expect(() => toPositiveCents(1.005)).toThrow('2 decimales');
  });

  it('rejects amounts beyond DECIMAL(15,2)', () => {
    expect(() => toPositiveCents(1e13)).toThrow(AppError);
  });

  it('rejects non-number input at runtime', () => {
    expect(() => toPositiveCents('10' as unknown as number)).toThrow(AppError);
  });
});

describe('centsFromDecimal', () => {
  it.each([
    ['100.50', 10050],
    ['100', 10000],
    ['0.05', 5],
    ['-5.50', -550],
    ['-0.00', 0],
    [12.5, 1250],
  ])('converts %s to %s cents', (input, expected) => {
    expect(centsFromDecimal(input)).toBe(expected);
  });

  it.each(['abc', '', '1.234', '1e5', '--1'])('rejects %s', (input) => {
    expect(() => centsFromDecimal(input)).toThrow(AppError);
  });
});

describe('decimalFromCents', () => {
  it.each([
    [1050, '10.50'],
    [5, '0.05'],
    [0, '0.00'],
    [-550, '-5.50'],
  ])('serializes %s cents as %s', (input, expected) => {
    expect(decimalFromCents(input)).toBe(expected);
  });

  it('rejects non-integer cents', () => {
    expect(() => decimalFromCents(1.5)).toThrow(AppError);
  });

  it('round-trips with centsFromDecimal', () => {
    for (const value of ['0.00', '0.01', '99.99', '1234567.89']) {
      expect(decimalFromCents(centsFromDecimal(value))).toBe(value);
    }
  });
});

describe('convertCents', () => {
  it('applies the rate and rounds to the nearest cent', () => {
    expect(convertCents(1000, 1.5)).toBe(1500);
    expect(convertCents(333, 0.1)).toBe(33);
  });

  it.each([0, -1, NaN, Infinity])('rejects invalid rate %s', (rate) => {
    expect(() => convertCents(1000, rate)).toThrow(AppError);
  });
});