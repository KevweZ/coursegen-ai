/**
 * workflowService.ts
 *
 * Autoskill integration layer.
 * - Checks if the local screenpipe daemon is running (http://localhost:3030)
 * - Fetches recent activity (app names + window titles only — no OCR text)
 * - Anonymises/redacts before anything leaves the browser
 * - Sends to our server (/api/workflow-insights) which uses Claude to suggest
 *   eLearning course topics based on the detected workflow patterns
 */

export const SCREENPIPE_BASE = 'http://localhost:3030';
const SERVER_ENDPOINT = '/api/workflow-insights';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityEvent {
  app:         string;
  windowTitle: string;
  timestamp:   string;
}

export interface ActivityCluster {
  app:         string;
  topics:      string[];  // window titles, deduplicated
  totalMinutes: number;
}

export interface CourseSuggestion {
  topic:          string;
  description:    string;
  targetAudience: string;
  why:            string;
  confidence:     number;  // 0–1
  relatedSkills:  string[];
}

export interface WorkflowAnalysisResult {
  suggestions:  CourseSuggestion[];
  patterns:     ActivityCluster[];
  analyzedHours: number;
}

export type ScreenpipeStatus = 'checking' | 'connected' | 'unavailable';

// ─── Screenpipe health check ──────────────────────────────────────────────────

export async function checkScreenpipeHealth(): Promise<boolean> {
  try {
    // screenpipe exposes /health — no auth needed
    const res = await fetch(`${SCREENPIPE_BASE}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Fetch & anonymise recent activity ───────────────────────────────────────

/** Words/patterns to scrub from window titles before they leave the browser */
const SENSITIVE_PATTERNS = [
  /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,   // emails
  /\b(?:\d[ -]?){13,19}\b/g,                                   // card numbers
  /Bearer\s+\S+/gi,                                             // bearer tokens
  /sk-[A-Za-z0-9]{10,}/g,                                      // API keys (sk-...)
  /ghp_[A-Za-z0-9]{10,}/g,                                     // GitHub tokens
];

function redactTitle(title: string): string {
  let out = title;
  for (const pat of SENSITIVE_PATTERNS) {
    out = out.replace(pat, '[REDACTED]');
  }
  return out.trim();
}

export async function fetchRecentActivity(
  hours: number,
  token?: string,
): Promise<ActivityEvent[]> {
  const endTime   = new Date();
  const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

  const params = new URLSearchParams({
    q:            '',
    content_type: 'ocr',
    limit:        '200',
    start_time:   startTime.toISOString(),
    end_time:     endTime.toISOString(),
  });

  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${SCREENPIPE_BASE}/search?${params}`, {
    headers,
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`screenpipe returned ${res.status}`);

  const data = await res.json();
  const results: any[] = data?.results ?? data?.data ?? [];

  return results
    .map((r: any) => {
      const c = r?.content ?? r;
      return {
        app:         String(c?.app_name ?? c?.app ?? 'Unknown'),
        windowTitle: redactTitle(String(c?.window_name ?? c?.window_title ?? c?.title ?? '')),
        timestamp:   String(c?.timestamp ?? r?.timestamp ?? ''),
      };
    })
    .filter(e => e.windowTitle.length > 0);
}

// ─── Cluster activities ───────────────────────────────────────────────────────

/**
 * Groups events by app, deduplicates window titles, and estimates duration.
 * Returns the top clusters by time spent.
 */
export function clusterActivities(events: ActivityEvent[]): ActivityCluster[] {
  const map = new Map<string, Set<string>>();
  for (const e of events) {
    if (!map.has(e.app)) map.set(e.app, new Set());
    if (e.windowTitle) map.get(e.app)!.add(e.windowTitle);
  }

  // Rough duration estimate: each event ≈ 30 s of screen time
  const clusters: ActivityCluster[] = [];
  for (const [app, titles] of map.entries()) {
    const count = events.filter(e => e.app === app).length;
    clusters.push({
      app,
      topics:       Array.from(titles).slice(0, 15),
      totalMinutes: Math.round((count * 30) / 60),
    });
  }

  return clusters
    .filter(c => c.totalMinutes >= 1)
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 12);
}

// ─── Manual activity (no screenpipe) ─────────────────────────────────────────

/**
 * Parses a user-typed activity description into a minimal cluster list.
 * Used when screenpipe is not available.
 */
export function parseManualActivity(text: string): ActivityCluster[] {
  return [
    {
      app:         'Manual Input',
      topics:      [text.trim()],
      totalMinutes: 60,
    },
  ];
}

// ─── Server-side analysis ─────────────────────────────────────────────────────

export async function analyzeWorkflow(
  clusters:     ActivityCluster[],
  analyzedHours: number,
  authHeader?:  string,
): Promise<WorkflowAnalysisResult> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;

  const res = await fetch(SERVER_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ clusters, analyzedHours }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error ?? `Server returned ${res.status}`);
  }

  return res.json();
}
