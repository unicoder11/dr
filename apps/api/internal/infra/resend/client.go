package resend

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const defaultAPIURL = "https://api.resend.com/emails"

type Client struct {
	APIKey string
	From   string
	APIURL string
	HTTP   *http.Client
}

func New(apiKey, from string) *Client {
	return &Client{
		APIKey: strings.TrimSpace(apiKey),
		From:   strings.TrimSpace(from),
		APIURL: defaultAPIURL,
		HTTP:   &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Enabled() bool {
	return c != nil && c.APIKey != "" && c.From != ""
}

type message struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
	Text    string   `json:"text,omitempty"`
}

func (c *Client) Send(ctx context.Context, to, subject, htmlBody, textBody string) error {
	if !c.Enabled() {
		return fmt.Errorf("resend não configurado")
	}
	to = strings.TrimSpace(to)
	if to == "" {
		return fmt.Errorf("destinatário vazio")
	}
	body, err := json.Marshal(message{
		From:    c.From,
		To:      []string{to},
		Subject: subject,
		HTML:    htmlBody,
		Text:    textBody,
	})
	if err != nil {
		return err
	}
	endpoint := c.APIURL
	if endpoint == "" {
		endpoint = defaultAPIURL
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
	if res.StatusCode >= 300 {
		return fmt.Errorf("resend status %d: %s", res.StatusCode, strings.TrimSpace(string(raw)))
	}
	return nil
}
