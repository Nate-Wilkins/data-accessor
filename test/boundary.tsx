import { render } from '@testing-library/react/pure';
import {
  default as React,
  FunctionComponent,
  ReactNode,
  Suspense,
} from 'react';
import { useErrorBoundary } from 'use-error-boundary';

/*
 * Render a self contained component with a `Boundary` baked in.
 */
export const renderBoundary = (component: ReactNode) => {
  const Controller: FunctionComponent<{ children: ReactNode }> = ({
    children,
  }) => {
    const { ErrorBoundary } = useErrorBoundary();

    return (
      <ErrorBoundary
        renderError={({ error }) => (
          <span>{`${error.message} ${error.stack}`}</span>
        )}
      >
        <Suspense fallback={<span>Loading...</span>}>{children}</Suspense>
      </ErrorBoundary>
    );
  };

  return render(<Controller>{component}</Controller>);
};
