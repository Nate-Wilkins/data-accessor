import { createCallbackCondition } from './create_callback_condition';

test('when using a callback condition that evaluates to true', async () => {
  // Given a callback.
  const callback = jest.fn().mockResolvedValue({ hasProp: true });

  // And a callback condition that evaluates to true.
  const callbackCondition = jest.fn((result: any) => result.hasProp);

  // And callback condition branches.
  const callbackTrue = jest.fn().mockResolvedValue(40);
  const callbackFalse = jest.fn().mockResolvedValue(30);

  // And a callback condition.
  const callbackCaller = createCallbackCondition(callback, callbackCondition, {
    true: callbackTrue,
    false: callbackFalse,
  });

  // When using a callback condition.
  const result = await callbackCaller();

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the callback conditions were called correctly.
  expect(callbackTrue).toHaveBeenCalledTimes(1);
  expect(callbackFalse).toHaveBeenCalledTimes(0);

  // Then the callback returned the right result.
  expect(result).toBe(40);
});

test('when using a callback condition that evaluates to false', async () => {
  // Given a callback.
  const callback = jest.fn().mockResolvedValue({ hasProp: false });

  // And a callback condition that evaluates to false.
  const callbackCondition = jest.fn((result: any) => result.hasProp);

  // And callback condition branches.
  const callbackTrue = jest.fn().mockResolvedValue(40);
  const callbackFalse = jest.fn().mockResolvedValue(30);

  // And a callback condition.
  const callbackCaller = createCallbackCondition(callback, callbackCondition, {
    true: callbackTrue,
    false: callbackFalse,
  });

  // When using a callback condition.
  const result = await callbackCaller();

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the callback conditions were called correctly.
  expect(callbackFalse).toHaveBeenCalledTimes(1);
  expect(callbackTrue).toHaveBeenCalledTimes(0);

  // Then the callback returned the right result.
  expect(result).toBe(30);
});
