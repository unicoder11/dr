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
  description?: string;
  address?: Record<string, string> | unknown;
  timezone?: string;
  is_published: boolean;
  capacity_default?: number;
  modalities?: { id: string; slug: string; name: string }[];
  open_slots?: number;
  upcoming_challenges?: number;
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
  cover_asset_id?: string | null;
  cover_url?: string;
  is_demo: boolean;
  submission_fee_cents?: number;
  submission_paid?: boolean;
  entry_fee_cents?: number;
  entry_paid_by_me?: boolean;
  derived: {
    scheduled: boolean;
    open: boolean;
    full: boolean;
  };
  created_at: string;
  updated_at: string;
};

export type MediaAsset = {
  id: string;
  owner_user_id: string;
  bucket_key: string;
  content_type: string;
  bytes: number;
  purpose: string;
  title: string;
  is_public: boolean;
  status: string;
  url: string;
  created_at: string;
};

export type LiveStream = {
  id: string;
  title: string;
  description: string;
  arena_id?: string;
  arena_slug?: string;
  arena_name?: string;
  challenge_id?: string;
  cover_asset_id?: string;
  cover_url?: string;
  stream_url: string;
  status: string;
  starts_at?: string | null;
  is_demo: boolean;
  created_at: string;
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
    referral_code?: string;
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
  adminOverview: () => request<AdminOverview>("/api/v1/admin/overview"),
  adminUsers: () => request<AdminUser[]>("/api/v1/admin/users"),
  adminGrantRole: (id: string, role: string) =>
    request<{ status: string }>(`/api/v1/admin/users/${id}/roles`, {
      method: "POST",
      body: JSON.stringify({ role }),
    }),
  adminRevokeRole: (id: string, role: string) =>
    request<{ status: string }>(`/api/v1/admin/users/${id}/roles`, {
      method: "DELETE",
      body: JSON.stringify({ role }),
    }),
  adminChallenges: (status?: string) =>
    request<AdminChallenge[]>(
      `/api/v1/admin/challenges${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    ),
  adminModalities: () => request<Modality[]>("/api/v1/admin/modalities"),
  adminSetModality: (id: string, active: boolean) =>
    request<Modality>(`/api/v1/admin/modalities/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    }),
  adminFlags: () => request<AdminFlag[]>("/api/v1/admin/feature-flags"),
  adminSetFlag: (key: string, enabled: boolean) =>
    request<AdminFlag>(`/api/v1/admin/feature-flags/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),
  adminAudit: () => request<AdminAuditRow[]>("/api/v1/admin/audit"),
  adminFinanceOverview: () =>
    request<AdminFinanceOverview>("/api/v1/admin/finance/overview"),
  adminFinancePayments: (params?: {
    kind?: string;
    status?: string;
    method?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.kind) q.set("kind", params.kind);
    if (params?.status) q.set("status", params.status);
    if (params?.method) q.set("method", params.method);
    const qs = q.toString();
    return request<AdminPayment[]>(
      `/api/v1/admin/finance/payments${qs ? `?${qs}` : ""}`,
    );
  },
  adminSetPaymentStatus: (
    kind: "submission" | "entry",
    id: string,
    status: string,
  ) =>
    request<AdminPayment>(`/api/v1/admin/finance/payments/${kind}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  adminCreateArena: (body: {
    name: string;
    slug: string;
    description?: string;
    city?: string;
    state?: string;
    capacity_default?: number;
    modality_ids?: string[];
    publish?: boolean;
  }) =>
    request<Arena>("/api/v1/admin/arenas", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  adminPublishArena: (slug: string, published: boolean) =>
    request<Arena>(`/api/v1/admin/arenas/${slug}/publish`, {
      method: "PATCH",
      body: JSON.stringify({ published }),
    }),
  modalities: () => request<Modality[]>("/api/v1/modalities"),
  arenas: (all?: boolean) =>
    request<Arena[]>(`/api/v1/arenas${all ? "?all=1" : ""}`),
  arena: (slug: string) => request<Arena>(`/api/v1/arenas/${slug}`),
  challenges: (params?: { modality?: string; arena?: string; mine?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.modality) q.set("modality", params.modality);
    if (params?.arena) q.set("arena", params.arena);
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
  paySubmitChallenge: (
    idOrSlug: string,
    body: { method: "pix" | "card"; holder?: string; number?: string; expiry?: string; cvv?: string },
  ) =>
    request<Challenge>(`/api/v1/challenges/${idOrSlug}/pay-submit`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setChallengeCover: (idOrSlug: string, asset_id: string) =>
    request<Challenge>(`/api/v1/challenges/${idOrSlug}/cover`, {
      method: "POST",
      body: JSON.stringify({ asset_id }),
    }),
  uploadMedia: async (file: File, purpose = "cover", title = "") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("purpose", purpose);
    if (title) fd.append("title", title);
    const res = await fetch(`${API_URL}/api/v1/media/upload`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || `http_${res.status}`);
    }
    return data as MediaAsset;
  },
  liveStreams: () => request<LiveStream[]>("/api/v1/live"),
  participants: (idOrSlug: string) =>
    request<Participant[]>(`/api/v1/challenges/${idOrSlug}/participants`),
  joinChallenge: (idOrSlug: string) =>
    request<Participant>(`/api/v1/challenges/${idOrSlug}/join`, { method: "POST" }),
  payJoinChallenge: (
    idOrSlug: string,
    body: { method: "pix" | "card"; holder?: string; number?: string; expiry?: string; cvv?: string },
  ) =>
    request<Participant>(`/api/v1/challenges/${idOrSlug}/pay-join`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
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
  slots: (params?: { arena?: string; modality?: string }) => {
    const q = new URLSearchParams();
    if (params?.arena) q.set("arena", params.arena);
    if (params?.modality) q.set("modality", params.modality);
    const qs = q.toString();
    return request<Slot[]>(`/api/v1/slots${qs ? `?${qs}` : ""}`);
  },
  createBooking: (slot_id: string) =>
    request<Booking>("/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({ slot_id }),
    }),
  payBooking: (
    id: string,
    body: { method: "pix" | "card"; holder?: string; number?: string; expiry?: string; cvv?: string },
  ) =>
    request<Booking>(`/api/v1/bookings/${id}/pay`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  myBookings: () => request<Booking[]>("/api/v1/me/bookings"),
  cancelBooking: (id: string) =>
    request<Booking>(`/api/v1/bookings/${id}/cancel`, { method: "POST" }),
  rankings: (params?: { modality?: string; season?: string }) => {
    const q = new URLSearchParams();
    if (params?.modality) q.set("modality", params.modality);
    if (params?.season) q.set("season", params.season);
    const qs = q.toString();
    return request<RankingEntry[]>(`/api/v1/rankings${qs ? `?${qs}` : ""}`);
  },
  opsAgenda: () => request<OpsAgendaItem[]>("/api/v1/ops/agenda"),
  opsCheckIn: (body: { participant_id?: string; booking_id?: string }) =>
    request<{ status: string }>("/api/v1/ops/check-in", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  opsStartChallenge: (idOrSlug: string) =>
    request<{ status: string }>(`/api/v1/ops/challenges/${idOrSlug}/start`, {
      method: "POST",
    }),
  opsUpsertResult: (
    idOrSlug: string,
    payload: { placements: { user_id: string; position: number }[]; notes?: string },
  ) =>
    request<ChallengeResult>(`/api/v1/ops/challenges/${idOrSlug}/results`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  opsValidateResult: (id: string) =>
    request<ChallengeResult>(`/api/v1/ops/results/${id}/validate`, {
      method: "POST",
    }),
  challengeResult: (idOrSlug: string) =>
    request<ChallengeResult>(`/api/v1/challenges/${idOrSlug}/results`),
  profile: (username: string) => request<PublicProfile>(`/api/v1/users/${username}`),
  follow: (username: string) =>
    request<{ status: string }>(`/api/v1/users/${username}/follow`, { method: "POST" }),
  unfollow: (username: string) =>
    request<{ status: string }>(`/api/v1/users/${username}/follow`, { method: "DELETE" }),
  followers: (username: string) =>
    request<FollowUser[]>(`/api/v1/users/${username}/followers`),
  following: (username: string) =>
    request<FollowUser[]>(`/api/v1/users/${username}/following`),
  myReferral: () => request<ReferralStats>("/api/v1/me/referral"),
  myAchievements: () => request<Achievement[]>("/api/v1/me/achievements"),
  creatorStats: (username: string) =>
    request<CreatorStats>(`/api/v1/users/${username}/stats`),
  influencers: () => request<InfluencerRow[]>("/api/v1/influencers"),
  trackView: (idOrSlug: string, viewer_key?: string) =>
    request<{ status: string }>(`/api/v1/challenges/${idOrSlug}/views`, {
      method: "POST",
      body: JSON.stringify({ viewer_key: viewer_key || "" }),
    }),
  trackShare: (idOrSlug: string, channel = "link") =>
    request<{ status: string }>(`/api/v1/challenges/${idOrSlug}/shares`, {
      method: "POST",
      body: JSON.stringify({ channel }),
    }),
};

export type CreatorStats = {
  username: string;
  followers_count: number;
  following_count: number;
  challenges_created: number;
  challenges_published: number;
  total_views: number;
  total_shares: number;
  referral_signups: number;
  wins: number;
};

export type InfluencerRow = {
  username: string;
  display_name: string;
  followers_count: number;
  referral_signups: number;
  total_views: number;
  challenges_published: number;
  score: number;
};

export type Achievement = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
};

export type PublicProfile = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  city: string;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  achievements: Achievement[];
  referral_code?: string;
};

export type FollowUser = {
  username: string;
  display_name: string;
};

export type ReferralStats = {
  code: string;
  share_url: string;
  signups: number;
};

export type RankingEntry = {
  user_id: string;
  username: string;
  display_name: string;
  points: number;
  wins: number;
  participations: number;
  rank_position: number;
  modality_slug?: string | null;
  season: string;
};

export type OpsAgendaItem = {
  kind: string;
  id: string;
  title: string;
  starts_at: string;
  status: string;
  slug?: string;
  modality_name?: string;
  user_display_name?: string;
  username?: string;
};

export type ChallengeResult = {
  id: string;
  challenge_id: string;
  challenge_slug: string;
  challenge_title: string;
  payload: {
    placements: { user_id: string; position: number }[];
    notes?: string;
  };
  status: string;
  validated_by?: string;
  validated_at?: string;
};

export type Slot = {
  id: string;
  arena_id: string;
  arena_name: string;
  modality_id: string;
  modality_slug: string;
  modality_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  booked_count: number;
  price_cents: number;
  status: string;
  available: boolean;
};

export type Booking = {
  id: string;
  user_id: string;
  arena_id: string;
  arena_name: string;
  slot_id?: string;
  starts_at?: string;
  ends_at?: string;
  modality_name?: string;
  status: string;
  amount_cents: number;
  currency: string;
  mp_preference_id?: string;
  checkout_url?: string;
  created_at: string;
};

export type AdminOverview = {
  users_total: number;
  challenges_published: number;
  challenges_pending: number;
  arenas_published: number;
  bookings_confirmed: number;
  open_slots: number;
  live_streams: number;
};

export type AdminUser = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  roles: string[];
  status: string;
  created_at: string;
};

export type AdminChallenge = {
  id: string;
  slug: string;
  title: string;
  status: string;
  modality_name: string;
  arena_name: string;
  creator_username: string;
  starts_at: string;
  created_at: string;
};

export type AdminFlag = {
  key: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
};

export type AdminAuditRow = {
  id: string;
  actor_user_id?: string;
  actor_username?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  payload: unknown;
  created_at: string;
};

export type AdminFinanceOverview = {
  paid_cents: number;
  paid_count: number;
  pending_cents: number;
  pending_count: number;
  refunded_cents: number;
  refunded_count: number;
  failed_count: number;
  last_7d_paid_cents: number;
  by_kind_paid_cents: Record<string, number>;
  by_method_paid_cents: Record<string, number>;
};

export type AdminPayment = {
  id: string;
  kind: "submission" | "entry" | "booking" | string;
  status: string;
  method: string;
  amount_cents: number;
  currency: string;
  provider_payment_id: string;
  user_id: string;
  username: string;
  email: string;
  challenge_id?: string;
  challenge_slug?: string;
  challenge_title?: string;
  arena_name?: string;
  created_at: string;
  can_refund: boolean;
};
