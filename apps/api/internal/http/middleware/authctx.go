package middleware

import (
	"context"
	"net/http"

	"github.com/desafiosreais/dr/apps/api/internal/auth"
	"github.com/desafiosreais/dr/apps/api/internal/modules/identity"
)

type ctxKey string

const userKey ctxKey = "user"

func WithUser(ctx context.Context, u identity.User) context.Context {
	return context.WithValue(ctx, userKey, u)
}

func UserFromContext(ctx context.Context) (identity.User, bool) {
	u, ok := ctx.Value(userKey).(identity.User)
	return u, ok
}

func Authenticate(identitySvc *identity.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, err := r.Cookie(auth.SessionCookieName)
			if err == nil && c.Value != "" {
				if u, err := identitySvc.UserFromSession(r.Context(), c.Value); err == nil {
					r = r.WithContext(WithUser(r.Context(), u))
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := UserFromContext(r.Context()); !ok {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, ok := UserFromContext(r.Context())
		if !ok || !auth.HasRole(u.Roles, auth.RoleAdmin) {
			http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
