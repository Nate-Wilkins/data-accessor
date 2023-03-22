import { render } from '@testing-library/react/pure';
import { act } from 'react-dom/test-utils';
import React from 'react';
import { useCallbackCache } from './use_callback_cache';

test('when using a callback cache callback', async () => {
  // Given a callback.
  const callback = jest.fn().mockResolvedValue(50);

  // And the callback cache ttl is set.
  const ttl = 1000 * 5;

  // And the callback cache has a callback for invalidation.
  const callbackInvalidate = jest.fn();

  // And the callback cache auto invalidate is disabled.
  const invalidateAutoEnable = false;
  const invalidateAutoTtl = 1000;

  // And a cached callback.
  let callbackCache: null | (() => Promise<unknown>) = null;
  const Component = () => {
    const { callback: lCallback, invalidate: _lInvalidate } = useCallbackCache(
      callback,
      callbackInvalidate,
      {
        ttl,
        invalidate: {
          auto: {
            enable: invalidateAutoEnable,
            ttl: invalidateAutoTtl,
          },
        },
      },
    );

    callbackCache = lCallback;

    return <span>Done</span>;
  };
  const queries = render(<Component />);

  // When using a callback cache callback.
  let result: any;
  await act(async () => {
    if (!callbackCache) {
      throw new Error('Callback not set.');
    }
    result = await callbackCache();
  });

  // Then the callback should have been called.
  await queries.findByText('Done');
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the callback result is correct.
  expect(result).toBe(50);

  // Then the callback for invalidatation was not called.
  expect(callbackInvalidate).toHaveBeenCalledTimes(0);
});

test(`when using a callback cache callback again within it's ttl`, async () => {
  // Given a callback.
  const callback = jest.fn().mockResolvedValue(50);

  // And the callback cache ttl is set.
  const ttl = 1000 * 5;

  // And the callback cache has a callback for invalidation.
  const callbackInvalidate = jest.fn();

  // And the callback cache auto invalidate is disabled.
  const invalidateAutoEnable = false;
  const invalidateAutoTtl = 1000;

  // And a cached callback.
  let callbackCache: null | (() => Promise<unknown>) = null;
  const Component = () => {
    const { callback: lCallback, invalidate: _lInvalidate } = useCallbackCache(
      callback,
      callbackInvalidate,
      {
        ttl,
        invalidate: {
          auto: {
            enable: invalidateAutoEnable,
            ttl: invalidateAutoTtl,
          },
        },
      },
    );

    callbackCache = lCallback;

    return <span>Done</span>;
  };
  const queries = render(<Component />);

  // When using a callback cache callback again within it's ttl.
  let result: any;
  await act(async () => {
    if (!callbackCache) {
      throw new Error('Callback not set.');
    }
    result = await callbackCache();
  });
  await act(async () => {
    if (!callbackCache) {
      throw new Error('Callback not set.');
    }
    result = await callbackCache();
  });

  // Then the callback should have been called.
  await queries.findByText('Done');
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the callback result is correct.
  expect(result).toBe(50);

  // Then the callback for invalidatation was not called.
  expect(callbackInvalidate).toHaveBeenCalledTimes(0);
});

test(`when using a callback cache callback again after it's ttl`, async () => {
  // Given a callback.
  const callback = jest.fn().mockResolvedValue(50);

  // And the callback cache ttl is set.
  const ttl = 1000 * 5;

  // And the callback cache has a callback for invalidation.
  const callbackInvalidate = jest.fn();

  // And the callback cache auto invalidate is disabled.
  const invalidateAutoEnable = false;
  const invalidateAutoTtl = 1000;

  // And a cached callback.
  let callbackCache: null | (() => Promise<unknown>) = null;
  const Component = () => {
    const { callback: lCallback, invalidate: _lInvalidate } = useCallbackCache(
      callback,
      callbackInvalidate,
      {
        ttl,
        invalidate: {
          auto: {
            enable: invalidateAutoEnable,
            ttl: invalidateAutoTtl,
          },
        },
      },
    );

    callbackCache = lCallback;

    return <span>Done</span>;
  };
  const queries = render(<Component />);

  // When using a callback cache callback again after it's ttl.
  let result: any;
  await act(async () => {
    if (!callbackCache) {
      throw new Error('Callback not set.');
    }
    result = await callbackCache();
  });
  act(() => {
    jest.advanceTimersByTime(1000 * 5 + 1);
  });
  await act(async () => {
    if (!callbackCache) {
      throw new Error('Callback not set.');
    }
    result = await callbackCache();
  });

  // Then the callback should have been called.
  await queries.findByText('Done');
  expect(callback).toHaveBeenCalledTimes(2);
  expect(callback).toHaveBeenNthCalledWith(1);
  expect(callback).toHaveBeenNthCalledWith(2);

  // Then the callback result is correct.
  expect(result).toBe(50);

  // Then the callback for invalidatation was called.
  expect(callbackInvalidate).toHaveBeenCalledTimes(1);
});

test(`when using a callback cache callback after it's manually invalidated`, async () => {
  // Given a callback.
  const callback = jest.fn().mockResolvedValue(50);

  // And the callback cache ttl is set.
  const ttl = 1000 * 5;

  // And the callback cache has a callback for invalidation.
  const callbackInvalidate = jest.fn();

  // And the callback cache auto invalidate is disabled.
  const invalidateAutoEnable = false;
  const invalidateAutoTtl = 1000;

  // And a cached callback.
  let callbackCache: null | (() => Promise<unknown>) = null;
  let callbackCacheInvalidate: null | (() => Promise<unknown>) = null;
  const Component = () => {
    const { callback: lCallback, invalidate: lInvalidate } = useCallbackCache(
      callback,
      callbackInvalidate,
      {
        ttl,
        invalidate: {
          auto: {
            enable: invalidateAutoEnable,
            ttl: invalidateAutoTtl,
          },
        },
      },
    );

    callbackCache = lCallback;
    callbackCacheInvalidate = lInvalidate;

    return <span>Done</span>;
  };
  const queries = render(<Component />);

  // When using a callback cache callback after it's manually invalidated.
  let result: any;
  await act(async () => {
    if (!callbackCache) {
      throw new Error('Callback not set.');
    }
    result = await callbackCache();
  });
  await act(async () => {
    if (!callbackCacheInvalidate) {
      throw new Error('Invalidate not set.');
    }
    await callbackCacheInvalidate();
  });
  await act(async () => {
    if (!callbackCache) {
      throw new Error('Callback not set.');
    }
    result = await callbackCache();
  });

  // Then the callback should have been called.
  await queries.findByText('Done');
  expect(callback).toHaveBeenCalledTimes(2);
  expect(callback).toHaveBeenNthCalledWith(1);
  expect(callback).toHaveBeenNthCalledWith(2);

  // Then the callback result is correct.
  expect(result).toBe(50);

  // Then the callback for invalidatation was called.
  expect(callbackInvalidate).toHaveBeenCalledTimes(1);
});

test(`when creating a callback cache with auto invalidate enabled and it's ttl set to zero`, async () => {
  // Given a callback.
  const callback = jest.fn().mockResolvedValue(50);

  // And the callback cache ttl is set.
  const ttl = 1000 * 5;

  // And the callback cache has a callback for invalidation.
  const callbackInvalidate = jest.fn();

  // And the callback cache auto invalidate is enabled with it's ttl set to zero.
  const invalidateAutoEnable = true;
  const invalidateAutoTtl = 0;

  // And a cached callback.
  const Component = () => {
    // When creating a callback cache with auto invalidate enabled and it's ttl set to zero.
    const { callback: _lCallback, invalidate: _lInvalidate } = useCallbackCache(
      callback,
      callbackInvalidate,
      {
        ttl,
        invalidate: {
          auto: {
            enable: invalidateAutoEnable,
            ttl: invalidateAutoTtl,
          },
        },
      },
    );

    return <span>Done</span>;
  };

  // Then a validation error occurs.
  expect(() => {
    render(<Component />);
  }).toThrowError(
    'Provided `configuration.invalidate.auto.ttl` must be greater than zero.',
  );

  // Then the callback should not have been called.
  expect(callback).toHaveBeenCalledTimes(0);

  // Then the callback for invalidatation was not called.
  expect(callbackInvalidate).toHaveBeenCalledTimes(0);
});

test(`when creating a callback cache with it's ttl set to zero`, async () => {
  // Given a callback.
  const callback = jest.fn().mockResolvedValue(50);

  // And the callback cache ttl is set to zero.
  const ttl = 0;

  // And the callback cache has a callback for invalidation.
  const callbackInvalidate = jest.fn();

  // And the callback cache auto invalidate is disabled.
  const invalidateAutoEnable = false;
  const invalidateAutoTtl = 1000;

  // And a cached callback.
  const Component = () => {
    // When creating a callback cache with auto invalidate enabled and it's ttl set to zero.
    const { callback: _lCallback, invalidate: _lInvalidate } = useCallbackCache(
      callback,
      callbackInvalidate,
      {
        ttl,
        invalidate: {
          auto: {
            enable: invalidateAutoEnable,
            ttl: invalidateAutoTtl,
          },
        },
      },
    );

    return <span>Done</span>;
  };

  // Then a validation error occurs.
  expect(() => {
    render(<Component />);
  }).toThrowError('Provided `configuration.ttl` must be greater than zero.');

  // Then the callback should not have been called.
  expect(callback).toHaveBeenCalledTimes(0);

  // Then the callback for invalidatation was not called.
  expect(callbackInvalidate).toHaveBeenCalledTimes(0);
});

test(`when using a callback cache callback, with a valid auto invalidate ttl set, after it's auto invalidated`, async () => {
  // Given a callback.
  const callback = jest.fn().mockResolvedValue(50);

  // And the callback cache ttl is set.
  const ttl = 1000 * 5;

  // And the callback cache has a callback for invalidation.
  const callbackInvalidate = jest.fn();

  // And the callback cache auto invalidate is enabled with a valid ttl.
  const invalidateAutoEnable = true;
  const invalidateAutoTtl = 1000 * 10;

  // And a cached callback.
  let callbackCache: null | (() => Promise<unknown>) = null;
  const Component = () => {
    const { callback: lCallback, invalidate: _lInvalidate } = useCallbackCache(
      callback,
      callbackInvalidate,
      {
        ttl,
        invalidate: {
          auto: {
            enable: invalidateAutoEnable,
            ttl: invalidateAutoTtl,
          },
        },
      },
    );

    callbackCache = lCallback;

    return <span>Done</span>;
  };
  const queries = render(<Component />);

  // When using a callback cache callback, with a valid auto invalidate ttl set, after it's auto invalidated.
  let result: any;
  await act(async () => {
    if (!callbackCache) {
      throw new Error('Callback not set.');
    }
    result = await callbackCache();
  });
  await act(async () => {
    jest.advanceTimersByTime(1000 * 5 + 1);
  });
  await act(async () => {
    if (!callbackCache) {
      throw new Error('Callback not set.');
    }
    result = await callbackCache();
  });

  // Then the callback should have been called.
  await queries.findByText('Done');
  expect(callback).toHaveBeenCalledTimes(2);
  expect(callback).toHaveBeenNthCalledWith(1);
  expect(callback).toHaveBeenNthCalledWith(2);

  // Then the callback result is correct.
  expect(result).toBe(50);

  // Then the callback for invalidatation was called.
  expect(callbackInvalidate).toHaveBeenCalledTimes(1);
});
