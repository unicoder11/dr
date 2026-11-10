package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	_ = godotenv.Load("../../.env")
	_ = godotenv.Load(".env")

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	root := findMigrationsDir()
	files, err := filepath.Glob(filepath.Join(root, "*.sql"))
	if err != nil {
		log.Fatal(err)
	}
	if len(files) == 0 {
		log.Fatalf("no migrations in %s", root)
	}

	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	if err != nil {
		log.Fatal(err)
	}

	for _, f := range files {
		name := filepath.Base(f)
		var exists bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename=$1)`, name).Scan(&exists); err != nil {
			log.Fatal(err)
		}
		if exists {
			log.Printf("skip %s", name)
			continue
		}
		raw, err := os.ReadFile(f)
		if err != nil {
			log.Fatal(err)
		}
		up := extractUp(string(raw))
		tx, err := pool.Begin(ctx)
		if err != nil {
			log.Fatal(err)
		}
		if _, err := tx.Exec(ctx, up); err != nil {
			_ = tx.Rollback(ctx)
			log.Fatalf("apply %s: %v", name, err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (filename) VALUES ($1)`, name); err != nil {
			_ = tx.Rollback(ctx)
			log.Fatal(err)
		}
		if err := tx.Commit(ctx); err != nil {
			log.Fatal(err)
		}
		log.Printf("applied %s", name)
	}
	fmt.Println("migrations complete")
}

func extractUp(sql string) string {
	const markerDown = "-- +goose Down"
	idx := strings.Index(sql, markerDown)
	if idx >= 0 {
		sql = sql[:idx]
	}
	sql = strings.ReplaceAll(sql, "-- +goose Up", "")
	return strings.TrimSpace(sql)
}

func findMigrationsDir() string {
	candidates := []string{
		"migrations",
		"apps/api/migrations",
		filepath.Join("..", "..", "migrations"),
	}
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && st.IsDir() {
			return c
		}
	}
	return "migrations"
}
