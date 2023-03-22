import { createCallbackCache } from './create_callback_cache';

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
  const { callback: callbackCache, invalidate: _lInvalidate } =
    createCallbackCache(callback, callbackInvalidate, {
      ttl,
      invalidate: {
        auto: {
          enable: invalidateAutoEnable,
          ttl: invalidateAutoTtl,
        },
      },
    });

  // When using a callback cache callback.
  const result = await callbackCache();

  // Then the callback should have been called.
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
  const { callback: callbackCache, invalidate: _lInvalidate } =
    createCallbackCache(callback, callbackInvalidate, {
      ttl,
      invalidate: {
        auto: {
          enable: invalidateAutoEnable,
          ttl: invalidateAutoTtl,
        },
      },
    });

  // When using a callback cache callback again within it's ttl.
  let result = await callbackCache();
  result = await callbackCache();

  // Then the callback should have been called.
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
  const { callback: callbackCache, invalidate: _lInvalidate } =
    createCallbackCache(callback, callbackInvalidate, {
      ttl,
      invalidate: {
        auto: {
          enable: invalidateAutoEnable,
          ttl: invalidateAutoTtl,
        },
      },
    });

  // When using a callback cache callback again after it's ttl.
  let result = await callbackCache();
  jest.advanceTimersByTime(1000 * 5 + 1);
  result = await callbackCache();

  // Then the callback should have been called.
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
  const { callback: callbackCache, invalidate: callbackCacheInvalidate } =
    createCallbackCache(callback, callbackInvalidate, {
      ttl,
      invalidate: {
        auto: {
          enable: invalidateAutoEnable,
          ttl: invalidateAutoTtl,
        },
      },
    });

  // When using a callback cache callback after it's manually invalidated.
  let result = await callbackCache();
  await callbackCacheInvalidate();
  result = await callbackCache();

  // Then the callback should have been called.
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

  // When creating a callback cache with auto invalidate enabled and it's ttl set to zero.
  const create = () => {
    const { callback: _callbackCache, invalidate: _callbackCacheInvalidate } =
      createCallbackCache(callback, callbackInvalidate, {
        ttl,
        invalidate: {
          auto: {
            enable: invalidateAutoEnable,
            ttl: invalidateAutoTtl,
          },
        },
      });
  };

  // Then a validation error occurs.
  expect(() => {
    create();
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

  // When creating a callback cache with auto invalidate enabled and it's ttl set to zero.
  const create = () => {
    const { callback: _callbackCache, invalidate: _callbackCacheInvalidate } =
      createCallbackCache(callback, callbackInvalidate, {
        ttl,
        invalidate: {
          auto: {
            enable: invalidateAutoEnable,
            ttl: invalidateAutoTtl,
          },
        },
      });
  };

  // Then a validation error occurs.
  expect(() => {
    create();
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
  const { callback: callbackCache, invalidate: _callbackCacheInvalidate } =
    createCallbackCache(callback, callbackInvalidate, {
      ttl,
      invalidate: {
        auto: {
          enable: invalidateAutoEnable,
          ttl: invalidateAutoTtl,
        },
      },
    });

  // When using a callback cache callback, with a valid auto invalidate ttl set, after it's auto invalidated.
  let result = await callbackCache();
  jest.advanceTimersByTime(1000 * 5 + 1);
  result = await callbackCache();

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(2);
  expect(callback).toHaveBeenNthCalledWith(1);
  expect(callback).toHaveBeenNthCalledWith(2);

  // Then the callback result is correct.
  expect(result).toBe(50);

  // Then the callback for invalidatation was called.
  expect(callbackInvalidate).toHaveBeenCalledTimes(1);
});
