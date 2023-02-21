import { createQueryConfiguration } from '../../test/accessor';
import { createComponent } from './create_component';

// Assert that we can create an accessor query hook.
jest.mock('./create_hook', () => ({
  createHook: jest.fn(),
}));

test('when creating an accessor query component, then an accessor query hook is created', async () => {
  // Given a accessor query configuration.
  const configuration = createQueryConfiguration({});

  // When creating an accessor query component.
  createComponent(configuration);

  // Then an accessor query hook is created.
  const { createHook } = jest.requireMock('./create_hook');
  expect(createHook).toHaveBeenCalledWith(configuration);
  expect(createHook).toHaveBeenCalledTimes(1);
});
