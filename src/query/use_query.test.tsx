import { waitForElementToBeRemoved } from '@testing-library/react/pure';
import React, { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import {
  Book,
  createCacheStore,
  createQueryConfiguration,
  renderAccessor,
  Response,
  ResponseBook,
} from '../../test/accessor';
import { create as createPromise } from '../../test/promise_manual';
import { createAccessor } from './create_accessor';
import { AccessorQueryResult } from './types';
import { useQuery } from './use_query';

test('when using a accessor query hook without an initial cache result, then the query should execute', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response.
  const data = { book: { id: '0', title: 'My Book', authorId: '3' } };
  const query = jest.fn(() => {
    const promise = createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        data,
      },
    );

    // Complete the proimse.
    jest.advanceTimersByTime(1000);

    return promise;
  });

  // And a accessor query configuration.
  // And the cache result is *not* initially available.
  const configuration = createQueryConfiguration({
    query,
  });
  const accessor = createAccessor(configuration);

  // And a component using the accessor query.
  const Component = () => {
    // When using the accessor hook.
    const result = useQuery(accessor, () => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    // Then the result data is correct.
    expect(result.data).toBe(data.book);

    return <>{JSON.stringify(result.data)}</>;
  };
  const queries = renderAccessor(<Component />);

  // Then the query did execute.
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));
  queries.getByText(JSON.stringify(data.book));
  expect(query).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledWith({ id: '0' });
});

test('when using a accessor query hook with an initial cache result and isPrimableFromCache is on, then the query should *not* execute', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response.
  const data = {
    book: {
      id: '0',
      title: 'My Cached Book',
      authorId: '4',
    },
  };
  const query = jest.fn(() => {
    const promise = createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        data,
      },
    );

    // Complete the proimse.
    jest.advanceTimersByTime(1000);

    return promise;
  });

  // And the cache result is initially available.
  cache.books.set('0', data.book);

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    cache: {
      // And isPrimableFromCache is turned on.
      isPrimableFromCache: true,
    },
    query,
  });
  const accessor = createAccessor(configuration);

  // And a component using the accessor query.
  const Component = () => {
    // When using the accessor hook.
    const result = useQuery(accessor, () => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    // Then the result data is correct.
    expect(result.data).toBe(data.book);

    return <>{JSON.stringify(result.data)}</>;
  };
  const queries = renderAccessor(<Component />);

  // Then the query did *not* execute.
  queries.getByText(JSON.stringify(data.book));
  expect(query).not.toHaveBeenCalled();
});

test('when using a accessor query hook with an initial cache result and isPrimableFromCache is off, then the query should execute', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response.
  const data = {
    book: {
      id: '0',
      title: 'My Book',
      authorId: '3',
    },
  };
  const query = jest.fn(() => {
    const promise = createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        data,
      },
    );

    // Complete the proimse.
    jest.advanceTimersByTime(1000);

    return promise;
  });

  // And the cache result is initially available.
  cache.books.set('0', {
    id: '0',
    title: 'My Cached Book',
    authorId: '4',
  });

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    cache: {
      // And isPrimableFromCache is turned off.
      isPrimableFromCache: false,
    },
    query,
  });
  const accessor = createAccessor(configuration);

  // And a component using the accessor query.
  const Component = () => {
    // When using the accessor hook.
    const result = useQuery(accessor, () => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    // Then the result data is correct.
    expect(result.data).toBe(data.book);

    return <>{JSON.stringify(result.data)}</>;
  };
  const queries = renderAccessor(<Component />);

  // Then the query did execute.
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));
  queries.getByText(JSON.stringify(data.book));
  expect(query).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledWith({ id: '0' });
});

test('when using a accessor query hook with a query that errors, then the query error should be thrown', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response that errors.
  const query = jest.fn(() => {
    const promise = createPromise<Response<ResponseBook>>(
      { resolve: true },
      new Error('Network call error.'),
    );

    // Complete the proimse.
    jest.advanceTimersByTime(1000);

    return promise;
  });

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    query,
  });
  const accessor = createAccessor(configuration);

  // And a component using the accessor query.
  const Component = () => {
    // When using the accessor hook.
    const result = useQuery(accessor, () => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    return null;
  };

  // Then the query response error is thrown.
  const queries = renderAccessor(<Component />);

  // Then the query did execute.
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));
  queries.getByText(/Network call error\./);
  expect(query).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledWith({ id: '0' });
});

test('when using a accessor query hook with a query response of a non-200 status code, then an error should be thrown', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response with a non-200 status code.
  const data = {
    book: {
      id: '0',
      title: 'My Book',
      authorId: '3',
    },
  };
  const query = jest.fn(() => {
    const promise = createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 500,
        data,
      },
    );

    // Complete the proimse.
    jest.advanceTimersByTime(1000);

    return promise;
  });

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    query,
  });
  const accessor = createAccessor(configuration);

  // And a component using the accessor query.
  const Component = () => {
    // When using the accessor hook.
    const result = useQuery(accessor, () => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    return null;
  };

  // Then the query response error is thrown.
  const queries = renderAccessor(<Component />);

  // Then the query did execute.
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));
  queries.getByText(/\(500\) Response failed\./);
  expect(query).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledWith({ id: '0' });
});

test('when using a accessor query hook with a query response of a 200 status code and an error text, then an error should be thrown', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response with a 200 status code.
  // And a query response with a error text
  const query = jest.fn(() => {
    const promise = createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        error: 'A validation error occurred.',
      },
    );

    // Complete the proimse.
    jest.advanceTimersByTime(1000);

    return promise;
  });

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    query,
  });
  const accessor = createAccessor(configuration);

  // And a component using the accessor query.
  const Component = () => {
    // When using the accessor hook.
    const result = useQuery(accessor, () => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    return null;
  };

  // Then the query response error is thrown.
  const queries = renderAccessor(<Component />);

  // Then the query did execute.
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));
  queries.getByText(/\(200\) Response failed: A validation error occurred\./);
  expect(query).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledWith({ id: '0' });
});

test('when using a accessor query hook with a query response that takes longer than the maxDelay with enforce on, then an error timeout should be thrown', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response with a non-200 status code.
  // And the query response takes longer than the maxDelay.
  const data = {
    book: {
      id: '0',
      title: 'My Book',
      authorId: '3',
    },
  };
  const query = jest.fn(() => {
    const promise = createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        data,
      },
    );

    // Complete the proimse.
    jest.advanceTimersByTime(1000);

    return promise;
  });

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    constraints: { enforce: true, maxDelay: 1 },
    query,
  });
  const accessor = createAccessor(configuration);

  // And a component using the accessor query.
  const Component = () => {
    // When using the accessor hook.
    const result = useQuery(accessor, () => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    return null;
  };

  // Then the query response error is thrown.
  const queries = renderAccessor(<Component />);

  // Then the query did execute.
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));
  queries.getByText(
    /Data accessor 'mockConstructor' with id 'getBook#id#0' timed out\./,
  );
  expect(query).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledWith({ id: '0' });
});

test('when invalidating an accessor query hook, then the cache should invalidate and trigger a rerender', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response.
  const data = { book: { id: '0', title: 'My Book', authorId: '3' } };
  const query = jest.fn(() => {
    const promise = createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        data,
      },
    );

    // Complete the proimse.
    jest.advanceTimersByTime(1000);

    return promise;
  });

  // And the cache result is initially available.
  cache.books.set('0', data.book);

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    query,
  });
  const accessor = createAccessor(configuration);

  // And some callback to trigger the invalidation.
  const trigger = jest.fn((result: AccessorQueryResult<Book>) =>
    result.invalidate(),
  );
  // And some callback to render data.
  const renderData = jest.fn((result: AccessorQueryResult<Book>) => {
    return JSON.stringify(result.data);
  });

  // And a component using the accessor query.
  const Component = () => {
    // And the component has already requested data.
    const result = useQuery(accessor, () => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    // When invalidating an accessor query hook.
    useEffect(() => {
      trigger(result);
    }, []);

    // Then the result data is correct.
    expect(result.data).toBe(data.book);

    return <>{renderData(result)}</>;
  };
  const queries = renderAccessor(<Component />);

  // Then the query did execute.
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));
  queries.getByText(JSON.stringify(data.book));
  expect(query).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledWith({ id: '0' });
  expect(trigger).toHaveBeenCalledTimes(1);

  // Then the data was rendered twice.
  //   1. For the cached data.
  //   2. For the invalidation.
  expect(renderData).toHaveBeenCalledTimes(2);
});

test('when auto invalidating an accessor query hook, then the cache should invalidate and trigger a rerender', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response.
  const data = { book: { id: '0', title: 'My Book', authorId: '3' } };
  const query = jest.fn(() => {
    const promise = createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        data,
      },
    );

    // Complete the proimse.
    jest.advanceTimersByTime(1000);

    return promise;
  });

  // And the cache result is initially available.
  cache.books.set('0', data.book);

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    query,
    cache: {
      invalidate: { auto: { enable: true, interval: 3000 } },
    },
  });
  const accessor = createAccessor(configuration);

  // And some callback to render data.
  const renderData = jest.fn((result: AccessorQueryResult<Book>) => {
    return JSON.stringify(result.data);
  });

  // And a component using the accessor query.
  const Component = () => {
    // And the component has already requested data.
    const result = useQuery(accessor, () => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    return <>{renderData(result)}</>;
  };
  const queries = renderAccessor(<Component />);

  // And the query did *not* execute yet.
  expect(query).toHaveBeenCalledTimes(0);
  queries.getByText(JSON.stringify(data.book));

  // When invalidating an accessor query hook.
  // NOTE: Done internally by `useQuery`.
  act(() => {
    jest.advanceTimersByTime(3000);
  });

  // Then the query did execute.
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));
  queries.getByText(JSON.stringify(data.book));
  expect(query).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledWith({ id: '0' });

  // Then the data was rendered twice.
  //   1. For the cached data.
  //   2. For the invalidation.
  expect(renderData).toHaveBeenCalledTimes(2);

  // Then the invalidation trigger was setup correctly.
  expect(setInterval).toHaveBeenCalledTimes(2);
  expect(setInterval).toHaveBeenNthCalledWith(1, expect.any(Function), 3000);
  expect(setInterval).toHaveBeenNthCalledWith(2, expect.any(Function), 1000);
});
