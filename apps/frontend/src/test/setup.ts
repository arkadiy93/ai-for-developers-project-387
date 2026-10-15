import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollTo; TanStack Router calls it on navigation.
window.scrollTo = () => {};
