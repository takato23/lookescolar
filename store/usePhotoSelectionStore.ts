'use client';

import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

export interface PhotoSelectionStudent {
  id: string;
  name: string;
}

export interface PhotoSelectionItem {
  id: string;
  /**
   * Optional original filename for quick identification.
   */
  filename?: string;
  /**
   * Signed thumbnail-sized URL for grid previews.
   */
  thumbnailUrl?: string | null;
  /**
   * Higher resolution preview URL for hover or modal use.
   */
  previewUrl?: string | null;
  /**
   * Folder identifier the asset belongs to, when available.
   */
  folderId?: string | null;
  /**
   * Human friendly folder name (album).
   */
  folderName?: string | null;
  /**
   * Tagged students (subjects) linked to the photo.
   */
  students?: PhotoSelectionStudent[];
  /**
   * Arbitrary metadata consumers might store (lightweight).
   */
  metadata?: Record<string, unknown>;
  /**
   * Originator of the selection action. Useful for analytics/debug.
   */
  source?: 'manager' | 'wizard';
  /**
   * Timestamp (ms) when the selection was created.
   */
  addedAt: number;
  /**
   * Timestamp (ms) when metadata was last refreshed.
   */
  updatedAt: number;
}

type SelectionMap = Record<string, PhotoSelectionItem>;

interface PhotoSelectionState {
  /**
   * Selection map keyed by eventId, then photoId.
   */
  selections: Record<string, SelectionMap>;
  /**
   * Cached sorted list of selections per event.
   */
  selectionLists: Record<string, PhotoSelectionItem[]>;
  /**
   * Cached list of ids per event.
   */
  selectionIds: Record<string, string[]>;
  /**
   * Replace entire selection for an event.
   */
  setSelection: (eventId: string, items: PhotoSelectionItem[]) => void;
  /**
   * Upsert (merge) one or more photos into the selection.
   */
  upsertPhotos: (
    eventId: string,
    items: Array<
      Omit<PhotoSelectionItem, 'addedAt' | 'updatedAt'> & Partial<Pick<PhotoSelectionItem, 'addedAt' | 'updatedAt'>>
    >,
    source?: PhotoSelectionItem['source']
  ) => void;
  /**
   * Remove multiple photos by id.
   */
  removePhotos: (eventId: string, photoIds: string[]) => void;
  /**
   * Clear stored selection for event.
   */
  clearSelection: (eventId: string) => void;
  /**
   * Update metadata for a specific photo.
   */
  updateMetadata: (eventId: string, photoId: string, patch: Partial<PhotoSelectionItem>) => void;
}

export function getSelectionForEvent(state: PhotoSelectionState, eventId: string): PhotoSelectionItem[] {
  return state.selectionLists[eventId] ?? EMPTY_SELECTION_ARRAY;
}
function ensureEventMap(state: PhotoSelectionState, eventId: string): SelectionMap {
  return state.selections[eventId] ?? {};
}

const EMPTY_SELECTION_MAP: SelectionMap = Object.freeze({}) as SelectionMap;
const EMPTY_SELECTION_ARRAY: PhotoSelectionItem[] = Object.freeze([]) as PhotoSelectionItem[];
const EMPTY_SELECTION_IDS: string[] = Object.freeze([]) as string[];

function sortSelectionMap(map: SelectionMap): PhotoSelectionItem[] {
  return Object.values(map).sort((a, b) => {
    if (a.addedAt === b.addedAt) {
      return a.id.localeCompare(b.id);
    }
    return a.addedAt - b.addedAt;
  });
}

function buildArtifacts(map: SelectionMap) {
  if (Object.keys(map).length === 0) {
    return {
      list: EMPTY_SELECTION_ARRAY,
      ids: EMPTY_SELECTION_IDS,
    };
  }
  const list = sortSelectionMap(map);
  const ids = list.map((item) => item.id);
  return {
    list,
    ids,
  };
}

export const usePhotoSelectionStore = create<PhotoSelectionState>((set, get) => ({
  selections: {},
  selectionLists: {},
  selectionIds: {},

  setSelection: (eventId, items) => {
    const nextMap: SelectionMap = {};
    const timestamp = Date.now();
    items.forEach((item) => {
      const now = item.addedAt ?? timestamp;
      nextMap[item.id] = {
        ...item,
        addedAt: now,
        updatedAt: item.updatedAt ?? now,
      };
    });

    const { list, ids } = buildArtifacts(nextMap);

    set((state) => ({
      selections: {
        ...state.selections,
        [eventId]: nextMap,
      },
      selectionLists: {
        ...state.selectionLists,
        [eventId]: list,
      },
      selectionIds: {
        ...state.selectionIds,
        [eventId]: ids,
      },
    }));
  },

  upsertPhotos: (eventId, items, source) => {
    if (items.length === 0) return;
    const timestamp = Date.now();

    set((state) => {
      const current = { ...ensureEventMap(state, eventId) };
      for (const item of items) {
        const existing = current[item.id];
        const addedAt = item.addedAt ?? existing?.addedAt ?? timestamp;
        current[item.id] = {
          ...existing,
          ...item,
          source: source ?? item.source ?? existing?.source,
          addedAt,
          updatedAt: item.updatedAt ?? timestamp,
        };
      }

      const { list, ids } = buildArtifacts(current);

      return {
        selections: {
          ...state.selections,
          [eventId]: current,
        },
        selectionLists: {
          ...state.selectionLists,
          [eventId]: list,
        },
        selectionIds: {
          ...state.selectionIds,
          [eventId]: ids,
        },
      };
    });
  },

  removePhotos: (eventId, photoIds) => {
    if (photoIds.length === 0) return;
    set((state) => {
      const current = ensureEventMap(state, eventId);
      if (Object.keys(current).length === 0) {
        return state;
      }
      const next: SelectionMap = {};
      let modified = false;
      for (const [id, item] of Object.entries(current)) {
        if (photoIds.includes(id)) {
          modified = true;
          continue;
        }
        next[id] = item;
      }
      if (!modified) return state;
      const selections = { ...state.selections };
      const selectionLists = { ...state.selectionLists };
      const selectionIds = { ...state.selectionIds };
      if (Object.keys(next).length === 0) {
        delete selections[eventId];
        delete selectionLists[eventId];
        delete selectionIds[eventId];
      } else {
        selections[eventId] = next;
        const { list, ids } = buildArtifacts(next);
        selectionLists[eventId] = list;
        selectionIds[eventId] = ids;
      }
      return {
        selections,
        selectionLists,
        selectionIds,
      };
    });
  },

  clearSelection: (eventId) => {
    set((state) => {
      if (!state.selections[eventId]) return state;
      const selections = { ...state.selections };
      const selectionLists = { ...state.selectionLists };
      const selectionIds = { ...state.selectionIds };
      delete selections[eventId];
      delete selectionLists[eventId];
      delete selectionIds[eventId];
      return {
        selections,
        selectionLists,
        selectionIds,
      };
    });
  },

  updateMetadata: (eventId, photoId, patch) => {
    set((state) => {
      const current = ensureEventMap(state, eventId);
      const existing = current[photoId];
      if (!existing) return state;
      const next: SelectionMap = {
        ...current,
        [photoId]: {
          ...existing,
          ...patch,
          updatedAt: patch.updatedAt ?? Date.now(),
        },
      };
      const { list, ids } = buildArtifacts(next);

      return {
        selections: {
          ...state.selections,
          [eventId]: next,
        },
        selectionLists: {
          ...state.selectionLists,
          [eventId]: list,
        },
        selectionIds: {
          ...state.selectionIds,
          [eventId]: ids,
        },
      };
    });
  },

}));

export const selectionConstants = {
  EMPTY_SELECTION_MAP,
  EMPTY_SELECTION_ARRAY,
} as const;

export const selectionSelectors = {
  mapByEvent: (eventId: string) => (state: PhotoSelectionState) =>
    state.selections[eventId] ?? EMPTY_SELECTION_MAP,
  sortedByEvent: (eventId: string) => (state: PhotoSelectionState) =>
    state.selectionLists[eventId] ?? EMPTY_SELECTION_ARRAY,
  idsByEvent: (eventId: string) => (state: PhotoSelectionState) =>
    state.selectionIds[eventId] ?? EMPTY_SELECTION_IDS,
};

export const selectionShallow = shallow;
