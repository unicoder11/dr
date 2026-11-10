package httpapi

import (
	"net/http"

	"github.com/desafiosreais/dr/apps/api/internal/config"
	"github.com/desafiosreais/dr/apps/api/internal/http/handlers"
	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/modules/admin"
	"github.com/desafiosreais/dr/apps/api/internal/modules/challenges"
	"github.com/desafiosreais/dr/apps/api/internal/modules/identity"
	"github.com/desafiosreais/dr/apps/api/internal/modules/notifications"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewRouter(cfg config.Config, db *pgxpool.Pool) http.Handler {
	mux := http.NewServeMux()

	identitySvc := identity.NewService(db)
	adminSvc := admin.NewService(db)
	challengeSvc := challenges.NewService(db)
	notifSvc := notifications.NewService(db)

	health := handlers.HealthHandler{DB: db}
	authH := handlers.AuthHandler{Identity: identitySvc, Secure: cfg.AppEnv == "production"}
	adminH := handlers.AdminHandler{Admin: adminSvc}
	usersH := handlers.UsersHandler{DB: db}
	chH := handlers.ChallengesHandler{Svc: challengeSvc}
	partH := handlers.ParticipantsHandler{Challenges: challengeSvc, Notifs: notifSvc}

	mux.HandleFunc("GET /healthz", health.Healthz)
	mux.HandleFunc("GET /readyz", health.Readyz)

	mux.HandleFunc("POST /api/v1/auth/register", authH.Register)
	mux.HandleFunc("POST /api/v1/auth/login", authH.Login)
	mux.HandleFunc("POST /api/v1/auth/logout", authH.Logout)
	mux.Handle("GET /api/v1/auth/me", middleware.RequireAuth(http.HandlerFunc(authH.Me)))

	mux.HandleFunc("GET /api/v1/users/{username}", usersH.GetByUsername)
	mux.Handle("PATCH /api/v1/me/profile", middleware.RequireAuth(http.HandlerFunc(usersH.UpdateMe)))

	mux.HandleFunc("GET /api/v1/modalities", chH.ListModalities)
	mux.HandleFunc("GET /api/v1/arenas", chH.ListArenas)
	mux.HandleFunc("GET /api/v1/challenges", chH.List)
	mux.HandleFunc("GET /api/v1/challenges/{idOrSlug}", chH.Get)
	mux.Handle("POST /api/v1/challenges", middleware.RequireAuth(http.HandlerFunc(chH.Create)))
	mux.Handle("PATCH /api/v1/challenges/{idOrSlug}", middleware.RequireAuth(http.HandlerFunc(chH.Update)))
	mux.Handle("POST /api/v1/challenges/{idOrSlug}/transition", middleware.RequireAuth(http.HandlerFunc(chH.Transition)))
	mux.HandleFunc("GET /api/v1/challenges/{idOrSlug}/participants", partH.List)
	mux.Handle("POST /api/v1/challenges/{idOrSlug}/join", middleware.RequireAuth(http.HandlerFunc(partH.Join)))
	mux.Handle("POST /api/v1/challenges/{idOrSlug}/invites", middleware.RequireAuth(http.HandlerFunc(partH.Invite)))
	mux.Handle("POST /api/v1/participants/{id}/accept", middleware.RequireAuth(http.HandlerFunc(partH.Accept)))
	mux.Handle("POST /api/v1/participants/{id}/decline", middleware.RequireAuth(http.HandlerFunc(partH.Decline)))
	mux.Handle("GET /api/v1/me/invites", middleware.RequireAuth(http.HandlerFunc(partH.MyInvites)))
	mux.Handle("GET /api/v1/me/calendar", middleware.RequireAuth(http.HandlerFunc(partH.Calendar)))
	mux.Handle("GET /api/v1/me/notifications", middleware.RequireAuth(http.HandlerFunc(partH.Notifications)))
	mux.Handle("POST /api/v1/me/notifications/{id}/read", middleware.RequireAuth(http.HandlerFunc(partH.MarkNotificationRead)))

	mux.Handle("GET /api/v1/admin/users", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.ListUsers))))
	mux.Handle("POST /api/v1/admin/users/{id}/roles", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.GrantRole))))
	mux.Handle("GET /api/v1/admin/feature-flags", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.ListFlags))))

	var handler http.Handler = mux
	handler = middleware.Authenticate(identitySvc)(handler)
	handler = middleware.CORS(cfg.CORSOrigins)(handler)
	return handler
}
