import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { json, stubApi } from '@/test/api';
import { renderAt } from '@/test/render';

beforeEach(() => {
  stubApi({ 'GET /api/event-types': () => json([]) });
});

describe('home page', () => {
  it('introduces the service and links to booking', async () => {
    renderAt('/');

    const main = await screen.findByRole('main');
    expect(within(main).getByRole('heading', { name: 'Call Calendar' })).toBeInTheDocument();
    expect(within(main).getByText(/pick a free time in the next 14 days/i)).toBeInTheDocument();
    expect(within(main).getByRole('link', { name: 'Book a call' })).toHaveAttribute(
      'href',
      '/book',
    );
  });

  it('opens the booking page from the hero button', async () => {
    renderAt('/');

    const main = await screen.findByRole('main');
    await userEvent.click(within(main).getByRole('link', { name: 'Book a call' }));

    expect(await screen.findByRole('heading', { name: 'Book a call' })).toBeInTheDocument();
  });
});

describe('navbar', () => {
  it('links to home, booking and admin', async () => {
    renderAt('/');

    const nav = await screen.findByRole('navigation');
    expect(within(nav).getByRole('link', { name: 'Call Calendar' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'Book a call' })).toHaveAttribute('href', '/book');
    expect(within(nav).getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('opens the admin page and marks its link as current', async () => {
    renderAt('/');

    const nav = await screen.findByRole('navigation');
    await userEvent.click(within(nav).getByRole('link', { name: 'Admin' }));

    expect(await screen.findByRole('heading', { name: 'Admin' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Admin' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
