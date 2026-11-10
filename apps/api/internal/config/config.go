package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Addr              string
	PublicURL         string
	SiteURL           string
	AppEnv            string
	DatabaseURL       string
	RedisURL          string
	SessionSecret     string
	CORSOrigins       []string
	AdminEmail        string
	AdminPassword     string
	AdminUsername     string
	FlagP2PPrizes     bool
	MPAccessToken     string
	MPWebhookSecret   string
	MediaDir          string
}

func Load() (Config, error) {
	cfg := Config{
		Addr:            getEnv("API_ADDR", ":8080"),
		PublicURL:       getEnv("API_PUBLIC_URL", "http://localhost:8080"),
		SiteURL:         getEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
		AppEnv:          getEnv("APP_ENV", "development"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		RedisURL:        getEnv("REDIS_URL", "redis://localhost:6379/0"),
		SessionSecret:   os.Getenv("SESSION_SECRET"),
		CORSOrigins:     splitCSV(getEnv("CORS_ORIGINS", "http://localhost:3000")),
		AdminEmail:      os.Getenv("ADMIN_EMAIL"),
		AdminPassword:   os.Getenv("ADMIN_PASSWORD"),
		AdminUsername:   getEnv("ADMIN_USERNAME", "admin"),
		FlagP2PPrizes:   getEnvBool("FLAG_PAYMENTS_P2P_PRIZES", false),
		MPAccessToken:   os.Getenv("MERCADOPAGO_ACCESS_TOKEN"),
		MPWebhookSecret: os.Getenv("MERCADOPAGO_WEBHOOK_SECRET"),
		MediaDir:        getEnv("MEDIA_DIR", "data/uploads"),
	}

	if cfg.SessionSecret == "" {
		if cfg.AppEnv == "production" {
			return Config{}, fmt.Errorf("SESSION_SECRET is required in production")
		}
		cfg.SessionSecret = "dev-only-insecure-session-secret"
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
