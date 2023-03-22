import { createCallbackLimiter } from './create_callback_limiter';

test('when using a callback limiter', async () => {
  // Given a callback.
  const callback = jest.fn().mockReturnValue(42);

  // And the limiter has a maximum.
  const max = 1;

  // And the limiter doesn't have a reset.
  const reset = false;

  // And the limiter doesn't have a default value.
  const defaultValue = null;

  // And a limiter with a maximum and no reset.
  const callbackLimiter = createCallbackLimiter(callback, {
    max,
    defaultValue,
    reset,
  });

  // When using a callback caller with a maximum and no reset.
  const result = await callbackLimiter.callback();

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the callback returned the right result.
  expect(result).toBe(42);

  // Then the callback call was counted.
  expect(callbackLimiter.count.current).toBe(1);
});

test('when using a callback limiter that exceeds the call count with reset disabled', async () => {
  // Given a callback.
  const callback = jest.fn().mockReturnValue(32);

  // And the limiter has a maximum.
  const max = 1;

  // And the limiter doesn't have a reset.
  const reset = false;

  // And the limiter has a default value.
  const defaultValue = true;

  // And a limiter with a maximum and no reset
  const callbackLimiter = createCallbackLimiter(callback, {
    max,
    defaultValue,
    reset,
  });

  // When using a callback limiter that exceeds the call count with reset disabled.
  let result = await callbackLimiter.callback();
  result = await callbackLimiter.callback();

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the callback returned the right result.
  expect(result).toBe(true);

  // Then the callback call was counted.
  expect(callbackLimiter.count.current).toBe(1);
});

test('when using a callback limiter that exceeds the call count with reset enabled', async () => {
  // Given a callback.
  const callback = jest.fn().mockReturnValue(32);

  // And the limiter has a maximum.
  const max = 1;

  // And the limiter has a reset.
  const reset = true;

  // And the limiter doesn't have a default value.
  const defaultValue = null;

  // And a caller with a maximum and no reset
  const callbackLimiter = createCallbackLimiter(callback, {
    max,
    defaultValue,
    reset,
  });

  // When using a callback limiter that exceeds the call count with reset enabled
  let result = await callbackLimiter.callback();
  result = await callbackLimiter.callback();
  result = await callbackLimiter.callback();

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(2);
  expect(callback).toHaveBeenNthCalledWith(1);
  expect(callback).toHaveBeenNthCalledWith(2);

  // Then the callback returned the right result.
  expect(result).toBe(32);

  // Then the callback call was counted.
  expect(callbackLimiter.count.current).toBe(1);
});

test('when using a callback limiter with a limit of zero', async () => {
  // Given a callback.
  const callback = jest.fn().mockReturnValue(42);

  // And the limiter is zero.
  const max = 0;

  // And the limiter doesn't have a reset.
  const reset = false;

  // And the limiter doesn't have a default value.
  const defaultValue = null;

  // And a limiter set to zero and no reset.
  const callbackLimiter = createCallbackLimiter(callback, {
    max,
    defaultValue,
    reset,
  });

  // When using a callback limiter with a limit of zero.
  const result = await callbackLimiter.callback();

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the callback returned the right result.
  expect(result).toBe(42);

  // Then the callback call was counted.
  expect(callbackLimiter.count.current).toBe(1);
});
