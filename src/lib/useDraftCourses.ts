/**
 * useDraftCourses — localStorage-backed course draft management for Pro users.
 *
 * Tier limits:
 *   - Free (unauthenticated): 0 drafts
 *   - Pro (authenticated):    MAX_PRO_DRAFTS = 3 drafts
 *
 * Storage key: "nexcourse_drafts_v1_<userId>"  (per-user, scoped to device)
 * Each draft stores a full course JSON snapshot + metadata.
 */

import { useState, useCallback, useEffect } from 'react';

export const MAX_PRO_DRAFTS = 3;
const STORAGE_PREFIX = 'nexcourse_drafts_v1_';

export interface CourseDraft {
  id: string;          // unique draft id (uuid-ish)
  savedAt: string;     // ISO 8601
  courseTitle: string;
  slideCount: number;
  moduleCount: number;
  theme: string;
  courseSnapshot: string; // JSON.stringify of the full course + player config
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function readDrafts(userId: string): CourseDraft[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDrafts(userId: string, drafts: CourseDraft[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(drafts));
  } catch (e) {
    console.error('[DraftCourses] Failed to write to localStorage:', e);
  }
}

function makeDraftId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface UseDraftCoursesReturn {
  drafts: CourseDraft[];
  canSave: boolean;         // true when user is authenticated and under limit
  slotsUsed: number;
  slotsTotal: number;
  saveDraft: (course: any, playerConfig: any, theme: string) => { success: boolean; message: string };
  loadDraft: (id: string) => { course: any; playerConfig: any; theme: string } | null;
  deleteDraft: (id: string) => void;
  replaceDraft: (id: string, course: any, playerConfig: any, theme: string) => void;
}

export function useDraftCourses(userId: string | null): UseDraftCoursesReturn {
  const [drafts, setDrafts] = useState<CourseDraft[]>(() =>
    userId ? readDrafts(userId) : []
  );

  // Re-read when userId changes (login/logout)
  useEffect(() => {
    setDrafts(userId ? readDrafts(userId) : []);
  }, [userId]);

  const slotsTotal = userId ? MAX_PRO_DRAFTS : 0;
  const slotsUsed = drafts.length;
  const canSave = !!userId && slotsUsed < slotsTotal;

  const saveDraft = useCallback((course: any, playerConfig: any, theme: string): { success: boolean; message: string } => {
    if (!userId) return { success: false, message: 'Sign in to save drafts.' };
    if (slotsUsed >= MAX_PRO_DRAFTS) {
      return {
        success: false,
        message: `You've used all ${MAX_PRO_DRAFTS} draft slots. Delete an existing draft to save a new one.`,
      };
    }
    const draft: CourseDraft = {
      id: makeDraftId(),
      savedAt: new Date().toISOString(),
      courseTitle: course.title || 'Untitled Course',
      slideCount: (course.modules || []).reduce((a: number, m: any) => a + (m.slides?.length || 0), 0),
      moduleCount: (course.modules || []).length,
      theme,
      courseSnapshot: JSON.stringify({ course, playerConfig, theme }),
    };
    const next = [...drafts, draft];
    writeDrafts(userId, next);
    setDrafts(next);
    return { success: true, message: `Draft "${draft.courseTitle}" saved!` };
  }, [userId, drafts, slotsUsed]);

  const loadDraft = useCallback((id: string) => {
    if (!userId) return null;
    const draft = drafts.find(d => d.id === id);
    if (!draft) return null;
    try {
      return JSON.parse(draft.courseSnapshot);
    } catch {
      return null;
    }
  }, [userId, drafts]);

  const deleteDraft = useCallback((id: string) => {
    if (!userId) return;
    const next = drafts.filter(d => d.id !== id);
    writeDrafts(userId, next);
    setDrafts(next);
  }, [userId, drafts]);

  const replaceDraft = useCallback((id: string, course: any, playerConfig: any, theme: string) => {
    if (!userId) return;
    const next = drafts.map(d => {
      if (d.id !== id) return d;
      return {
        ...d,
        savedAt: new Date().toISOString(),
        courseTitle: course.title || 'Untitled Course',
        slideCount: (course.modules || []).reduce((a: number, m: any) => a + (m.slides?.length || 0), 0),
        moduleCount: (course.modules || []).length,
        theme,
        courseSnapshot: JSON.stringify({ course, playerConfig, theme }),
      };
    });
    writeDrafts(userId, next);
    setDrafts(next);
  }, [userId, drafts]);

  return { drafts, canSave, slotsUsed, slotsTotal, saveDraft, loadDraft, deleteDraft, replaceDraft };
}
