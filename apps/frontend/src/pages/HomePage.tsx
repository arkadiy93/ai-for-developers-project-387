import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';

export function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Call Calendar</h1>
      <p className="text-muted-foreground max-w-md text-lg">
        Choose a type of call, pick a free time in the next 14 days, and book it. No sign-up needed.
      </p>
      <Link to="/book" className={buttonVariants({ size: 'lg' })}>
        Book a call
      </Link>
    </main>
  );
}
