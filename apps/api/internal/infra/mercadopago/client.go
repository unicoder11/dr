package mercadopago

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	AccessToken string
	HTTP        *http.Client
}

func New(accessToken string) *Client {
	return &Client{
		AccessToken: accessToken,
		HTTP:        &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *Client) Enabled() bool {
	return c != nil && c.AccessToken != ""
}

type PreferenceItem struct {
	Title     string  `json:"title"`
	Quantity  int     `json:"quantity"`
	Currency  string  `json:"currency_id"`
	UnitPrice float64 `json:"unit_price"`
}

type PreferenceRequest struct {
	Items             []PreferenceItem `json:"items"`
	ExternalReference string           `json:"external_reference"`
	NotificationURL   string           `json:"notification_url,omitempty"`
	BackURLs          map[string]string `json:"back_urls,omitempty"`
	AutoReturn        string           `json:"auto_return,omitempty"`
}

type PreferenceResponse struct {
	ID       string `json:"id"`
	InitPoint string `json:"init_point"`
	SandboxInitPoint string `json:"sandbox_init_point"`
}

func (c *Client) CreatePreference(ctx context.Context, req PreferenceRequest) (PreferenceResponse, error) {
	if !c.Enabled() {
		return PreferenceResponse{}, fmt.Errorf("mercadopago token not configured")
	}
	body, err := json.Marshal(req)
	if err != nil {
		return PreferenceResponse{}, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.mercadopago.com/checkout/preferences", bytes.NewReader(body))
	if err != nil {
		return PreferenceResponse{}, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.AccessToken)
	httpReq.Header.Set("Content-Type", "application/json")

	res, err := c.HTTP.Do(httpReq)
	if err != nil {
		return PreferenceResponse{}, err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return PreferenceResponse{}, fmt.Errorf("mp preference status %d: %s", res.StatusCode, string(raw))
	}
	var out PreferenceResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return PreferenceResponse{}, err
	}
	return out, nil
}

type Payment struct {
	ID                int64  `json:"id"`
	Status            string `json:"status"`
	ExternalReference string `json:"external_reference"`
}

func (c *Client) GetPayment(ctx context.Context, paymentID string) (Payment, json.RawMessage, error) {
	if !c.Enabled() {
		return Payment{}, nil, fmt.Errorf("mercadopago token not configured")
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.mercadopago.com/v1/payments/"+paymentID, nil)
	if err != nil {
		return Payment{}, nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.AccessToken)
	res, err := c.HTTP.Do(httpReq)
	if err != nil {
		return Payment{}, nil, err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return Payment{}, raw, fmt.Errorf("mp payment status %d: %s", res.StatusCode, string(raw))
	}
	var p Payment
	if err := json.Unmarshal(raw, &p); err != nil {
		return Payment{}, raw, err
	}
	return p, raw, nil
}
