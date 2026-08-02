import {
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react/pure';
import React, { useState } from 'react';
import { act } from 'react-dom/test-utils';
import { renderBoundary } from '../../test/boundary';
import { create as createPromise } from '../../test/promise_manual';
import {
  createCacheStore,
  createConfiguration,
  Response,
  ResponseBook,
} from '../../test/query';
import { CacheResult } from './types';
import { useQuery } from './use_query';

test('when using a query hook without an initial cache result', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query request and response.
  const data = { book: { id: '0', title: 'My Book', authorId: '3' } };
  const queryRequest = jest.fn(() => {
    return createPromise<Response<ResponseBook>>({
      status: 200,
      data,
    });
  });

  // And the cache result is *not* initially available.
  // And a query configuration.
  const configuration = createConfiguration(cache, {
    queryRequest,
    cache: { isPrimable: false },
  });

  // And a component using the query.
  const Component = () => {
    // When using a query hook without an initial cache result.
    const result = useQuery(configuration, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    return <>{JSON.stringify(result.data)}</>;
  };
  const queries = renderBoundary(<Component />);

  // Then the query request started executing.
  await waitFor(() => {
    expect(queries.getByText('Loading...')).toBeInTheDocument();
  });
  // Then the query request did execute.
  act(() => jest.advanceTimersByTime(1000));
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));
  expect(queryRequest).toHaveBeenCalledTimes(1);
  expect(queryRequest).toHaveBeenNthCalledWith(1, { id: '0' });

  // Then the query data was rendered correctly.
  queries.getByText(JSON.stringify(data.book));
});

test('when using a query hook with an initial cache result and isPrimable is enabled', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query request and response.
  const data = {
    book: {
      id: '0',
      title: 'My Cached Book',
      authorId: '4',
    },
  };
  const queryRequest = jest.fn(() => {
    return createPromise<Response<ResponseBook>>({
      status: 200,
      data,
    });
  });

  // And the cache result is initially available.
  cache.books.set('0', data.book);

  // And a query configuration.
  const configuration = createConfiguration(cache, {
    queryRequest,
    cache: {
      // And isPrimable is enabled.
      isPrimable: true,
    },
  });

  // And a component using the query.
  const Component = () => {
    // When using a query hook with an initial cache result and isPrimable is enabled.
    const result = useQuery(configuration, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    return <>{JSON.stringify(result.data)}</>;
  };
  const queries = renderBoundary(<Component />);

  // Then the query data was rendered correctly.
  queries.getByText(JSON.stringify(data.book));

  // Then the query request did *not* execute.
  expect(queryRequest).toHaveBeenCalledTimes(0);
});

test('when using a query hook with an initial cache result and isPrimable is disabled', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query request and response.
  const data = { book: { id: '0', title: 'My Book', authorId: '3' } };
  const queryRequest = jest.fn(() => {
    return createPromise<Response<ResponseBook>>({
      status: 200,
      data,
    });
  });

  // And the cache result is initially available.
  cache.books.set('0', data.book);

  // And a query configuration.
  const configuration = createConfiguration(cache, {
    queryRequest,
    // And isPrimable is disabled.
    cache: { isPrimable: false },
  });

  // And a component using the query.
  const Component = () => {
    // When using a query hook with an initial cache result and isPrimable is disabled.
    const result = useQuery(configuration, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    return <>{JSON.stringify(result.data)}</>;
  };
  const queries = renderBoundary(<Component />);

  // Then the query request started executing.
  await waitFor(() => {
    expect(queries.getByText('Loading...')).toBeInTheDocument();
  });
  // Then the query request did execute.
  act(() => jest.advanceTimersByTime(1000));
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));
  expect(queryRequest).toHaveBeenCalledTimes(1);
  expect(queryRequest).toHaveBeenNthCalledWith(1, { id: '0' });

  // Then the query data was rendered correctly.
  queries.getByText(JSON.stringify(data.book));
});

test('when using a query hook *again* with ttl enabled', async () => {
  // Given a cache store.
  const cache = createCacheStore();
  const cacheSuspense = new Map<string, any>();

  // And a query request and response.
  const data = { book: { id: '0', title: 'My Book', authorId: '3' } };
  const queryRequest = jest.fn(() => {
    return createPromise<Response<ResponseBook>>({
      status: 200,
      data,
    });
  });

  // And the accessor query has already retreived data.
  jest.advanceTimersByTime(1000);

  // And a query configuration.
  const configuration = createConfiguration(cache, {
    queryRequest,
    cache: {
      // And isPrimable is disabled.
      isPrimable: false,
      // And ttl is set to 2 seconds.
      ttl: 2 * 1000,
    },
    suspense: {
      cache: {
        set: (k: string, v: null | undefined | (() => CacheResult<any>)) =>
          cacheSuspense.set(k, v),
        get: (k: string) => {
          return cacheSuspense.get(k) || null;
        },
      },
    },
  });

  // And a component using the query.
  const Component = () => {
    // When using a query hook *again* with ttl enabled.
    const [_, setRerender] = useState<boolean>(false);
    const result = useQuery(configuration, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    return (
      <>
        <span>{JSON.stringify(result.data)}</span>
        <button onClick={() => setRerender(v => !v)}>Rerender</button>
      </>
    );
  };
  const queries = renderBoundary(<Component />);

  // Then the query request started executing.
  await waitFor(() => {
    expect(queries.getByText('Loading...')).toBeInTheDocument();
  });
  // Then the query request did execute.
  act(() => jest.advanceTimersByTime(1000));
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));
  expect(queryRequest).toHaveBeenCalledTimes(1);
  expect(queryRequest).toHaveBeenNthCalledWith(1, { id: '0' });

  // Then the query data was rendered correctly.
  queries.getByText(JSON.stringify(data.book));

  // Then the query hook data expired.
  act(() => {
    jest.advanceTimersByTime(2000);
  });
  fireEvent.click(queries.getByText('Rerender'));
  await waitFor(() => {
    expect(queries.getByText('Loading...')).toBeInTheDocument();
  });
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));
  queries.getByText(JSON.stringify({ ...data.book, title: 'Updated Title' }));

  // Then the initial query request data is rendered.
  queries.getByText(JSON.stringify(data.book));

  // Then the new query data is rendered.
  await waitFor(() => {
    expect(queries.getByText('Loading...')).toBeInTheDocument();
  });
  await waitForElementToBeRemoved(() => queries.getByText('Loading...'));

  // Then the query data was rendered correctly.
  queries.getByText(JSON.stringify(data.book));

  // Then the query was called correctly.
  expect(queryRequest).toHaveBeenCalledTimes(2);
  expect(queryRequest).toHaveBeenNthCalledWith(1, { id: '0' });
  expect(queryRequest).toHaveBeenNthCalledWith(2, { id: '0' });
});
