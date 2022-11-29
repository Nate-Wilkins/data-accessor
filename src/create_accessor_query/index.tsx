import { AccessorQueryRequestResponse, AccessorQueryResult } from './types';

/*
 * Creates an accessor.
 *
 * An accessor is a data query hook used to query data.
 *
 * This query hook utilizes suspense and proxies to make data querying easier on the client.
 *
 * This happens in the following order:
 *   1. The client invokes the hook.
 *   2. The result cache is read to see if the client has already completed this request, if so provide the result.
 *   3. Otherwise return a proxy that will "execute" (throw for suspense) the query when accessed.
 *   4. The proxy is invoked by client code.
 *   5. Triggering suspense to handle executing the query request.
 *   6. The request cache is read to see if the client has already made this request, if so use that request.
 *   7. Otherwise create a new request and store it in the request cache.
 *   8. Once the request completes cache the result.
 *
 * @example
 *   ```
 *   // use_get_book.tsx
 *   const useGetBook = createAccessorQuery({ ... });
 *
 *   // use_get_book_reports.tsx
 *   const useGetBookReports = createAccessorQuery({ ... });
 *
 *   // BookReports.tsx
 *   const BookReports = ({ id }) => {
 *     const { data: book } = useGetBook({ id });
 *     const { data: bookReports } = useGetBookReports({ pageId: page.id });
 *     return <>{bookReports}</>;
 *   };
 *   ```
 */
export const createAccessorQuery = <QueryRequest, QueryResponse, Data>({
  cacheId,
  cacheSet,
  cacheGet,
  query,
}: {
  cacheId: (args: QueryRequest) => string;
  cacheSet: (args: {
    cacheId: string;
    request: (args: QueryRequest) => Promise<AccessorQueryResult<Data>>;
    response: { status: number; data: QueryResponse };
  }) => { data: Data };
  cacheGet: (args: {
    cacheId: string;
    args: QueryRequest;
  }) => AccessorQueryResult<Data> | null;
  query: (
    args: QueryRequest,
  ) => Promise<AccessorQueryRequestResponse<QueryResponse>>;
}): ((args: QueryRequest) => AccessorQueryResult<Data>) => {
  // Request cache.
  const requestMap = new Map();

  // Query request with caching support.
  const request = (args: QueryRequest): Promise<AccessorQueryResult<Data>> => {
    // Do we have an existing request in the cache?
    const cacheIdString = cacheId(args);
    const cachePromise = requestMap.get(cacheIdString);
    if (cachePromise) return cachePromise;

    // Execute query request.
    const promise = (async (): Promise<AccessorQueryResult<Data>> => {
      // Execute query.
      const response = await query(args);

      // Handle query errors.
      if (response.status !== 200 || response.error || !response.data) {
        throw new Error(
          `(${response.status}) Response failed${
            response.error ? `: ${response.error}` : ''
          }`,
        );
      }

      // Set query result cache.
      return cacheSet({
        cacheId: cacheIdString,
        request,
        response: { status: response.status, data: response.data },
      });
    })();

    // Cache query request.
    requestMap.set(cacheId, promise);

    return promise;
  };

  // Accessor hook query.
  return (args: QueryRequest): AccessorQueryResult<Data> => {
    // Do we have a cached result?
    const cacheIdString = cacheId(args);
    const cacheResult = cacheGet({ cacheId: cacheIdString, args });
    if (cacheResult) {
      return cacheResult;
    }

    // Tell suspense about promise to request backend data.
    const proxy = new Proxy(
      {},
      {
        get() {
          throw request(args);
        },
      },
    );

    // Since this is a proxy designed to request data on access treat this as the real thing.
    return proxy as AccessorQueryResult<Data>;
  };
};
