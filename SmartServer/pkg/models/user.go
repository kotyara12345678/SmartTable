package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Id             uuid.UUID `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	SubscriptionId uuid.UUID `gorm:"type:uuid"`
	Username       string    `gorm:"type:varchar(255);unique;not null"`
	Password       string    `gorm:"type:varchar(255);not null"`
	Email          string    `gorm:"type:varchar(255);unique;not null"`
}
