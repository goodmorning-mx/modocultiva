import type { EvidenceInput, UploadedVideoAsset } from './visualEvidence';
export type CardAudience = 'network' | 'public';

export type CommunityProfile = { user_id: string; display_name: string; bio: string; levels: Record<string, number>; connection?: { id: string; status: 'pending' | 'accepted' | 'declined' | 'disconnected'; incoming: boolean } | null };
export type CommunityReview = { reviewer_id: string; decision: 'approve' | 'changes_requested'; activity_match: boolean; effort_match: boolean; clarity_match: boolean; feedback: string; created_at: string };
export type CommunitySubmission = {
  id: string; author_id: string; mode: string; source_level: number; target_level: number; revision_number: number;
  activity: string; activity_hash: string; rubric_version: string;
  rubric_snapshot: { version: string; source: { level: number; name: string; description: string }; target: { level: number; name: string; description: string }; effort: string };
  target_alignment: string; status: 'pending' | 'changes_requested' | 'approved' | 'superseded' | 'withdrawn' | 'stale'; created_at: string;
  evidence: EvidenceInput & { video?: UploadedVideoAsset }; review_count: number; review_quorum: 3; reviews: CommunityReview[]; can_review: boolean; advanced: boolean; audience?: CardAudience; shared_card_id?: string;
};
export type CommunityNotice = { id: string; kind: string; resource_id: string; read: boolean; created_at: string };
export type CommunityCard = { id: string; author_id: string; display_name: string; mode: string; source_level: number; activity: string; activity_hash: string; created_at: string; reactions: Record<string, number>; my_reaction: string | null; reuse?: { id: string; status: string } | null; audience?: CardAudience; has_evidence?: boolean };
export type CommunityCardDetail = CommunityCard & {
  reflection?: string; reference_link?: string;
  proof?: { kind: 'photo'; image: string } | { kind: 'video'; mime_type: 'video/mp4' | 'video/webm'; byte_size: number };
  rubric_snapshot?: CommunitySubmission['rubric_snapshot']; target_alignment?: string;
  validation_status?: CommunitySubmission['status']; review_count: number; review_quorum: 3;
};
export type CommunityIdeaRequest = { id: string; author_id: string; display_name: string; mode: string; source_level: number; status: string; eligible_count?: number; offers?: { id: string; responder_id: string; display_name: string; activity: string; activity_hash: string }[]; can_offer?: boolean };
export type CommunityReuseRequest = { id: string; card_id: string; author_id: string; requester_id: string; display_name: string; status: 'pending' | 'accepted' | 'declined'; mode: string; source_level: number; activity: string };

export class CommunityApiError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); this.name = 'CommunityApiError'; }
}
export async function activitySha256(activity: string): Promise<string> {
  const bytes = new TextEncoder().encode(activity.trim());
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export const isCommunityCardId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function fetchPublicCommunityCard(baseUrl: string, id: string, signal?: AbortSignal): Promise<CommunityCardDetail> {
  if (!isCommunityCardId(id)) throw new CommunityApiError('card_not_found', 404);
  const response = await fetch(`${baseUrl}/community/public/cards/${id}`, { signal, cache: 'no-store', credentials: 'omit' });
  if (!response.ok) throw new CommunityApiError('card_not_found', response.status);
  return response.json() as Promise<CommunityCardDetail>;
}
export async function loadPublicCardVideo(baseUrl: string, id: string, signal: AbortSignal): Promise<Blob> {
  if (!isCommunityCardId(id)) throw new CommunityApiError('card_not_found', 404);
  const response = await fetch(`${baseUrl}/community/public/cards/${id}/video`, { signal, cache: 'no-store', credentials: 'omit' });
  if (!response.ok) throw new CommunityApiError('media_not_found', response.status);
  return response.blob();
}

/** One immutable authenticated session. Do not put tokens in URLs or storage here. */
export function createCommunityClient(baseUrl: string, accessToken: string) {
  const request = async <T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> => {
    const response = await fetch(`${baseUrl}/community${path}`, { method, signal, cache: 'no-store',
      headers: { Authorization: `Bearer ${accessToken}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new CommunityApiError(payload?.detail?.code ?? (response.status === 401 ? 'login_required' : 'request_failed'), response.status);
    return payload as T;
  };
  return {
    getProfile: (signal?: AbortSignal) => request<{ user_id: string; display_name: string; bio: string; discoverable: boolean } | null>('/profile', 'GET', undefined, signal),
    setProfile: (profile: { display_name: string; bio: string; discoverable: boolean }, signal?: AbortSignal) => request('/profile', 'PUT', profile, signal),
    directory: (signal?: AbortSignal) => request<{ members: CommunityProfile[]; limit: number }>('/members', 'GET', undefined, signal),
    connect: (member_id: string, signal?: AbortSignal) => request<{ id: string; status: string }>('/connections', 'POST', { member_id }, signal),
    respondConnection: (id: string, action: 'accept' | 'decline' | 'disconnect', signal?: AbortSignal) => request(`/connections/${id}`, 'PUT', { action }, signal),
    submissions: (signal?: AbortSignal) => request<{ submissions: CommunitySubmission[] }>('/submissions', 'GET', undefined, signal),
    inbox: (signal?: AbortSignal) => request<{ submissions: CommunitySubmission[] }>('/review-inbox', 'GET', undefined, signal),
    submission: (id: string, signal?: AbortSignal) => request<CommunitySubmission>(`/submissions/${id}`, 'GET', undefined, signal),
    submit: (body: { mode: string; level: number; language: string; expected_activity_hash: string; target_alignment: string; evidence: EvidenceInput; audience?: CardAudience; public_confirmed?: boolean }, signal?: AbortSignal) => request<CommunitySubmission>('/submissions', 'POST', body, signal),
    review: (id: string, body: { expected_activity_hash: string; decision: 'approve' | 'changes_requested'; activity_match: boolean; effort_match: boolean; clarity_match: boolean; feedback: string }, signal?: AbortSignal) => request<CommunitySubmission>(`/submissions/${id}/reviews`, 'POST', body, signal),
    withdraw: (id: string, signal?: AbortSignal) => request(`/submissions/${id}/withdraw`, 'POST', undefined, signal),
    notices: (signal?: AbortSignal) => request<{ notifications: CommunityNotice[] }>('/notifications', 'GET', undefined, signal),
    markNotice: (id: string, signal?: AbortSignal) => request(`/notifications/${id}/read`, 'PUT', undefined, signal),
    feed: (signal?: AbortSignal) => request<{ cards: CommunityCard[] }>('/feed', 'GET', undefined, signal),
    share: (body: { mode: string; level: number; expected_activity_hash: string; audience?: CardAudience; public_confirmed?: boolean; submission_id?: string }, signal?: AbortSignal) => request<CommunityCard>('/feed', 'POST', body, signal),
    setAudience: (id: string, audience: CardAudience, public_confirmed: boolean, signal?: AbortSignal) => request<CommunityCard>(`/feed/${id}/audience`, 'PUT', { audience, public_confirmed }, signal),
    card: (id: string, signal?: AbortSignal) => request<CommunityCardDetail>(`/cards/${id}`, 'GET', undefined, signal),
    loadCardVideo: async (id: string, signal: AbortSignal): Promise<Blob> => {
      if (!isCommunityCardId(id)) throw new CommunityApiError('card_not_found', 404);
      const response = await fetch(`${baseUrl}/community/cards/${id}/video`, { signal, cache: 'no-store', headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) throw new CommunityApiError('media_not_found', response.status);
      return response.blob();
    },
    react: (id: string, reaction: 'leaf' | 'soil' | 'water' | 'sun' | 'roots' | null, signal?: AbortSignal) => request(`/feed/${id}/reaction`, 'PUT', { reaction }, signal),
    unshare: (id: string, signal?: AbortSignal) => request(`/feed/${id}/hide`, 'POST', undefined, signal),
    requestReuse: (id: string, signal?: AbortSignal) => request(`/feed/${id}/reuse`, 'POST', undefined, signal),
    reuseRequests: (signal?: AbortSignal) => request<{ requests: CommunityReuseRequest[] }>('/reuse-requests', 'GET', undefined, signal),
    respondReuse: (id: string, action: 'accept' | 'decline', signal?: AbortSignal) => request(`/reuse-requests/${id}`, 'PUT', { action }, signal),
    importReuse: (id: string, expected_destination_hash: string, signal?: AbortSignal) => request(`/reuse-requests/${id}/import`, 'POST', { expected_destination_hash }, signal),
    ideas: (signal?: AbortSignal) => request<{ requests: CommunityIdeaRequest[] }>('/ideas', 'GET', undefined, signal),
    requestIdea: (body: { mode: string; level: number }, signal?: AbortSignal) => request<CommunityIdeaRequest>('/ideas', 'POST', body, signal),
    cancelIdea: (id: string, signal?: AbortSignal) => request(`/ideas/${id}/cancel`, 'POST', undefined, signal),
    offerIdea: (id: string, signal?: AbortSignal) => request(`/ideas/${id}/offer`, 'POST', undefined, signal),
    importIdea: (id: string, expected_destination_hash: string, signal?: AbortSignal) => request(`/idea-offers/${id}/import`, 'POST', { expected_destination_hash }, signal),
    uploadVideo: async (file: File, signal: AbortSignal): Promise<UploadedVideoAsset> => {
      const response = await fetch(`${baseUrl}/community/media/video`, { method: 'POST', signal, cache: 'no-store', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': file.type }, body: file });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new CommunityApiError(payload?.detail?.code ?? 'video_upload_failed', response.status);
      return payload as UploadedVideoAsset;
    },
    loadVideo: async (id: string, signal: AbortSignal): Promise<Blob> => {
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw new CommunityApiError('media_not_found', 404);
      const response = await fetch(`${baseUrl}/community/media/${id}`, { signal, cache: 'no-store', headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) throw new CommunityApiError('media_not_found', response.status);
      return response.blob();
    },
  };
}
export type CommunityClient = ReturnType<typeof createCommunityClient>;
