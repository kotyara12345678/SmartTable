package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SubscriptionType string

const (
	SubscriptionTypeFree SubscriptionType = "free"
	SubscriptionTypePro  SubscriptionType = "pro"
)

type SubModel struct {
	gorm.Model
	Id                uuid.UUID        `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	Type              SubscriptionType `gorm:"type:varchar(50);unique;not null"`
	NameSub           string           `json:"name"`
	Price             string           `json:"price"`
	Currency          string           `json:"currency"`
	PaymentMethodType string           `json:"payment_method_type"`
	DescSub           string           `json:"description"`
	Features          string           `json:"features,omitempty"`
	UserId            uuid.UUID        `json:"user_id,omitempty"`
}
