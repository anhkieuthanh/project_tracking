import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      if (
        url === '/tasks' ||
        url === '/reports' ||
        url === '/employees' ||
        url === '/ai-projects' ||
        url === '/ai-projects/dashboard/summary'
      ) {
        if (url === '/ai-projects/dashboard/summary') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              kpi: { total: 0, inProgress: 0, completed: 0, paused: 0 },
              byStatus: [],
              byEmployee: []
            })
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => []
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({})
      });
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders weekly tracking title and loads initial tabs', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Theo dõi công việc và dự án AI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tuần hiện tại' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lịch sử' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dự án AI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Báo cáo AI' })).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/tasks');
      expect(global.fetch).toHaveBeenCalledWith('/reports');
      expect(global.fetch).toHaveBeenCalledWith('/employees');
      expect(global.fetch).toHaveBeenCalledWith('/ai-projects');
      expect(global.fetch).toHaveBeenCalledWith('/ai-projects/dashboard/summary');
    });
  });
});
