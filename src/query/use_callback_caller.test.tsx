import { render, waitForElementToBeRemoved } from '@testing-library/react/pure';
import { act } from 'react-dom/test-utils';
import React from 'react';
import { useCallbackCaller } from './use_callback_caller';

test('when using a callback caller', async () => {
  // Given a callback.
  const callback = jest.fn();

  // And the callback caller has a maximum.
  const max = 5;

  // And the callback caller doesn't have a reset.
  const reset = false;

  // And a callback caller.
  let callerCount: null | number = null;
  let callerCallback: null | (() => Promise<any>) = null;
  const Component = () => {
    const { count: resultCount, callback: resultCallback } = useCallbackCaller(
      callback,
      {
        max,
        reset,
      },
    );

    callerCount = resultCount;
    callerCallback = resultCallback;

    return <span>{resultCount}</span>;
  };
  const queries = render(<Component />);

  // When using a callback caller with a maximum and no reset.
  act(() => {
    callerCallback && callerCallback();
  });

  // Then the callback should have been called.
  await waitForElementToBeRemoved(() => queries.getByText('0'));
  queries.getByText('1');
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the callback call was counted.
  expect(callerCount).toBe(1);
});

test(`when using a callback caller above it's maximum with no reset`, async () => {
  // Given a callback.
  const callback = jest.fn();

  // And the callback caller has a maximum.
  const max = 1;

  // And the callback caller doesn't have a reset.
  const reset = false;

  // And a callback caller with a maximum and no reset.
  let callerCount: null | number = null;
  let callerCallback: null | (() => Promise<any>) = null;
  const Component = () => {
    const { count: resultCount, callback: resultCallback } = useCallbackCaller(
      callback,
      {
        max,
        reset,
      },
    );

    callerCount = resultCount;
    callerCallback = resultCallback;

    return <span>{resultCount}</span>;
  };
  const queries = render(<Component />);

  // When using a callback caller above it's maximum with no reset.
  act(() => {
    callerCallback && callerCallback();
  });
  await waitForElementToBeRemoved(() => queries.getByText('0'));
  act(() => {
    callerCallback && callerCallback();
  });
  await queries.findByText('1');

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(2);
  expect(callback).toHaveBeenNthCalledWith(1);
  expect(callback).toHaveBeenNthCalledWith(2);

  // Then the callback call was counted.
  expect(callerCount).toBe(1);
});

test(`when using a callback caller above it's maximum with a reset`, async () => {
  // Given a callback.
  const callback = jest.fn();

  // And the callback caller has a maximum.
  const max = 3;

  // And the callback caller has a reset.
  const reset = true;

  // And a callback caller.
  let callerCount: null | number = null;
  let callerCallback: null | (() => Promise<any>) = null;
  const Component = () => {
    const { count: resultCount, callback: resultCallback } = useCallbackCaller(
      callback,
      {
        max,
        reset,
      },
    );

    callerCount = resultCount;
    callerCallback = resultCallback;

    return <span>{resultCount}</span>;
  };
  const queries = render(<Component />);

  // When using a callback caller above it's maximum with a reset.
  act(() => {
    callerCallback && callerCallback();
  });
  await waitForElementToBeRemoved(() => queries.getByText('0'));
  act(() => {
    callerCallback && callerCallback();
  });
  await waitForElementToBeRemoved(() => queries.getByText('1'));
  act(() => {
    callerCallback && callerCallback();
  });
  await waitForElementToBeRemoved(() => queries.getByText('2'));
  act(() => {
    callerCallback && callerCallback();
  });
  await waitForElementToBeRemoved(() => queries.getByText('3'));
  await queries.findByText('1');

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(4);
  expect(callback).toHaveBeenNthCalledWith(1);
  expect(callback).toHaveBeenNthCalledWith(2);
  expect(callback).toHaveBeenNthCalledWith(3);
  expect(callback).toHaveBeenNthCalledWith(4);

  // Then the callback call was counted.
  expect(callerCount).toBe(1);
});
