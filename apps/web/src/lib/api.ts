const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type ApiUser = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  roles: string[];
  email_verified: boolean;
};

export type Modality = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
};

export type Arena = {
  id: string;
  slug: string;
  name: string;
  is_published: boolean;
};

export type Challenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  modality_id: string;
  modality_slug: string;
  modality_name: string;
  arena_id: string;
  arena_slug: string;
  arena_name: string;
  created_by: string;
  creator_username: string;
  competition_type: string;
  status: string;
  regulation: string;
  capacity: number;
  confirmed_count: number;
  starts_at: string;
  ends_at?: string | null;
  is_demo: boolean;
  derived: {
    scheduled: boolean;
    open: boolean;
    full: boolean;
  };
  created_at: string;
  updated_at: string;
};

export type ChallengeInput = {
  title: string;
  description: string;
  modality_id: string;
  arena_id: string;
  competition_type: string;
  regulation: string;
  capacity: number;
  starts_at: string;
  ends_at?: string | null;
};

export type Participant = {
  id: string;
  challenge_id: string;
  user_id: string;
  username: string;
  display_name: string;
  status: string;
  challenge_slug?: string;
  challenge_title?: string;
  challenge_starts_at?: string;
};

export type CalendarItem = {
  challenge_id: string;
  slug: string;
  title: string;
  challenge_status: string;
  participant_status?: string;
  role: string;
  modality_name: string;
  arena_name: string;
  starts_at: string;
  capacity: number;
  confirmed_count: number;
};

export type Notification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at?: string | null;
  created_at: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `http_${res.status}`);
  }
  return data as T;
}

export const api = {
  register: (body: {
    email: string;
    password: string;
    username: string;
    display_name?: string;
  }) =>
    request<ApiUser>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<ApiUser>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () => request<{ status: string }>("/api/v1/auth/logout", { method: "POST" }),
  me: () => request<ApiUser>("/api/v1/auth/me"),
  adminUsers: () => request<unknown[]>("/api/v1/admin/users"),
  modalities: () => request<Modality[]>("/api/v1/modalities"),
  arenas: () => request<Arena[]>("/api/v1/arenas"),
  challenges: (params?: { modality?: string; mine?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.modality) q.set("modality", params.modality);
    if (params?.mine) q.set("mine", "1");
    const qs = q.toString();
    return request<Challenge[]>(`/api/v1/challenges${qs ? `?${qs}` : ""}`);
  },
  challenge: (idOrSlug: string) => request<Challenge>(`/api/v1/challenges/${idOrSlug}`),
  createChallenge: (body: ChallengeInput) =>
    request<Challenge>("/api/v1/challenges", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  transitionChallenge: (idOrSlug: string, status: string) =>
    request<Challenge>(`/api/v1/challenges/${idOrSlug}/transition`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  participants: (idOrSlug: string) =>
    request<Participant[]>(`/api/v1/challenges/${idOrSlug}/participants`),
  joinChallenge: (idOrSlug: string) =>
    request<Participant>(`/api/v1/challenges/${idOrSlug}/join`, { method: "POST" }),
  invite: (idOrSlug: string, username: string) =>
    request<Participant>(`/api/v1/challenges/${idOrSlug}/invites`, {
      method: "POST",
      body: JSON.stringify({ username }),
    }),
  acceptInvite: (id: string) =>
    request<Participant>(`/api/v1/participants/${id}/accept`, { method: "POST" }),
  declineInvite: (id: string) =>
    request<Participant>(`/api/v1/participants/${id}/decline`, { method: "POST" }),
  myInvites: () => request<Participant[]>("/api/v1/me/invites"),
  calendar: () => request<CalendarItem[]>("/api/v1/me/calendar"),
  notifications: (unread?: boolean) =>
    request<Notification[]>(
      `/api/v1/me/notifications${unread ? "?unread=1" : ""}`,
    ),
  markNotificationRead: (id: string) =>
    request<{ status: string }>(`/api/v1/me/notifications/${id}/read`, {
      method: "POST",
    }),
};
