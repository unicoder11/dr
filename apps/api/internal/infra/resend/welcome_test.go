package resend

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWelcomePortuguese(t *testing.T) {
	subject, htmlBody, textBody := Welcome(`Ana <script>`, "ana_kart", "https://desafiosreais.com")
	if subject != "Sua conta foi criada com sucesso" {
		t.Fatalf("subject: %s", subject)
	}
	for _, part := range []string{htmlBody, textBody} {
		if !strings.Contains(part, "foi criada com sucesso") {
			t.Fatalf("missing success copy: %s", part)
		}
		if !strings.Contains(part, "ana_kart") {
			t.Fatalf("missing username: %s", part)
		}
	}
	if strings.Contains(htmlBody, "<script>") {
		t.Fatal("display name was not escaped")
	}
	if !strings.Contains(htmlBody, "https://desafiosreais.com/entrar") {
		t.Fatal("missing login url")
	}
}

func TestSend(t *testing.T) {
	var gotAuth, gotBody string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		raw, _ := io.ReadAll(r.Body)
		gotBody = string(raw)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":"email_1"}`))
	}))
	defer srv.Close()

	c := New("re_test", "Desafios Reais <onboarding@resend.dev>")
	c.APIURL = srv.URL
	err := c.Send(context.Background(), "piloto@exemplo.com", "assunto", "<p>oi</p>", "oi")
	if err != nil {
		t.Fatal(err)
	}
	if gotAuth != "Bearer re_test" {
		t.Fatalf("auth: %s", gotAuth)
	}
	if !strings.Contains(gotBody, "piloto@exemplo.com") || !strings.Contains(gotBody, "Desafios Reais") {
		t.Fatalf("body: %s", gotBody)
	}
}
