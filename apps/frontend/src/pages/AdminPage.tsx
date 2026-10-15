import { EventTypesPanel } from '@/components/EventTypesPanel';
import { UpcomingBookings } from '@/components/UpcomingBookings';

export function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
        <UpcomingBookings />
        <aside>
          <EventTypesPanel />
        </aside>
      </div>
    </main>
  );
}
