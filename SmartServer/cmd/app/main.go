package main

import (
	"SmartServer/internal/fetcher"
	"SmartServer/pkg/database"
	"github.com/Payel-git-ol/azure/env"
)

func main() {
	database.InitDb()
	port := env.MustGet("APP_PORT", "3663")
	idMagazine := env.MustGet("IDMAGAZINE", "")
	secretKey := env.MustGet("SERCETKEYMAGAZINE", "")

	var yookassaRepository fetcher.YookassaRepository

	yookassaRepository.RegisterClient(idMagazine, secretKey)

	RegisterRouters(port)
}
