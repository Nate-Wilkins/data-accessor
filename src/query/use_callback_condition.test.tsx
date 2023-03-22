import { render } from '@testing-library/react/pure';
import { act } from 'react-dom/test-utils';
import React from 'react';
import { useCallbackCondition } from './use_callback_condition';

test('when using a callback condition that evaluates to true', async () => {
  // Given a callback.
  const callback = jest.fn().mockResolvedValue({ hasProp: true });

  // And a callback condition that evaluates to true.
  const callbackCondition = jest.fn((result: any) => result.hasProp);

  // And callback condition branches.
  const callbackTrue = jest.fn().mockResolvedValue(40);
  const callbackFalse = jest.fn().mockResolvedValue(30);

  let callbackCaller: any;
  const Component = () => {
    callbackCaller = useCallbackCondition(callback, callbackCondition, {
      true: callbackTrue,
      false: callbackFalse,
    });

    return <span>Done</span>;
  };
  const queries = render(<Component />);

  // When using a callback condition.
  let result: any;
  await act(async () => {
    if (callbackCaller) {
      result = await callbackCaller();
    }
  });

  // Then the callback should have been called.
  await queries.findByText('Done');
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

  let callbackCaller: any;
  const Component = () => {
    callbackCaller = useCallbackCondition(callback, callbackCondition, {
      true: callbackTrue,
      false: callbackFalse,
    });

    return <span>Done</span>;
  };
  const queries = render(<Component />);

  // When using a callback condition.
  let result: any;
  await act(async () => {
    if (callbackCaller) {
      result = await callbackCaller();
    }
  });

  // Then the callback should have been called.
  await queries.findByText('Done');
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the callback conditions were called correctly.
  expect(callbackFalse).toHaveBeenCalledTimes(1);
  expect(callbackTrue).toHaveBeenCalledTimes(0);

  // Then the callback returned the right result.
  expect(result).toBe(30);
});
