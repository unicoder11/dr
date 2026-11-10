package handlers

import (
	"bytes"
	"errors"
	"io"
	"net/http"

	"github.com/desafiosreais/dr/apps/api/internal/http/middleware"
	"github.com/desafiosreais/dr/apps/api/internal/modules/media"
	"github.com/google/uuid"
)

type MediaHandler struct {
	Svc *media.Service
}

func (h MediaHandler) Upload(w http.ResponseWriter, r *http.Request) {
	u, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, media.MaxUploadBytes+1024)
	if err := r.ParseMultipartForm(media.MaxUploadBytes + 1024); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_multipart"})
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "file_required"})
		return
	}
	defer file.Close()

	sample := make([]byte, 512)
	n, _ := io.ReadFull(file, sample)
	sample = sample[:n]
	ct := media.DetectContentType(header.Header.Get("Content-Type"), sample)
	reader := io.MultiReader(bytes.NewReader(sample), file)

	asset, err := h.Svc.Upload(
		r.Context(),
		media.Actor{ID: u.ID, Roles: u.Roles},
		reader,
		ct,
		r.FormValue("purpose"),
		r.FormValue("title"),
		header.Size,
	)
	if err != nil {
		mapMediaErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, asset)
}

func (h MediaHandler) GetMeta(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_id"})
		return
	}
	viewer := media.Actor{}
	if u, ok := middleware.UserFromContext(r.Context()); ok {
		viewer = media.Actor{ID: u.ID, Roles: u.Roles}
	}
	asset, err := h.Svc.Get(r.Context(), id, viewer)
	if err != nil {
		mapMediaErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, asset)
}

func (h MediaHandler) Serve(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	asset, f, err := h.Svc.OpenFile(r.Context(), id)
	if err != nil {
		if errors.Is(err, media.ErrNotFound) || errors.Is(err, media.ErrForbidden) {
			http.NotFound(w, r)
			return
		}
		http.Error(w, "internal", http.StatusInternalServerError)
		return
	}
	defer f.Close()
	w.Header().Set("Content-Type", asset.ContentType)
	w.Header().Set("Cache-Control", "public, max-age=86400")
	http.ServeContent(w, r, asset.BucketKey, asset.CreatedAt, f)
}

func (h MediaHandler) ListLive(w http.ResponseWriter, r *http.Request) {
	list, err := h.Svc.ListLive(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func mapMediaErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, media.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	case errors.Is(err, media.ErrForbidden):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
	case errors.Is(err, media.ErrTooLarge):
		writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "too_large"})
	case errors.Is(err, media.ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_input"})
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
}
