import { useCallback } from 'react';

/**
 * Callback to be run when the callback check satisfies the callback condition.
 *
 * @param callbackConditionInput - Callback to check.
 * @param callbackCondition - Callback condition.
 * @param configuration.true - Callback to call when callback check satisfies the callback condition.
 * @param configuration.false - Callback to call when callback check does not satisfy the callback condition.
 */
export const useCallbackCondition = <T, K>(
  callbackConditionInput: () => Promise<T>,
  callbackCondition: (input: T) => boolean,
  configuration: {
    true: (input: T) => Promise<K>;
    false: (input: T) => Promise<K>;
  },
): (() => Promise<K>) => {
  const cTrue = configuration.true;
  const cFalse = configuration.false;

  return useCallback(async () => {
    const input = await callbackConditionInput();
    if (callbackCondition(input)) {
      return await cTrue(input);
    } else {
      return await cFalse(input);
    }
  }, [cTrue, cFalse, callbackConditionInput, callbackCondition]);
};
