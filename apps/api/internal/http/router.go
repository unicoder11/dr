package httpapi

import (
	"net/http"

	"github.com/desafiosreais/dr/apps/api/internal/config"
	"github.com/desafiosreais/dr/apps/api/internal/http/handlers"
	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/modules/admin"
	"github.com/desafiosreais/dr/apps/api/internal/modules/challenges"
	"github.com/desafiosreais/dr/apps/api/internal/modules/identity"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewRouter(cfg config.Config, db *pgxpool.Pool) http.Handler {
	mux := http.NewServeMux()

	identitySvc := identity.NewService(db)
	adminSvc := admin.NewService(db)
	challengeSvc := challenges.NewService(db)

	health := handlers.HealthHandler{DB: db}
	authH := handlers.AuthHandler{Identity: identitySvc, Secure: cfg.AppEnv == "production"}
	adminH := handlers.AdminHandler{Admin: adminSvc}
	usersH := handlers.UsersHandler{DB: db}
	chH := handlers.ChallengesHandler{Svc: challengeSvc}

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

	mux.Handle("GET /api/v1/admin/users", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.ListUsers))))
	mux.Handle("POST /api/v1/admin/users/{id}/roles", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.GrantRole))))
	mux.Handle("GET /api/v1/admin/feature-flags", middleware.RequireAuth(middleware.RequireAdmin(http.HandlerFunc(adminH.ListFlags))))

	var handler http.Handler = mux
	handler = middleware.Authenticate(identitySvc)(handler)
	handler = middleware.CORS(cfg.CORSOrigins)(handler)
	return handler
}
