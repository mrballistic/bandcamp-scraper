import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExportControls from './ExportControls';
import { PurchaseRow } from '../types/bandcamp';

const sampleRows: PurchaseRow[] = [
  {
    purchaseKey: 'a:1:date',
    purchaseDate: '2024-01-01',
    itemType: 'album',
    itemId: 1,
    title: 'Album One',
    artist: 'Artist One',
    itemUrl: 'https://bandcamp.com/album/one',
    artUrl: 'https://f4.bcbits.com/img/a1_10.jpg',
    isPreorder: false,
    preorderStatus: 'released',
    isHidden: false,
  },
];

describe('ExportControls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a CSV download when clicking CSV', () => {
    const createObjectURL = vi.fn(() => 'blob:csv') as unknown as typeof URL.createObjectURL;
    vi.stubGlobal('URL', { ...(global.URL as unknown as typeof URL), createObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    render(<ExportControls rows={sampleRows} />);

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('creates a JSON download when clicking JSON', () => {
    const createObjectURL = vi.fn(() => 'blob:json') as unknown as typeof URL.createObjectURL;
    vi.stubGlobal('URL', { ...(global.URL as unknown as typeof URL), createObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    render(<ExportControls rows={sampleRows} />);

    fireEvent.click(screen.getByRole('button', { name: /json/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
