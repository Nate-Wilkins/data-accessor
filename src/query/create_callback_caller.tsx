/**
 * Callback caller to keep track of how many calls the callback has made.
 *
 * @param callback - Callback to call.
 * @param configuration.reset - Whether or not `called` count should reset when `max` is exceeded.
 * @param configuration.max - The max state value for `called`.
 */
export const createCallbackCaller = <T,>(
  callback: () => Promise<T>,
  configuration: { reset: boolean; max: number },
): { count: { current: number }; callback: () => Promise<T> } => {
  // Configuration.
  const cReset = configuration.reset;
  const cMax = configuration.max;

  // State.
  const count = { current: 0 };

  const callerCallback = async () => {
    const result = await callback();

    // Increase count.
    if (count.current < cMax) {
      count.current = count.current + 1;
    } else {
      if (cReset) {
        count.current = 1;
      }
    }

    return result;
  };

  return {
    count,
    callback: callerCallback,
  };
};
