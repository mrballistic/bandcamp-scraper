import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScrapeControls from './ScrapeControls';
import { ScrapeProgress } from '../types/bandcamp';

const baseProgress: ScrapeProgress = {
  status: 'idle',
  itemsFetched: 0,
  pagesFetched: 0,
};

describe('ScrapeControls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('disables scraping when cookie input is empty', () => {
    render(
      <ScrapeControls
        onStart={vi.fn()}
        onReset={vi.fn()}
        progress={baseProgress}
      />
    );

    expect(screen.getByRole('button', { name: /scrape/i })).toBeDisabled();
  });

  it('calls onStart with the trimmed cookie value when provided', () => {
    const onStart = vi.fn();

    render(
      <ScrapeControls
        onStart={onStart}
        onReset={vi.fn()}
        progress={baseProgress}
      />
    );

    const input = screen.getByLabelText(/Bandcamp Identity Cookie/i);
    fireEvent.change(input, { target: { value: '  identity=abc; session=xyz  ' } });

    const scrapeButton = screen.getByRole('button', { name: /scrape/i });
    expect(scrapeButton).not.toBeDisabled();

    fireEvent.click(scrapeButton);

    expect(onStart).toHaveBeenCalledWith('identity=abc; session=xyz', '');
  });
});
