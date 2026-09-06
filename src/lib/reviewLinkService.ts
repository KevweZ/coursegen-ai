/**
 * Temporary SME review links.
 * Snapshot lives in private Supabase storage; the public URL is /review/:token.
 * No AI/TTS is called when a reviewer opens the link.
 */

import { supabase } from './supabaseClient';
import { ROUTES } from './routes';

export const REVIEW_TTL_DAYS = 14;
const MAX_SNAPSHOT_BYTES = 48 * 1024 * 1024;

export interface ReviewLinkMeta {
  token: string;
  courseTitle: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  ready?: boolean;
}

export interface ReviewSnapshot {
  v: 1;
  course: any;
  playerConfig: any;
  theme: string;
  navigationMode: string;
  requireInteractionsComplete: boolean;
  voiceOverEnabled: boolean;
  learningObjectives?: any;
  syntheticSlideOverrides?: Record<string, any>;
  syntheticAudioMap?: Record<string, string>;
  examQuestions?: any[];
  examConfig?: any;
  includeModuleOverviewSlides?: boolean;
  includeModuleTitleSlides?: boolean;
  includeSummarySlides?: boolean;
  imageMode?: string;
  processSkin?: string;
  processShowStepLabels?: boolean;
  verticalTabSkin?: string;
  verticalTabColorMode?: string;
  verticalTabUnifyColor?: string;
  verticalTabWellColor?: string;
  floatingImagesMap?: Record<string, any>;
}

function apiBase(): string {
  return String((import.meta as any).env?.VITE_API_BASE ?? '').replace(/\/$/, '');
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in to create a review link.');
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type') && !(init.body instanceof Blob) && !(init.body instanceof ArrayBuffer)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${apiBase()}${path}`, { ...init, headers });
}

function readError(data: any, fallback: string): string {
  return (typeof data?.error === 'string' && data.error) || fallback;
}

export function reviewShareUrl(token: string): string {
  if (typeof window === 'undefined') return ROUTES.review(token);
  return `${window.location.origin}${ROUTES.review(token)}`;
}

async function gzipBytes(bytes: Uint8Array): Promise<Uint8Array | null> {
  const CS = (globalThis as any).CompressionStream;
  if (typeof CS !== 'function') return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CS('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function gunzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as any).DecompressionStream;
  if (typeof DS !== 'function') return bytes;
  const stream = new Blob([bytes]).stream().pipeThrough(new DS('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

export async function buildReviewSnapshot(input: {
  course: any;
  playerConfig: any;
  theme: string;
  navigationMode: string;
  requireInteractionsComplete: boolean;
  voiceOverEnabled: boolean;
  learningObjectives?: any;
  syntheticSlideOverrides?: Record<string, any>;
  syntheticAudioMap?: Record<string, string>;
  examQuestions?: any[];
  examConfig?: any;
  includeModuleOverviewSlides?: boolean;
  includeModuleTitleSlides?: boolean;
  includeSummarySlides?: boolean;
  imageMode?: string;
  processSkin?: string;
  processShowStepLabels?: boolean;
  verticalTabSkin?: string;
  verticalTabColorMode?: string;
  verticalTabUnifyColor?: string;
  verticalTabWellColor?: string;
  floatingImagesMap?: Record<string, any>;
}): Promise<ReviewSnapshot> {
  let course: any;
  try {
    course = typeof structuredClone === 'function'
      ? structuredClone(input.course)
      : JSON.parse(JSON.stringify(input.course));
  } catch {
    course = JSON.parse(JSON.stringify(input.course));
  }

  try {
    const { persistCourseAudioUrls, persistSyntheticAudioMap } = await import('../services/ttsService');
    course = await persistCourseAudioUrls(course);
    const synth = await persistSyntheticAudioMap(input.syntheticAudioMap || {});
    if (Array.isArray(input.examQuestions) && input.examQuestions.length) {
      course.examQuestions = input.examQuestions;
    }
    return {
      v: 1,
      course,
      playerConfig: input.playerConfig,
      theme: input.theme,
      navigationMode: input.navigationMode || input.playerConfig?.navigationMode || 'free',
      requireInteractionsComplete: !!input.requireInteractionsComplete,
      voiceOverEnabled: !!input.voiceOverEnabled,
      learningObjectives: input.learningObjectives,
      syntheticSlideOverrides: input.syntheticSlideOverrides,
      syntheticAudioMap: synth,
      examQuestions: input.examQuestions,
      examConfig: input.examConfig,
      includeModuleOverviewSlides: input.includeModuleOverviewSlides,
      includeModuleTitleSlides: input.includeModuleTitleSlides,
      includeSummarySlides: input.includeSummarySlides,
      imageMode: input.imageMode,
      processSkin: input.processSkin,
      processShowStepLabels: input.processShowStepLabels,
      verticalTabSkin: input.verticalTabSkin,
      verticalTabColorMode: input.verticalTabColorMode,
      verticalTabUnifyColor: input.verticalTabUnifyColor,
      verticalTabWellColor: input.verticalTabWellColor,
      floatingImagesMap: input.floatingImagesMap,
    };
  } catch (e) {
    console.warn('[ReviewLink] Audio persist failed; continuing without blob audio', e);
    return {
      v: 1,
      course,
      playerConfig: input.playerConfig,
      theme: input.theme,
      navigationMode: input.navigationMode || input.playerConfig?.navigationMode || 'free',
      requireInteractionsComplete: !!input.requireInteractionsComplete,
      voiceOverEnabled: !!input.voiceOverEnabled,
      learningObjectives: input.learningObjectives,
      syntheticSlideOverrides: input.syntheticSlideOverrides,
      syntheticAudioMap: input.syntheticAudioMap,
      examQuestions: input.examQuestions,
      examConfig: input.examConfig,
      includeModuleOverviewSlides: input.includeModuleOverviewSlides,
      includeModuleTitleSlides: input.includeModuleTitleSlides,
      includeSummarySlides: input.includeSummarySlides,
      imageMode: input.imageMode,
      processSkin: input.processSkin,
      processShowStepLabels: input.processShowStepLabels,
      verticalTabSkin: input.verticalTabSkin,
      verticalTabColorMode: input.verticalTabColorMode,
      verticalTabUnifyColor: input.verticalTabUnifyColor,
      verticalTabWellColor: input.verticalTabWellColor,
      floatingImagesMap: input.floatingImagesMap,
    };
  }
}

async function uploadToSignedUrl(
  signedUrl: string,
  uploadToken: string,
  body: Blob
): Promise<void> {
  const res = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${uploadToken}`,
      'Content-Type': body.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Upload failed (${res.status}).`);
  }
}

export async function createReviewLink(snapshot: ReviewSnapshot, courseTitle: string): Promise<{
  token: string;
  url: string;
  expiresAt: string;
}> {
  const json = JSON.stringify(snapshot);
  const raw = new TextEncoder().encode(json);
  let payload = raw;
  let encoding: 'json' | 'gzip' = 'json';
  if (raw.byteLength > 12 * 1024 * 1024) {
    const gz = await gzipBytes(raw);
    if (gz && gz.byteLength < raw.byteLength) {
      payload = gz;
      encoding = 'gzip';
    }
  }
  if (payload.byteLength > MAX_SNAPSHOT_BYTES) {
    throw new Error(
      `This course is too large to share as a web link (${Math.round(payload.byteLength / 1024 / 1024)} MB). Publish SCORM for LMS review instead.`
    );
  }

  const start = await authedFetch('/api/review-links', {
    method: 'POST',
    body: JSON.stringify({
      courseTitle: courseTitle || snapshot.course?.title || 'Untitled Course',
      encoding,
      byteLength: payload.byteLength,
    }),
  });
  const startData = await start.json().catch(() => ({}));
  if (!start.ok) throw new Error(readError(startData, 'Could not create a review link.'));

  const token = startData.token as string;
  const blob = new Blob([payload], {
    type: encoding === 'gzip' ? 'application/gzip' : 'application/json',
  });

  try {
    if (startData.upload?.signedUrl && startData.upload?.token) {
      await uploadToSignedUrl(startData.upload.signedUrl, startData.upload.token, blob);
    } else {
      throw new Error('missing-signed-url');
    }
  } catch (e) {
    const fallback = await authedFetch(`/api/review-links/${encodeURIComponent(token)}/upload`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Review-Encoding': encoding,
      },
      body: blob,
    });
    const fbData = await fallback.json().catch(() => ({}));
    if (!fallback.ok) {
      const signedMsg = e instanceof Error ? e.message : '';
      throw new Error(readError(fbData, signedMsg || 'Could not upload the review snapshot.'));
    }
  }

  const ready = await authedFetch(`/api/review-links/${encodeURIComponent(token)}/ready`, {
    method: 'POST',
    body: JSON.stringify({ encoding }),
  });
  const readyData = await ready.json().catch(() => ({}));
  if (!ready.ok) throw new Error(readError(readyData, 'Review snapshot uploaded but could not be published.'));

  return {
    token,
    url: reviewShareUrl(token),
    expiresAt: startData.expiresAt,
  };
}

export async function listReviewLinks(): Promise<ReviewLinkMeta[]> {
  const res = await authedFetch('/api/review-links');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(readError(data, 'Could not load review links.'));
  return (data.links || []) as ReviewLinkMeta[];
}

export async function revokeReviewLink(token: string): Promise<void> {
  const res = await authedFetch(`/api/review-links/${encodeURIComponent(token)}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(readError(data, 'Could not revoke this review link.'));
}

export async function fetchReviewSnapshot(token: string): Promise<{ snapshot: ReviewSnapshot; expiresAt: string; courseTitle: string }> {
  const res = await fetch(`${apiBase()}/api/review/${encodeURIComponent(token)}`);
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    const data = contentType.includes('application/json') ? await res.json().catch(() => ({})) : {};
    const status = res.status;
    if (status === 404 || status === 410) {
      throw new Error(readError(data, 'This review link has expired or was revoked.'));
    }
    throw new Error(readError(data, 'Could not open this review link.'));
  }

  const encoding = (res.headers.get('x-review-encoding') || '').toLowerCase();
  const expiresAt = res.headers.get('x-review-expires') || '';
  const courseTitle = decodeURIComponent(res.headers.get('x-review-title') || 'Course review');

  let snapshot: ReviewSnapshot;
  if (encoding === 'gzip' || contentType.includes('gzip')) {
    const buf = new Uint8Array(await res.arrayBuffer());
    const text = new TextDecoder().decode(await gunzipBytes(buf));
    snapshot = JSON.parse(text);
  } else {
    snapshot = await res.json();
  }
  if (!snapshot?.course?.modules?.length) {
    throw new Error('This review snapshot has no slides.');
  }
  return { snapshot, expiresAt, courseTitle };
}
