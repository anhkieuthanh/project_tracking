import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      if (
        url === '/project-tracking/_api/tasks' ||
        url === '/project-tracking/_api/reports' ||
        url === '/project-tracking/_api/employees' ||
        url === '/project-tracking/_api/ai-initiatives' ||
        url === '/project-tracking/_api/ai-initiatives/dashboard/summary'
      ) {
        if (url === '/project-tracking/_api/ai-initiatives/dashboard/summary') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              totals: { initiatives: 0, approvalBacklog: 0, nearingDeadline: 0 },
              byStage: [],
              byDecision: [],
              byOwner: [],
              nearingDeadline: []
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

  it('renders AI lifecycle title and loads initial tabs', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Website quản lý vòng đời AI doanh nghiệp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tuần hiện tại' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lịch sử' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vòng đời AI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dashboard điều hành' })).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/project-tracking/_api/tasks', expect.anything());
      expect(global.fetch).toHaveBeenCalledWith('/project-tracking/_api/reports', expect.anything());
      expect(global.fetch).toHaveBeenCalledWith('/project-tracking/_api/employees', expect.anything());
      expect(global.fetch).toHaveBeenCalledWith('/project-tracking/_api/ai-initiatives', expect.anything());
      expect(global.fetch).toHaveBeenCalledWith(
        '/project-tracking/_api/ai-initiatives/dashboard/summary',
        expect.anything()
      );
    });
  });
});
