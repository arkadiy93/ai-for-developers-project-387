import {
  createRootRoute,
  createRoute,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router';
import { AdminPage } from '@/pages/AdminPage';
import { BookPage } from '@/pages/BookPage';
import { HomePage } from '@/pages/HomePage';
import { RootLayout } from '@/pages/RootLayout';

const rootRoute = createRootRoute({ component: RootLayout });

const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/book', component: BookPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: AdminPage }),
]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
