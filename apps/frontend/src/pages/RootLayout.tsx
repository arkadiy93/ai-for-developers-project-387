import { Link, Outlet } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const activeLink = 'data-[status=active]:underline data-[status=active]:underline-offset-4';

export function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-semibold">
            Call Calendar
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/book" className={cn(buttonVariants(), activeLink)}>
              Book a call
            </Link>
            <Link to="/admin" className={cn(buttonVariants({ variant: 'ghost' }), activeLink)}>
              Admin
            </Link>
          </div>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
