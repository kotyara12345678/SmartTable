package database

import (
	"SmartServer/pkg/models"
	"log"

	"github.com/Payel-git-ol/azure/env"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var Db *gorm.DB

func InitDb() {
	dns := env.MustGet("DATABASE_DNS", "")

	var err error
	Db, err = gorm.Open(postgres.Open(dns))
	if err != nil {
		log.Fatal(err)
	}

	err = Db.AutoMigrate(&models.User{}, &models.SubModel{})
	if err != nil {
		return
	}
}
