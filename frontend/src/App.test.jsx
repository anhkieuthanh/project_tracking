import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      if (
        url === '/project-tracking/_api/tasks' ||
        url === '/project-tracking/_api/tasks/categories' ||
        url === '/project-tracking/_api/reports' ||
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
              byProposer: [],
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

  it('renders grouped menu and loads initial dashboards', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Website quản lý vòng đời AI doanh nghiệp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Dashboard' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Công việc tuần hiện tại' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lịch sử' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Danh sách dự án' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo dự án mới' })).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/project-tracking/_api/tasks', expect.anything());
      expect(global.fetch).toHaveBeenCalledWith('/project-tracking/_api/tasks/categories', expect.anything());
      expect(global.fetch).toHaveBeenCalledWith('/project-tracking/_api/reports', expect.anything());
      expect(global.fetch).toHaveBeenCalledWith('/project-tracking/_api/ai-initiatives', expect.anything());
      expect(global.fetch).toHaveBeenCalledWith(
        '/project-tracking/_api/ai-initiatives/dashboard/summary',
        expect.anything()
      );
    });
  });
});
