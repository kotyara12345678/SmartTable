package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"SmartServer/pkg/requets"

	"github.com/google/uuid"
)

// Тесты на получение всех подписок
func TestHTTP_GetAllSubscriptions(t *testing.T) {
	CleanupDB(t)

	SetupTestSub(t)
	SetupTestProSub(t)

	req, _ := http.NewRequest("GET", "/subscriptions", nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["status"] != "success" {
		t.Errorf("Expected status success, got %v", response["status"])
	}

	data, ok := response["data"].([]interface{})
	if !ok {
		t.Fatal("Expected data to be an array")
	}

	if len(data) != 2 {
		t.Errorf("Expected 2 subscriptions, got %d", len(data))
	}
}

// Тесты на получение подписки по ID
func TestHTTP_GetSubscriptionByID(t *testing.T) {
	CleanupDB(t)

	subId := SetupTestSub(t)

	req, _ := http.NewRequest("GET", "/subscription/"+subId.String(), nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["status"] != "success" {
		t.Errorf("Expected status success, got %v", response["status"])
	}
}

func TestHTTP_GetSubscriptionByID_InvalidUUID(t *testing.T) {
	CleanupDB(t)

	req, _ := http.NewRequest("GET", "/subscription/invalid-uuid", nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}

func TestHTTP_GetSubscriptionByID_NotFound(t *testing.T) {
	CleanupDB(t)

	randomId := uuid.New()
	req, _ := http.NewRequest("GET", "/subscription/"+randomId.String(), nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status 500, got %d", w.Code)
	}
}

// Тесты на создание подписки
func TestHTTP_CreateSubscription(t *testing.T) {
	CleanupDB(t)

	reqBody := requets.SubRequest{
		Type:     "free",
		NameSub:  "Free Test",
		Price:    "0",
		DescSub:  "Free test description",
		Features: "Test features",
	}
	body, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/subscription", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["status"] != "success" {
		t.Errorf("Expected status success, got %v", response["status"])
	}

	subs, _ := TestService.GetAllSubs()
	if len(subs) != 1 {
		t.Error("Subscription not created after HTTP request")
	}
}

func TestHTTP_CreateSubscription_InvalidJSON(t *testing.T) {
	CleanupDB(t)

	req, _ := http.NewRequest("POST", "/subscription", bytes.NewReader([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}

// Тесты на обновление подписки
func TestHTTP_UpdateSubscription(t *testing.T) {
	CleanupDB(t)

	subId := SetupTestSub(t)

	reqBody := requets.SubRequest{
		NameSub:  "Updated Free Plan",
		DescSub:  "Updated description",
		Features: "Updated features",
	}
	body, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("PUT", "/subscription/"+subId.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	sub, _ := TestService.GetSub(requets.SubRequest{Id: subId})
	if sub.NameSub != "Updated Free Plan" {
		t.Errorf("Expected NameSub = 'Updated Free Plan', got %v", sub.NameSub)
	}
}

// Тесты на удаление подписки
func TestHTTP_DeleteSubscription(t *testing.T) {
	CleanupDB(t)

	subId := SetupTestSub(t)

	req, _ := http.NewRequest("DELETE", "/subscription/"+subId.String(), nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	sub, _ := TestService.GetSub(requets.SubRequest{Id: subId})
	if sub != nil {
		t.Error("Subscription still exists after deletion")
	}
}
