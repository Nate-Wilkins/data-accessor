import { render, waitFor } from '@testing-library/react/pure';
import React from 'react';
import { create as createPromise } from '../../test/promiseManual';
import { createComponent } from './create_component';
import {
  Book,
  createCacheStore,
  createQueryConfiguration,
  Response,
  ResponseBook,
} from './create_hook.test';
import { AccessorQueryResult } from './types';

test('when using a accessor query component without an initial cache result, then the query should execute', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response.
  const data = { book: { id: '0', title: 'My Book', authorId: '3' } };
  const mockQuery = jest.fn(() =>
    createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        data,
      },
    ),
  );

  // And a accessor query configuration.
  // And the cache result is *not* initially available.
  const configuration = createQueryConfiguration({
    query: mockQuery,
  });
  const Component = createComponent(configuration);

  // And a render data function.
  const renderData = jest.fn((result: AccessorQueryResult<Book>) => {
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    // Then the result data is correct.
    expect(result.data).toBe(data.book);

    return <>Book ID: {result.data?.id}</>;
  });

  // When using the accessor hook.
  const queries = render(
    <>
      <Component cache={() => cache} args={{ id: data.book.id }}>
        {renderData}
      </Component>
    </>,
  );

  // Then the user is shown the book ID.
  await waitFor(() =>
    expect(queries.queryAllByText(/Book ID: 0/)).toBeTruthy(),
  );

  // Then the query did execute.
  expect(mockQuery).toHaveBeenCalledWith({ id: '0' });
});

test('when using a accessor query component with an initial cache result, then the query should *not* execute', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response.
  const data = { book: { id: '0', title: 'My Book', authorId: '3' } };
  const mockQuery = jest.fn(() =>
    createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        data,
      },
    ),
  );

  // And the cache result is initially available.
  cache.books.set('0', data.book);

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    query: mockQuery,
  });
  const Component = createComponent(configuration);

  // And a render data function.
  const renderData = jest.fn((result: AccessorQueryResult<Book>) => {
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    // Then the result data is correct.
    expect(result.data).toBe(data.book);

    return <>Book ID: {result.data?.id}</>;
  });

  // When using the accessor hook.
  const queries = render(
    <>
      <Component cache={() => cache} args={{ id: data.book.id }}>
        {renderData}
      </Component>
    </>,
  );

  // Then the user is shown the book ID.
  await waitFor(() =>
    expect(queries.queryAllByText(/Book ID: 0/)).toBeTruthy(),
  );

  // Then the query did *not* execute.
  expect(mockQuery).not.toHaveBeenCalled();
});
