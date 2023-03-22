import { createQueryConfiguration } from '../../test/accessor';
import { createComponent } from './create_component';

// Assert that we can create an accessor query.
jest.mock('./create_hook', () => ({
  createHook: jest.fn(() => ({})),
}));

test('when creating an accessor query hook, then an accessor query is created', async () => {
  // Given a accessor query configuration.
  const configuration = createQueryConfiguration({});

  // When creating an accessor query hook.
  createComponent(configuration);

  // Then an accessor query is created.
  const { createHook } = jest.requireMock('./create_hook');
  expect(createHook).toHaveBeenCalledTimes(1);
  expect(createHook).toHaveBeenNthCalledWith(1, configuration);
});
