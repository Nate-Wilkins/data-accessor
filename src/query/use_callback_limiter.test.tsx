import { render } from '@testing-library/react/pure';
import { act } from 'react-dom/test-utils';
import React from 'react';
import { useCallbackLimiter } from './use_callback_limiter';

test('when using a callback limiter', async () => {
  // Given a callback.
  const callback = jest.fn().mockReturnValue(42);

  // And the limiter has a maximum.
  const max = 1;

  // And the limiter doesn't have a reset.
  const reset = false;

  // And a limiter with a maximum and no reset.
  let callbackLimiter: any = null;
  const Component = () => {
    callbackLimiter = useCallbackLimiter(callback, {
      max,
      defaultValue: null,
      reset,
    });

    return <span>Done</span>;
  };
  const queries = render(<Component />);

  // When using a callback caller with a maximum and no reset.
  let result: any;
  await act(async () => {
    if (callbackLimiter) {
      result = await callbackLimiter.callback();
    }
  });

  // Then the callback should have been called.
  await queries.findByText('Done');
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the callback returned the right result.
  expect(result).toBe(42);

  // Then the callback call was counted.
  expect(callbackLimiter?.count).toBe(1);
});

test('when using a callback limiter that exceeds the call count with reset disabled', async () => {
  // Given a callback.
  const callback = jest.fn().mockReturnValue(32);

  // And the limiter has a maximum.
  const max = 1;

  // And the limiter doesn't have a reset.
  const reset = false;

  // And a limiter with a maximum and no reset
  let callbackLimiter: any = null;
  const Component = () => {
    callbackLimiter = useCallbackLimiter(callback, {
      max,
      reset,
      defaultValue: true,
    });

    return <span>Done</span>;
  };
  const queries = render(<Component />);

  // When using a callback limiter that exceeds the call count with reset disabled.
  let result: any;
  await act(async () => {
    if (callbackLimiter) {
      result = await callbackLimiter.callback();
    }
  });
  await act(async () => {
    if (callbackLimiter) {
      result = await callbackLimiter.callback();
    }
  });

  // Then the callback should have been called.
  queries.getByText('Done');
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the callback returned the right result.
  expect(result).toBe(true);

  // Then the callback call was counted.
  expect(callbackLimiter?.count).toBe(1);
});

test('when using a callback limiter that exceeds the call count with reset enabled', async () => {
  // Given a callback.
  const callback = jest.fn().mockReturnValue(32);

  // And the limiter has a maximum.
  const max = 1;

  // And the limiter has a reset.
  const reset = true;

  // And a caller with a maximum and no reset
  let callbackLimiter: any = null;
  const Component = () => {
    callbackLimiter = useCallbackLimiter(callback, {
      max,
      reset,
      defaultValue: true,
    });

    return <span>Done</span>;
  };
  const queries = render(<Component />);

  // When using a callback limiter that exceeds the call count with reset enabled
  let result: any;
  await act(async () => {
    if (callbackLimiter) {
      result = await callbackLimiter.callback();
    }
  });
  await act(async () => {
    if (callbackLimiter) {
      result = await callbackLimiter.callback();
    }
  });
  await act(async () => {
    if (callbackLimiter) {
      result = await callbackLimiter.callback();
    }
  });

  // Then the callback should have been called.
  queries.getByText('Done');
  expect(callback).toHaveBeenCalledTimes(2);
  expect(callback).toHaveBeenNthCalledWith(1);
  expect(callback).toHaveBeenNthCalledWith(2);

  // Then the callback returned the right result.
  expect(result).toBe(32);

  // Then the callback call was counted.
  expect(callbackLimiter?.count).toBe(1);
});
