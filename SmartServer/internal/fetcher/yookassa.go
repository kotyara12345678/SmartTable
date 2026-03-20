package fetcher

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/rvinnie/yookassa-sdk-go/yookassa"
	yoocommon "github.com/rvinnie/yookassa-sdk-go/yookassa/common"
	yoopayment "github.com/rvinnie/yookassa-sdk-go/yookassa/payment"
	yoosettings "github.com/rvinnie/yookassa-sdk-go/yookassa/settings"
)

// YookassaRepository определяет контракт для работы с ЮKassa
type YookassaRepository interface {
	RegisterClient(shopID, secretKey string)
	GetInfoMagazine(ctx context.Context) (*yoosettings.Settings, error)
	CreatePayment(ctx context.Context, req CreatePaymentRequest) (*CreatePaymentResponse, error)
	GetPaymentInfo(ctx context.Context, paymentID string) (*yoopayment.Payment, error)
}

// CreatePaymentRequest содержит параметры для создания платежа
type CreatePaymentRequest struct {
	Value           string `json:"value"`
	Currency        string `json:"currency"`
	PaymentMethod   string `json:"payment_method"`
	Description     string `json:"description"`
	ReturnURL       string `json:"return_url"`
	PaymentMetadata map[string]string
}

// CreatePaymentResponse содержит результат создания платежа
type CreatePaymentResponse struct {
	PaymentID   string `json:"payment_id"`
	Status      string `json:"status"`
	ConfirmURL  string `json:"confirm_url"`
	Description string `json:"description"`
}

// Yookassa реализует YookassaRepository
type Yookassa struct {
	client *yookassa.Client
}

// NewYookassa создаёт новый экземпляр Yookassa
func NewYookassa(shopID, secretKey string) *Yookassa {
	return &Yookassa{
		client: yookassa.NewClient(shopID, secretKey),
	}
}

// RegisterClient регистрирует клиента с новыми учётными данными
func (y *Yookassa) RegisterClient(shopID, secretKey string) {
	y.client = yookassa.NewClient(shopID, secretKey)
}

// GetInfoMagazine получает информацию о магазине
func (y *Yookassa) GetInfoMagazine(ctx context.Context) (*yoosettings.Settings, error) {
	if y.client == nil {
		return nil, errors.New("yookassa client not initialized")
	}

	settingsHandler := yookassa.NewSettingsHandler(y.client)
	settings, err := settingsHandler.GetAccountSettings(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get shop info: %w", err)
	}

	return settings, nil
}

// CreatePayment создаёт платёж и возвращает URL для подтверждения
func (y *Yookassa) CreatePayment(ctx context.Context, req CreatePaymentRequest) (*CreatePaymentResponse, error) {
	if y.client == nil {
		return nil, errors.New("yookassa client not initialized")
	}

	// Валидация входных данных
	if err := validatePaymentRequest(req); err != nil {
		return nil, err
	}

	payments := yookassa.NewPaymentHandler(y.client)

	payment, err := payments.CreatePayment(ctx, &yoopayment.Payment{
		Amount: &yoocommon.Amount{
			Value:    req.Value,
			Currency: req.Currency,
		},
		PaymentMethod: yoopayment.PaymentMethodType(req.PaymentMethod),
		Confirmation: &yoopayment.Redirect{
			Type:      "redirect",
			ReturnURL: req.ReturnURL,
		},
		Description: req.Description,
		Metadata:    req.PaymentMetadata,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to create payment: %w", err)
	}

	// Извлекаем URL подтверждения
	confirmURL := ""
	if payment.Confirmation != nil {
		if redirect, ok := payment.Confirmation.(*yoopayment.Redirect); ok {
			confirmURL = redirect.ConfirmationURL
		}
	}

	return &CreatePaymentResponse{
		PaymentID:   payment.ID,
		Status:      string(payment.Status),
		ConfirmURL:  confirmURL,
		Description: payment.Description,
	}, nil
}

// GetPaymentInfo получает информацию о платеже по ID
func (y *Yookassa) GetPaymentInfo(ctx context.Context, paymentID string) (*yoopayment.Payment, error) {
	if y.client == nil {
		return nil, errors.New("yookassa client not initialized")
	}

	if paymentID == "" {
		return nil, errors.New("payment ID is required")
	}

	payments := yookassa.NewPaymentHandler(y.client)

	// Используем FindPayment для получения информации о платеже
	payment, err := payments.FindPayment(ctx, paymentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get payment info: %w", err)
	}

	return payment, nil
}

// CapturePayment подтверждает платёж (для отложенных платежей)
func (y *Yookassa) CapturePayment(ctx context.Context, paymentID string, amount *yoocommon.Amount) (*yoopayment.Payment, error) {
	if y.client == nil {
		return nil, errors.New("yookassa client not initialized")
	}

	payments := yookassa.NewPaymentHandler(y.client)

	payment := &yoopayment.Payment{
		ID:     paymentID,
		Amount: amount,
	}

	capturedPayment, err := payments.CapturePayment(ctx, payment)
	if err != nil {
		return nil, fmt.Errorf("failed to capture payment: %w", err)
	}

	return capturedPayment, nil
}

// WaitForPaymentStatus ожидает изменения статуса платежа (альтернатива webhook)
func (y *Yookassa) WaitForPaymentStatus(ctx context.Context, paymentID string, targetStatus string, timeout time.Duration) (*yoopayment.Payment, error) {
	ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctxWithTimeout.Done():
			return nil, ctxWithTimeout.Err()
		case <-ticker.C:
			payment, err := y.GetPaymentInfo(ctxWithTimeout, paymentID)
			if err != nil {
				return nil, err
			}

			if string(payment.Status) == targetStatus {
				return payment, nil
			}

			// Проверяем на неудачный статус
			if string(payment.Status) == "canceled" ||
				string(payment.Status) == "failed" {
				return payment, fmt.Errorf("payment failed with status: %s", payment.Status)
			}
		}
	}
}

// validatePaymentRequest проверяет корректность данных платежа
func validatePaymentRequest(req CreatePaymentRequest) error {
	if req.Value == "" {
		return errors.New("value is required")
	}
	if req.Currency == "" {
		return errors.New("currency is required")
	}
	if req.PaymentMethod == "" {
		return errors.New("payment method is required")
	}
	if req.ReturnURL == "" {
		return errors.New("return URL is required")
	}
	return nil
}
