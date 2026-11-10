package resend

import (
	"fmt"
	"html"
	"strings"
)

func Welcome(displayName, username, siteURL string) (subject, htmlBody, textBody string) {
	name := strings.TrimSpace(displayName)
	if name == "" {
		name = strings.TrimSpace(username)
	}
	if name == "" {
		name = "piloto"
	}
	handle := strings.TrimSpace(username)
	hubURL := strings.TrimRight(strings.TrimSpace(siteURL), "/")
	if hubURL == "" {
		hubURL = "http://localhost:3000"
	}
	hubURL += "/app"

	subject = "Sua conta foi criada com sucesso"
	textBody = fmt.Sprintf(`Olá, %s!

Sua conta no DESAFIOS REAIS foi criada com sucesso.

Você já está pronto pra descobrir desafios, criar confrontos e competir.

Usuário: @%s
Abrir minha área: %s

Se você não criou esta conta, ignore este e-mail.

Desafie. Compita. Vença.
Equipe Desafios Reais
`, name, handle, hubURL)

	htmlBody = fmt.Sprintf(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>%s</title></head>
<body style="margin:0;padding:0;background:#17191D;color:#F5F5F2;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#17191D;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1E2126;border:1px solid #454B52;border-radius:12px;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#C7F000;">Desafios Reais</p>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.15;color:#F5F5F2;">Sua conta foi criada com sucesso</h1>
        </td></tr>
        <tr><td style="padding:8px 28px 24px;font-size:16px;line-height:1.5;color:#C9CDD3;">
          <p>Olá, <strong style="color:#F5F5F2;">%s</strong>!</p>
          <p>Sua conta no DESAFIOS REAIS foi criada com sucesso. Você já pode descobrir desafios, criar confrontos e competir.</p>
          <p style="margin:20px 0;padding:12px 14px;background:#17191D;border-radius:8px;color:#F5F5F2;">Usuário: <strong>@%s</strong></p>
          <p style="margin:24px 0;">
            <a href="%s" style="display:inline-block;background:#C7F000;color:#17191D;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px;">Abrir minha área</a>
          </p>
          <p style="font-size:13px;color:#C9CDD3;">Se você não criou esta conta, ignore este e-mail.</p>
        </td></tr>
        <tr><td style="padding:0 28px 28px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#D69A48;">
          Desafie. Compita. Vença.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
		html.EscapeString(subject),
		html.EscapeString(name),
		html.EscapeString(handle),
		html.EscapeString(hubURL),
	)
	return subject, htmlBody, textBody
}
