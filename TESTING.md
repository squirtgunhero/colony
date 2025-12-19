# Testing Guide

This project uses **Vitest** for unit/integration tests and **Playwright** for end-to-end (E2E) tests.

## Test Structure

```
├── src/
│   ├── test/
│   │   ├── setup.ts          # Test setup and configuration
│   │   └── test-utils.tsx    # Custom render utilities with providers
│   ├── components/
│   │   └── **/*.test.tsx     # Component tests
│   └── lib/
│       └── **/*.test.ts      # Utility function tests
└── e2e/
    └── **/*.spec.ts          # E2E tests
```

## Running Tests

### Unit/Integration Tests (Vitest)

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

## Writing Tests

### Component Tests

Use React Testing Library for component tests. Example:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### E2E Tests

Use Playwright for E2E tests. Example:

```ts
import { test, expect } from '@playwright/test';

test('should navigate to dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/.*dashboard/);
});
```

## Test Utilities

### Custom Render

For components that need providers (Clerk, Theme, etc.), use the custom render from `@/test/test-utils`:

```tsx
import { render } from '@/test/test-utils';
import { MyComponent } from './my-component';

test('renders with providers', () => {
  render(<MyComponent />);
  // Test your component
});
```

## Configuration Files

- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `src/test/setup.ts` - Global test setup

## Best Practices

1. **Test behavior, not implementation** - Focus on what users see and do
2. **Keep tests simple** - One assertion per test when possible
3. **Use descriptive test names** - They should describe what the test verifies
4. **Mock external dependencies** - Use mocks for API calls, authentication, etc.
5. **Test edge cases** - Don't just test the happy path

## Example Test Files

- `src/components/ui/button.test.tsx` - Component test example
- `src/lib/utils.test.ts` - Utility function test example
- `e2e/example.spec.ts` - E2E test example

