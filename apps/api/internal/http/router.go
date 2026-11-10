package httpapi

import (
	"net/http"

	"github.com/desafiosreais/dr/apps/api/internal/config"
	"github.com/desafiosreais/dr/apps/api/internal/http/handlers"
	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/infra/mercadopago"
	"github.com/desafiosreais/dr/apps/api/internal/modules/admin"
	"github.com/desafiosreais/dr/apps/api/internal/modules/arenas"
	"github.com/desafiosreais/dr/apps/api/internal/modules/bookings"
	"github.com/desafiosreais/dr/apps/api/internal/modules/challenges"
	"github.com/desafiosreais/dr/apps/api/internal/modules/community"
	"github.com/desafiosreais/dr/apps/api/internal/modules/identity"
	"github.com/desafiosreais/dr/apps/api/internal/modules/media"
	"github.com/desafiosreais/dr/apps/api/internal/modules/notifications"
	"github.com/desafiosreais/dr/apps/api/internal/modules/ops"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewRouter(cfg config.Config, db *pgxpool.Pool) http.Handler {
	mux := http.NewServeMux()

	identitySvc := identity.NewService(db)
	adminSvc := admin.NewService(db)
	challengeSvc := challenges.NewService(db).WithPublicURL(cfg.PublicURL)
	notifSvc := notifications.NewService(db)
	opsSvc := ops.NewService(db)
	communitySvc := community.NewService(db)
	arenaSvc := arenas.NewService(db)
	mediaSvc := media.NewService(db, cfg.MediaDir, cfg.PublicURL)
	_ = mediaSvc.EnsureDir()
	mpClient := mercadopago.New(cfg.MPAccessToken)
	bookingSvc := bookings.NewService(db, mpClient, cfg.PublicURL, cfg.SiteURL, cfg.AppEnv, !cfg.FlagP2PPrizes)

	health := handlers.HealthHandler{DB: db}
	authH := handlers.AuthHandler{Identity: identitySvc, Community: communitySvc, Secure: cfg.AppEnv == "production"}
	adminH := handlers.AdminHandler{Admin: adminSvc}
	usersH := handlers.UsersHandler{DB: db}
	chH := handlers.ChallengesHandler{Svc: challengeSvc, Community: communitySvc}
	partH := handlers.ParticipantsHandler{Challenges: challengeSvc, Notifs: notifSvc, Community: communitySvc}
	bookH := handlers.BookingsHandler{Svc: bookingSvc, SiteURL: cfg.SiteURL}
	opsH := handlers.OpsHandler{Svc: opsSvc, Community: communitySvc}
	comH := handlers.CommunityHandler{Svc: communitySvc, SiteURL: cfg.SiteURL}
	arH := handlers.ArenasHandler{Svc: arenaSvc}
	mediaH := handlers.MediaHandler{Svc: mediaSvc}

	mux.HandleFunc("GET /healthz", health.Healthz)
	mux.HandleFunc("GET /readyz", health.Readyz)

	mux.HandleFunc("POST /api/v1/auth/register", authH.Register)
	mux.HandleFunc("POST /api/v1/auth/login", authH.Login)
	mux.HandleFunc("POST /api/v1/auth/logout", authH.Logout)
	mux.Handle("GET /api/v1/auth/me", middleware.RequireAuth(http.HandlerFunc(authH.Me)))

	mux.HandleFunc("GET /api/v1/users/{username}", comH.GetProfile)
	mux.Handle("PATCH /api/v1/me/profile", middleware.RequireAuth(http.HandlerFunc(usersH.UpdateMe)))
	mux.Handle("POST /api/v1/users/{username}/follow", middleware.RequireAuth(http.HandlerFunc(comH.Follow)))
	mux.Handle("DELETE /api/v1/users/{username}/follow", middleware.RequireAuth(http.HandlerFunc(comH.Unfollow)))
	mux.HandleFunc("GET /api/v1/users/{username}/followers", comH.Followers)
	mux.HandleFunc("GET /api/v1/users/{username}/following", comH.Following)
	mux.Handle("GET /api/v1/me/referral", middleware.RequireAuth(http.HandlerFunc(comH.MyReferral)))
	mux.Handle("GET /api/v1/me/achievements", middleware.RequireAuth(http.HandlerFunc(comH.MyAchievements)))
	mux.HandleFunc("GET /api/v1/users/{username}/stats", comH.CreatorStats)
	mux.HandleFunc("GET /api/v1/influencers", comH.Influencers)
	mux.HandleFunc("POST /api/v1/challenges/{idOrSlug}/views", comH.TrackView)
	mux.HandleFunc("POST /api/v1/challenges/{idOrSlug}/shares", comH.TrackShare)

	mux.HandleFunc("GET /api/v1/modalities", chH.ListModalities)
	mux.HandleFunc("GET /api/v1/arenas", arH.List)
	mux.HandleFunc("GET /api/v1/arenas/{slug}", arH.Get)
	mux.Handle("POST /api/v1/admin/arenas", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(arH.Create))))
	mux.Handle("PATCH /api/v1/admin/arenas/{slug}/publish", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(arH.SetPublished))))
	mux.HandleFunc("GET /api/v1/challenges", chH.List)
	mux.HandleFunc("GET /api/v1/challenges/{idOrSlug}", chH.Get)
	mux.Handle("POST /api/v1/challenges", middleware.RequireAuth(http.HandlerFunc(chH.Create)))
	mux.Handle("PATCH /api/v1/challenges/{idOrSlug}", middleware.RequireAuth(http.HandlerFunc(chH.Update)))
	mux.Handle("POST /api/v1/challenges/{idOrSlug}/transition", middleware.RequireAuth(http.HandlerFunc(chH.Transition)))
	mux.Handle("POST /api/v1/challenges/{idOrSlug}/cover", middleware.RequireAuth(http.HandlerFunc(chH.SetCover)))
	mux.Handle("POST /api/v1/media/upload", middleware.RequireAuth(http.HandlerFunc(mediaH.Upload)))
	mux.HandleFunc("GET /api/v1/media/{id}", mediaH.GetMeta)
	mux.HandleFunc("GET /media/{id}", mediaH.Serve)
	mux.HandleFunc("GET /api/v1/live", mediaH.ListLive)
	mux.HandleFunc("GET /api/v1/challenges/{idOrSlug}/participants", partH.List)
	mux.Handle("POST /api/v1/challenges/{idOrSlug}/join", middleware.RequireAuth(http.HandlerFunc(partH.Join)))
	mux.Handle("POST /api/v1/challenges/{idOrSlug}/invites", middleware.RequireAuth(http.HandlerFunc(partH.Invite)))
	mux.Handle("POST /api/v1/participants/{id}/accept", middleware.RequireAuth(http.HandlerFunc(partH.Accept)))
	mux.Handle("POST /api/v1/participants/{id}/decline", middleware.RequireAuth(http.HandlerFunc(partH.Decline)))
	mux.Handle("GET /api/v1/me/invites", middleware.RequireAuth(http.HandlerFunc(partH.MyInvites)))
	mux.Handle("GET /api/v1/me/calendar", middleware.RequireAuth(http.HandlerFunc(partH.Calendar)))
	mux.Handle("GET /api/v1/me/notifications", middleware.RequireAuth(http.HandlerFunc(partH.Notifications)))
	mux.Handle("POST /api/v1/me/notifications/{id}/read", middleware.RequireAuth(http.HandlerFunc(partH.MarkNotificationRead)))

	mux.HandleFunc("GET /api/v1/slots", bookH.ListSlots)
	mux.Handle("POST /api/v1/bookings", middleware.RequireAuth(http.HandlerFunc(bookH.Create)))
	mux.Handle("GET /api/v1/me/bookings", middleware.RequireAuth(http.HandlerFunc(bookH.ListMine)))
	mux.Handle("POST /api/v1/bookings/{id}/cancel", middleware.RequireAuth(http.HandlerFunc(bookH.Cancel)))
	mux.HandleFunc("GET /api/v1/bookings/{id}/mock-checkout", bookH.MockCheckout)
	mux.HandleFunc("POST /api/v1/webhooks/mercadopago", bookH.MercadoPagoWebhook)
	mux.HandleFunc("GET /api/v1/webhooks/mercadopago", bookH.MercadoPagoWebhook)

	mux.Handle("GET /api/v1/ops/agenda", middleware.RequireAuth(http.HandlerFunc(opsH.Agenda)))
	mux.Handle("POST /api/v1/ops/check-in", middleware.RequireAuth(http.HandlerFunc(opsH.CheckIn)))
	mux.Handle("POST /api/v1/ops/challenges/{idOrSlug}/start", middleware.RequireAuth(http.HandlerFunc(opsH.StartChallenge)))
	mux.Handle("POST /api/v1/ops/challenges/{idOrSlug}/results", middleware.RequireAuth(http.HandlerFunc(opsH.UpsertResult)))
	mux.Handle("POST /api/v1/ops/results/{id}/validate", middleware.RequireAuth(http.HandlerFunc(opsH.ValidateResult)))
	mux.HandleFunc("GET /api/v1/challenges/{idOrSlug}/results", opsH.GetResult)
	mux.HandleFunc("GET /api/v1/rankings", opsH.Rankings)

	mux.Handle("GET /api/v1/admin/overview", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.Overview))))
	mux.Handle("GET /api/v1/admin/users", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.ListUsers))))
	mux.Handle("POST /api/v1/admin/users/{id}/roles", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.GrantRole))))
	mux.Handle("DELETE /api/v1/admin/users/{id}/roles", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.RevokeRole))))
	mux.Handle("GET /api/v1/admin/challenges", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.ListChallenges))))
	mux.Handle("GET /api/v1/admin/modalities", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.ListModalities))))
	mux.Handle("PATCH /api/v1/admin/modalities/{id}", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.SetModalityActive))))
	mux.Handle("GET /api/v1/admin/feature-flags", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.ListFlags))))
	mux.Handle("PATCH /api/v1/admin/feature-flags/{key}", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.SetFlag))))
	mux.Handle("GET /api/v1/admin/audit", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.ListAudit))))

	var handler http.Handler = mux
	handler = middleware.Authenticate(identitySvc)(handler)
	handler = middleware.CORS(cfg.CORSOrigins)(handler)
	return handler
}
