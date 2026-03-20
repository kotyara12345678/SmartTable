package main

import (
	"SmartServer/internal/fetcher"
	"SmartServer/pkg/requets"

	"github.com/gin-gonic/gin"
	yoocommon "github.com/rvinnie/yookassa-sdk-go/yookassa/common"
)

// GetInfoMagazineHandler получает информацию о магазине ЮKassa
func GetInfoMagazineHandler(c *gin.Context) {
	// Получаем учётные данные из заголовков или конфигурации
	shopID := c.GetHeader("X-Shop-ID")
	secretKey := c.GetHeader("X-Secret-Key")

	if shopID == "" || secretKey == "" {
		c.JSON(400, gin.H{
			"info":    "missing credentials",
			"message": "X-Shop-ID and X-Secret-Key headers are required",
		})
		return
	}

	yooRepo := fetcher.NewYookassa(shopID, secretKey)

	magazine, err := yooRepo.GetInfoMagazine(c.Request.Context())
	if err != nil {
		c.JSON(400, gin.H{
			"info":    "failed to get info magazine",
			"message": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"status": "success",
		"data":   magazine,
	})
	return
}

// CreatePaymentRequestHandler создаёт платёж в ЮKassa
func CreatePaymentRequestHandler(c *gin.Context) {
	// Получаем учётные данные из заголовков
	shopID := c.GetHeader("X-Shop-ID")
	secretKey := c.GetHeader("X-Secret-Key")

	if shopID == "" || secretKey == "" {
		c.JSON(400, gin.H{
			"info":    "missing credentials",
			"message": "X-Shop-ID and X-Secret-Key headers are required",
		})
		return
	}

	var subReq requets.SubRequest
	err := c.ShouldBindJSON(&subReq)
	if err != nil {
		c.JSON(400, gin.H{
			"info":    "invalid request body",
			"message": err.Error(),
		})
		return
	}

	yooRepo := fetcher.NewYookassa(shopID, secretKey)

	paymentReq := fetcher.CreatePaymentRequest{
		Value:         subReq.Price,
		Currency:      subReq.Currency,
		PaymentMethod: subReq.PaymentMethodType,
		Description:   subReq.DescSub,
		ReturnURL:     subReq.ReturnURL,
	}

	response, err := yooRepo.CreatePayment(c.Request.Context(), paymentReq)
	if err != nil {
		c.JSON(400, gin.H{
			"info":    "failed to create payment",
			"message": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"status": "success",
		"data":   response,
	})
	return
}

// GetPaymentInfoHandler получает информацию о платеже
func GetPaymentInfoHandler(c *gin.Context) {
	shopID := c.GetHeader("X-Shop-ID")
	secretKey := c.GetHeader("X-Secret-Key")

	if shopID == "" || secretKey == "" {
		c.JSON(400, gin.H{
			"info":    "missing credentials",
			"message": "X-Shop-ID and X-Secret-Key headers are required",
		})
		return
	}

	paymentID := c.Param("paymentId")
	if paymentID == "" {
		c.JSON(400, gin.H{
			"info":    "missing payment ID",
			"message": "payment ID is required",
		})
		return
	}

	yooRepo := fetcher.NewYookassa(shopID, secretKey)

	payment, err := yooRepo.GetPaymentInfo(c.Request.Context(), paymentID)
	if err != nil {
		c.JSON(400, gin.H{
			"info":    "failed to get payment info",
			"message": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"status": "success",
		"data":   payment,
	})
	return
}

// CapturePaymentHandler подтверждает отложенный платёж
func CapturePaymentHandler(c *gin.Context) {
	shopID := c.GetHeader("X-Shop-ID")
	secretKey := c.GetHeader("X-Secret-Key")

	if shopID == "" || secretKey == "" {
		c.JSON(400, gin.H{
			"info":    "missing credentials",
			"message": "X-Shop-ID and X-Secret-Key headers are required",
		})
		return
	}

	var req struct {
		PaymentID string `json:"payment_id"`
		Amount    string `json:"amount"`
		Currency  string `json:"currency"`
	}

	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(400, gin.H{
			"info":    "invalid request body",
			"message": err.Error(),
		})
		return
	}

	yooRepo := fetcher.NewYookassa(shopID, secretKey)

	amount := &yoocommon.Amount{
		Value:    req.Amount,
		Currency: req.Currency,
	}

	payment, err := yooRepo.CapturePayment(c.Request.Context(), req.PaymentID, amount)
	if err != nil {
		c.JSON(400, gin.H{
			"info":    "failed to capture payment",
			"message": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"status": "success",
		"data":   payment,
	})
	return
}
