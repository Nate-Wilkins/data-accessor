// eslint-disable-next-line @typescript-eslint/no-var-requires
const { cleanup, configure } = require('@testing-library/react');
require('@testing-library/jest-dom');

configure({
  asyncUtilTimeout: 1000,
  // https://github.com/testing-library/dom-testing-library/issues/552
  defaultHidden: true,
});

// Mock timers.
jest.useFakeTimers();
jest.setSystemTime(new Date('4/10/1994'));
jest.spyOn(global, 'setTimeout');
jest.spyOn(global, 'setInterval');

afterEach(() => {
  cleanup();
});
