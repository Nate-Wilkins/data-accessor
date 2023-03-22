import { ConfigurationQuery } from './types';

/**
 * Validate configuration.
 */
export const validateConfiguration = <TQueryRequest, TQueryResponse, TData>(
  configuration: ConfigurationQuery<TQueryRequest, TQueryResponse, TData>,
) => {
  if (typeof configuration.debug !== 'undefined') {
    if (typeof configuration.debug !== 'boolean') {
      throw new Error('Invalid `debug` value. Must be a boolean.');
    }
  }
  if (typeof configuration.cache !== 'object') {
    throw new Error('Invalid `cache` value. Must be an object.');
  }

  if (typeof configuration.cache.limit !== 'undefined') {
    if (typeof configuration.cache.limit !== 'number') {
      throw new Error('Invalid `cache.limit` value. Must be a number.');
    }
  }

  if (typeof configuration.cache.ttl !== 'number') {
    throw new Error('Invalid `cache.ttl` value. Must be a number.');
  }
  if (configuration.cache.ttl <= 0) {
    throw new Error(
      'Invalid `cache.ttl` value. Must be an integer greater than zero.',
    );
  }
  if (typeof configuration.cache.isPrimable !== 'undefined') {
    if (typeof configuration.cache.isPrimable !== 'boolean') {
      throw new Error('Invalid `cache.isPrimable` value. Must be a boolean.');
    }
  }
  if (typeof configuration.cache.id !== 'function') {
    throw new Error('Invalid `cache.id` value. Must be a function.');
  }
  if (typeof configuration.cache.get !== 'function') {
    throw new Error('Invalid `cache.get` value. Must be a function.');
  }
  if (typeof configuration.cache.set !== 'function') {
    throw new Error('Invalid `cache.set` value. Must be a function.');
  }
  if (typeof configuration.cache.clear !== 'function') {
    throw new Error('Invalid `cache.clear` value. Must be a function.');
  }
  if (typeof configuration.cache.invalidate !== 'undefined') {
    if (typeof configuration.cache.invalidate !== 'object') {
      throw new Error('Invalid `cache.invalidate` value. Must be an object.');
    }
    if (typeof configuration.cache.invalidate.auto !== 'undefined') {
      if (typeof configuration.cache.invalidate.auto !== 'object') {
        throw new Error(
          'Invalid `cache.invalidate.auto` value. Must be an object.',
        );
      }
      if (typeof configuration.cache.invalidate.auto.enable !== 'boolean') {
        throw new Error(
          'Invalid `cache.invalidate.auto.enable` value. Must be a boolean.',
        );
      }
      if (typeof configuration.cache.invalidate.auto.ttl !== 'undefined') {
        if (typeof configuration.cache.invalidate.auto.ttl !== 'number') {
          throw new Error(
            'Invalid `cache.invalidate.auto.ttl` value. Must be a number.',
          );
        }
        if (configuration.cache.invalidate.auto.ttl <= 0) {
          throw new Error(
            'Invalid `cache.invalidate.auto.ttl` value. Must be an integer greater than zero.',
          );
        }
      }
      // TODO:
      // if (
      //   typeof configuration.cache.invalidate.auto.showLoading !== 'undefined'
      // ) {
      //   if (
      //     typeof configuration.cache.invalidate.auto.showLoading !== 'boolean'
      //   ) {
      //     throw new Error(
      //       'Invalid `cache.invalidate.auto.showLoading` value. Must be a boolean.',
      //     );
      //   }
      // }
    }
  }

  //TODO:
  // if (typeof configuration.constraints !== 'undefined') {
  //   if (typeof configuration.constraints !== 'object') {
  //     throw new Error('Invalid `constraints` value. Must be an object.');
  //   }
  //   if (typeof configuration.constraints.enforce !== 'undefined') {
  //     if (typeof configuration.constraints.enforce !== 'boolean') {
  //       throw new Error(
  //         'Invalid `constraints.enforce` value. Must be a boolean.',
  //       );
  //     }
  //   }
  //   if (typeof configuration.constraints.maxDelay !== 'undefined') {
  //     if (typeof configuration.constraints.maxDelay !== 'number') {
  //       throw new Error(
  //         'Invalid `constraints.maxDelay` value. Must be a number.',
  //       );
  //     }
  //     if (configuration.constraints.maxDelay <= 0) {
  //       throw new Error(
  //         'Invalid `constraints.maxDelay` value. Must be an integer greater than zero.',
  //       );
  //     }
  //   }
  // }

  if (typeof configuration.suspense !== 'undefined') {
    if (typeof configuration.suspense.cache !== 'object') {
      throw new Error('Invalid `suspense.cache` value. Must be an object.');
    }
    if (typeof configuration.suspense.cache.set !== 'function') {
      throw new Error(
        'Invalid `suspense.cache.set` value. Must be a function.',
      );
    }
    if (typeof configuration.suspense.cache.get !== 'function') {
      throw new Error(
        'Invalid `suspense.cache.get` value. Must be a function.',
      );
    }
  }

  if (typeof configuration.queryRequest !== 'function') {
    throw new Error('Invalid `queryRequest` value. Must be a function.');
  }
};
