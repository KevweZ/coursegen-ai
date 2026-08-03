/**
 * Team workspace / seats client API.
 * Owner invites up to seat_limit teammates; members inherit Team entitlements.
 */

const API_BASE =
  import.meta.env.MODE === 'production'
    ? ''
    : 'http://localhost:3001';

export interface WorkspaceMember {
  id: string;
  email: string;
  role: 'owner' | 'member';
  status: 'active' | 'invited' | 'removed';
  user_id: string | null;
  created_at?: string;
  joined_at?: string | null;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  seat_limit: number;
  role: 'owner' | 'member';
  credits_ai?: number;
  credits_tts?: number;
}

async function authHeaders(accessToken: string): Promise<HeadersInit> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function fetchWorkspace(accessToken: string): Promise<{
  workspace: WorkspaceInfo | null;
  members: WorkspaceMember[];
}> {
  const res = await fetch(`${API_BASE}/api/workspace`, {
    headers: await authHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to load workspace');
  }
  return res.json();
}

export async function inviteWorkspaceMember(
  accessToken: string,
  email: string
): Promise<{ member: WorkspaceMember; inviteLink: string; emailSent: boolean }> {
  const res = await fetch(`${API_BASE}/api/workspace/invite`, {
    method: 'POST',
    headers: await authHeaders(accessToken),
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Invite failed');
  }
  return res.json();
}

export async function acceptWorkspaceInvite(
  accessToken: string,
  token: string
): Promise<{ ok: boolean; workspace_id: string }> {
  const res = await fetch(`${API_BASE}/api/workspace/accept`, {
    method: 'POST',
    headers: await authHeaders(accessToken),
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Could not accept invite');
  }
  return res.json();
}

export async function removeWorkspaceMember(
  accessToken: string,
  memberId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/workspace/remove`, {
    method: 'POST',
    headers: await authHeaders(accessToken),
    body: JSON.stringify({ memberId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Could not remove member');
  }
}
