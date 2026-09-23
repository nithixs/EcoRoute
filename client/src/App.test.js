import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';
jest.mock('./components/Map', () => () => <div data-testid="map">Map</div>);
beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      ai: false
    })
  });
});
test('planner is accessible and saved trips has an empty state', async () => {
  await act(async () => {
    render(<App />);
  });
  expect(screen.getByRole('heading', {
    name: 'Your journey. A little greener.'
  })).toBeInTheDocument();
  expect(screen.getByRole('button', {
    name: /Find greener routes/
  })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', {
    name: /Saved trips 0/
  }));
  expect(screen.getByText('A journey worth keeping')).toBeInTheDocument();
});
test('editing selected city keeps typed query and requires a new selection', async () => {
  await act(async () => {
    render(<App />);
  });
  const input = screen.getByLabelText('STARTING POINT');
  fireEvent.change(input, {
    target: {
      value: 'Madurai'
    }
  });
  expect(input).toHaveValue('Madurai');
  expect(screen.getByRole('button', {
    name: /Find greener routes/
  })).toBeDisabled();
});
test('routing error is shown and retry becomes available', async () => {
  global.fetch.mockImplementation(url => Promise.resolve({
    ok: url.includes('health'),
    json: async () => url.includes('health') ? {
      ai: false
    } : {
      error: 'No driving route connects these places.'
    }
  }));
  render(<App />);
  fireEvent.click(screen.getByRole('button', {
    name: /Find greener routes/
  }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No driving route'));
  expect(screen.getByRole('button', {
    name: /Find greener routes/
  })).toBeEnabled();
});
