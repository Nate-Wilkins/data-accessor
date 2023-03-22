import { waitForElementToBeRemoved } from '@testing-library/react/pure';
import { act } from 'react-dom/test-utils';
import React from 'react';
import { renderBoundary } from '../../test/boundary';
import { createLazySuspense } from './create_lazy_suspense';

test('when using a lazy suspended callback', async () => {
  // Given a callback.
  const data = { hello: 'world!' };
  const callback = jest.fn(() => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(data);
      }, 1000);
    });
  });

  // And a suspense cache.
  const cache = new Map<string, () => any>();
  const cacheId = 'test';
  const cacheGet = jest.fn((k: string) => cache.get(k) || null);
  const cacheSet = jest.fn((k: string, v: () => any) => cache.set(k, v));

  // And a lazy suspended callback.
  const Component = () => {
    // When using a lazy suspended callback.
    const data = createLazySuspense(cacheId, callback, cacheGet, cacheSet);

    return <span>{JSON.stringify(data)}</span>;
  };
  const queries = renderBoundary(<Component />);
  act(() => {
    jest.advanceTimersByTime(1000);
  });

  // Then suspense was invoked.
  await waitForElementToBeRemoved(() => {
    return queries.getByText('Loading...');
  });
  queries.getByText(JSON.stringify(data));

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the cache was accessed correctly.
  expect(cacheSet).toHaveBeenCalledTimes(1);
  expect(cacheGet).toHaveBeenCalledTimes(2);
});

test('when using a lazy suspended callback that errors', async () => {
  // Given a callback that errors.
  const callback = jest.fn(() => {
    return new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Custom error message.'));
      }, 1000);
    });
  });

  // And a suspense cache.
  const cache = new Map<string, () => any>();
  const cacheId = 'test';
  const cacheGet = jest.fn((k: string) => cache.get(k) || null);
  const cacheSet = jest.fn((k: string, v: () => any) => cache.set(k, v));

  // And a lazy suspended callback.
  const Component = () => {
    // When using a lazy suspended callback that errors.
    const data = createLazySuspense(cacheId, callback, cacheGet, cacheSet);

    return <span>{JSON.stringify(data)}</span>;
  };
  const queries = renderBoundary(<Component />);
  act(() => {
    jest.advanceTimersByTime(1000);
  });

  // Then the error boundary was invoked.
  await queries.findByText(/Custom error message\./);

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the cache was accessed correctly.
  expect(cacheSet).toHaveBeenCalledTimes(1);
  expect(cacheGet).toHaveBeenCalledTimes(6);
});

test('when using a lazy suspended callback repeatedly', async () => {
  // Given a callback.
  const data = { hello: 'world!' };
  const callback = jest.fn(() => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(data);
      }, 1000);
    });
  });

  // And a suspense cache.
  const cache = new Map<string, () => any>();
  const cacheId = 'test';
  const cacheGet = jest.fn((k: string) => cache.get(k) || null);
  const cacheSet = jest.fn((k: string, v: () => any) => cache.set(k, v));

  // And a lazy suspended callback.
  const Component = () => {
    // When using a lazy suspended callback repeatedly.
    let data = createLazySuspense(cacheId, callback, cacheGet, cacheSet);
    data = createLazySuspense(cacheId, callback, cacheGet, cacheSet);
    data = createLazySuspense(cacheId, callback, cacheGet, cacheSet);

    return <span>{JSON.stringify(data)}</span>;
  };
  const queries = renderBoundary(<Component />);
  act(() => {
    jest.advanceTimersByTime(1000);
  });

  // Then suspense was invoked.
  await waitForElementToBeRemoved(() => {
    return queries.getByText('Loading...');
  });
  queries.getByText(JSON.stringify(data));

  // Then the callback should have been called.
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenNthCalledWith(1);

  // Then the cache was accessed correctly.
  expect(cacheSet).toHaveBeenCalledTimes(1);
  expect(cacheGet).toHaveBeenCalledTimes(6);
});
