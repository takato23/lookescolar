import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePhotoSelection } from '@/components/admin/photo-admin/hooks/usePhotoSelection';

describe('usePhotoSelection', () => {
  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => usePhotoSelection());

    expect(result.current.selectedPhotos.size).toBe(0);
    expect(result.current.isSelectionMode).toBe(false);
    expect(result.current.lastSelectedIndex).toBeNull();
  });

  it('should toggle photo selection', () => {
    const { result } = renderHook(() => usePhotoSelection());

    act(() => {
      result.current.toggleSelection('photo1');
    });

    expect(result.current.selectedPhotos.has('photo1')).toBe(true);

    act(() => {
      result.current.toggleSelection('photo1');
    });

    expect(result.current.selectedPhotos.has('photo1')).toBe(false);
  });

  it('should select photo', () => {
    const { result } = renderHook(() => usePhotoSelection());

    act(() => {
      result.current.selectPhoto('photo1');
    });

    expect(result.current.selectedPhotos.has('photo1')).toBe(true);
  });

  it('should deselect photo', () => {
    const { result } = renderHook(() => usePhotoSelection());

    act(() => {
      result.current.selectPhoto('photo1');
      result.current.deselectPhoto('photo1');
    });

    expect(result.current.selectedPhotos.has('photo1')).toBe(false);
  });

  it('should select all photos', () => {
    const { result } = renderHook(() => usePhotoSelection());
    const photoIds = ['photo1', 'photo2', 'photo3'];

    act(() => {
      result.current.selectAll(photoIds);
    });

    expect(result.current.selectedPhotos.size).toBe(3);
    photoIds.forEach((id) => {
      expect(result.current.selectedPhotos.has(id)).toBe(true);
    });
  });

  it('should clear selection', () => {
    const { result } = renderHook(() => usePhotoSelection());

    act(() => {
      result.current.selectPhoto('photo1');
      result.current.selectPhoto('photo2');
      result.current.clearSelection();
    });

    expect(result.current.selectedPhotos.size).toBe(0);
  });

  it('should toggle selection mode', () => {
    const { result } = renderHook(() => usePhotoSelection());

    expect(result.current.isSelectionMode).toBe(false);

    act(() => {
      result.current.toggleSelectionMode();
    });

    expect(result.current.isSelectionMode).toBe(true);
  });

  it('should select range', () => {
    const { result } = renderHook(() => usePhotoSelection());
    const photos = [{ id: 'photo1' }, { id: 'photo2' }, { id: 'photo3' }];

    act(() => {
      result.current.selectRange(0, 2, photos);
    });

    expect(result.current.selectedPhotos.size).toBe(3);
  });
});














