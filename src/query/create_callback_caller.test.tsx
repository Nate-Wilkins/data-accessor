import { createCallbackCaller } from './create_callback_caller';

test('when using a callback caller', async () => {
  // Given a callback.
  const callback = jest.fn().mockResolvedValue(0);

  // And the callback caller has a maximum.
  const max = 5;

  // And the callback caller doesn't have a reset.
  const reset = false;

  // And a callback caller.
  const { count: callerCount, callback: callerCallback } = createCallbackCaller(
    callback,
    { max, reset },
  );

  // When using a callback caller with a maximum and no reset.
  await callerCallback();

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the callback call was counted.
  expect(callerCount.current).toBe(1);
});

test(`when using a callback caller above it's maximum with no reset`, async () => {
  // Given a callback.
  const callback = jest.fn();

  // And the callback caller has a maximum.
  const max = 1;

  // And the callback caller doesn't have a reset.
  const reset = false;

  // And a callback caller with a maximum and no reset.
  const { count: callerCount, callback: callerCallback } = createCallbackCaller(
    callback,
    { max, reset },
  );

  // When using a callback caller above it's maximum with no reset.
  await callerCallback();
  await callerCallback();

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(2);
  expect(callback).toHaveBeenNthCalledWith(1);
  expect(callback).toHaveBeenNthCalledWith(2);

  // Then the callback call was counted.
  expect(callerCount.current).toBe(1);
});

test(`when using a callback caller above it's maximum with a reset`, async () => {
  // Given a callback.
  const callback = jest.fn();

  // And the callback caller has a maximum.
  const max = 3;

  // And the callback caller has a reset.
  const reset = true;

  // And a callback caller.
  const { count: callerCount, callback: callerCallback } = createCallbackCaller(
    callback,
    { max, reset },
  );

  // When using a callback caller above it's maximum with a reset.
  await callerCallback();
  await callerCallback();
  await callerCallback();
  await callerCallback();

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(4);
  expect(callback).toHaveBeenNthCalledWith(1);
  expect(callback).toHaveBeenNthCalledWith(2);
  expect(callback).toHaveBeenNthCalledWith(3);
  expect(callback).toHaveBeenNthCalledWith(4);

  // Then the callback call was counted.
  expect(callerCount.current).toBe(1);
});
