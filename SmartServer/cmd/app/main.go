package main

import (
	"SmartServer/internal/core/service"
	"SmartServer/pkg/requets"
	"github.com/gin-gonic/gin"
)

func main() {
	//database.InitDb()
	r := gin.Default()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Hello World",
		})
		return
	})

	r.POST("/reg", func(c *gin.Context) {
		var req requets.UserRequest
		var userRepo service.UserRepository
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(500, gin.H{
				"status":  "failed",
				"message": err.Error(),
			})
			return
		}

		err := userRepo.Reg(req)
		if err != nil {
			c.JSON(500, gin.H{
				"status":  "failed",
				"message": err.Error(),
			})
			return
		}

		c.JSON(200, gin.H{
			"status": "success",
		})
		return
	})

	r.POST("/auth", func(c *gin.Context) {
		var req requets.UserRequest
		var userRepo service.UserRepository

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(500, gin.H{
				"status":  "failed",
				"message": err.Error(),
			})
			return
		}

		err := userRepo.Auth(req)
		if err != nil {
			c.JSON(500, gin.H{
				"status":  "failed",
				"message": err.Error(),
			})
			return
		}

		c.JSON(200, gin.H{
			"status": "success",
		})
		return
	})

	r.Run(":8080")
}
