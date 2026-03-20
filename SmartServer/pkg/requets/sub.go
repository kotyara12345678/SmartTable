package requets

import "github.com/google/uuid"

type SubRequest struct {
	Id                uuid.UUID `json:"id,omitempty"`
	Type              string    `json:"type"`
	NameSub           string    `json:"name"`
	Price             string    `json:"price"`
	Currency          string    `json:"currency"`
	PaymentMethodType string    `json:"payment_method_type"`
	DescSub           string    `json:"description"`
	Features          string    `json:"features,omitempty"`
	UserId            uuid.UUID `json:"user_id,omitempty"`
	ReturnURL         string    `json:"return_url,omitempty"`
}

type SubResponse struct {
	Id        uuid.UUID `json:"id"`
	Type      string    `json:"type"`
	NameSub   string    `json:"name"`
	Price     float64   `json:"price"`
	DescSub   string    `json:"description"`
	Features  string    `json:"features,omitempty"`
	HasAccess bool      `json:"has_access"`
}
