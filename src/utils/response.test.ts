import { describe, expect, it } from 'bun:test';
import { response } from './response';

describe('response', () => {
  it('success wraps data with a default message', () => {
    expect(response.success({ id: 1 })).toEqual({
      success: true,
      message: 'Success',
      data: { id: 1 },
    });
  });

  it('created wraps data with a custom message', () => {
    expect(response.created({ id: 1 }, 'Created!')).toEqual({
      success: true,
      message: 'Created!',
      data: { id: 1 },
    });
  });

  it('error returns a failure envelope', () => {
    expect(response.error(null, 'Something broke')).toEqual({
      success: false,
      message: 'Something broke',
      data: null,
    });
  });
});
