package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/desafiosreais/dr/apps/api/internal/config"
	httpapi "github.com/desafiosreais/dr/apps/api/internal/http"
	"github.com/desafiosreais/dr/apps/api/internal/infra/postgres"
	"github.com/desafiosreais/dr/apps/api/internal/modules/identity"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load("../../.env")
	_ = godotenv.Load(".env")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()
	var pool *pgxpool.Pool
	if cfg.DatabaseURL != "" {
		pool, err = postgres.Connect(ctx, cfg.DatabaseURL)
		if err != nil {
			log.Printf("warn: postgres unavailable at startup: %v", err)
		} else {
			idSvc := identity.NewService(pool)
			if err := idSvc.EnsureAdmin(ctx, cfg.AdminEmail, cfg.AdminPassword, cfg.AdminUsername); err != nil {
				log.Printf("warn: ensure admin: %v", err)
			}
		}
	} else {
		log.Printf("warn: DATABASE_URL empty — auth routes need DB")
	}

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           httpapi.NewRouter(cfg, pool),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("api listening on %s (env=%s)", cfg.Addr, cfg.AppEnv)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	if pool != nil {
		pool.Close()
	}
}
