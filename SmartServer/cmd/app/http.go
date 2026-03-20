package main

import (
	"SmartServer/internal/core/service"
	"SmartServer/pkg/models"
	"SmartServer/pkg/requets"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func RegisterRouters(port string) {
	r := gin.Default()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	subService := &service.SubService{}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Hello World",
		})
		return
	})

	// === Подписки ===
	r.GET("/subscriptions", func(c *gin.Context) {
		subs, err := subService.GetAllSubs()
		if err != nil {
			c.JSON(500, gin.H{
				"status":  "failed",
				"message": err.Error(),
			})
			return
		}

		c.JSON(200, gin.H{
			"status": "success",
			"data":   subs,
		})
		return
	})

	r.GET("/subscription/:id", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{
				"status":  "failed",
				"message": "Invalid subscription id",
			})
			return
		}

		req := requets.SubRequest{Id: id}
		sub, err := subService.GetSub(req)
		if err != nil {
			c.JSON(500, gin.H{
				"status":  "failed",
				"message": err.Error(),
			})
			return
		}

		c.JSON(200, gin.H{
			"status": "success",
			"data":   sub,
		})
		return
	})

	r.POST("/subscription", func(c *gin.Context) {
		var req requets.SubRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"status":  "failed",
				"message": err.Error(),
			})
			return
		}

		err := subService.CreateSub(req)
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

	r.PUT("/subscription/:id", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{
				"status":  "failed",
				"message": "Invalid subscription id",
			})
			return
		}

		var req requets.SubRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"status":  "failed",
				"message": err.Error(),
			})
			return
		}
		req.Id = id

		err = subService.UpdateSub(req)
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

	r.DELETE("/subscription/:id", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{
				"status":  "failed",
				"message": "Invalid subscription id",
			})
			return
		}

		req := requets.SubRequest{Id: id}
		err = subService.DeleteSub(req)
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

	// === Проверка доступа пользователя к подписке ===
	r.GET("/user/:userId/subscription/check/:subType", func(c *gin.Context) {
		userId, err := uuid.Parse(c.Param("userId"))
		if err != nil {
			c.JSON(400, gin.H{
				"status":  "failed",
				"message": "Invalid user id",
			})
			return
		}

		subType := models.SubscriptionType(c.Param("subType"))
		if subType != models.SubscriptionTypeFree && subType != models.SubscriptionTypePro {
			c.JSON(400, gin.H{
				"status":  "failed",
				"message": "Invalid subscription type (use 'free' or 'pro')",
			})
			return
		}

		hasAccess, err := subService.CheckUserAccess(userId, subType)
		if err != nil {
			c.JSON(500, gin.H{
				"status":  "failed",
				"message": err.Error(),
			})
			return
		}

		c.JSON(200, gin.H{
			"status":     "success",
			"has_access": hasAccess,
		})
		return
	})

	// === Получить подписку пользователя ===
	r.GET("/user/:userId/subscription", func(c *gin.Context) {
		userId, err := uuid.Parse(c.Param("userId"))
		if err != nil {
			c.JSON(400, gin.H{
				"status":  "failed",
				"message": "Invalid user id",
			})
			return
		}

		sub, err := subService.GetUserSubscription(userId)
		if err != nil {
			c.JSON(500, gin.H{
				"status":  "failed",
				"message": err.Error(),
			})
			return
		}

		c.JSON(200, gin.H{
			"status": "success",
			"data":   sub,
		})
		return
	})

	// === Назначить подписку пользователю ===
	r.POST("/user/:userId/subscription/:subId", func(c *gin.Context) {
		userId, err := uuid.Parse(c.Param("userId"))
		if err != nil {
			c.JSON(400, gin.H{
				"status":  "failed",
				"message": "Invalid user id",
			})
			return
		}

		subId, err := uuid.Parse(c.Param("subId"))
		if err != nil {
			c.JSON(400, gin.H{
				"status":  "failed",
				"message": "Invalid subscription id",
			})
			return
		}

		err = subService.AssignSubscription(userId, subId)
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

	// YOOKASSA

	r.GET("/get/info/kassa", GetInfoMagazineHandler)

	r.POST("/api/by/subscription", CreatePaymentRequestHandler)

	err := r.Run(port)
	if err != nil {
		log.Fatal(err)
	}
}
