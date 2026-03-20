package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"SmartServer/pkg/models"

	"github.com/google/uuid"
)

// Тесты на проверку доступа пользователя к подписке
func TestHTTP_CheckUserAccess_FreeUser_FreeAccess(t *testing.T) {
	CleanupDB(t)

	freeSubId := SetupTestSub(t)
	userId := SetupTestUser(t, freeSubId)

	req, _ := http.NewRequest("GET", "/user/"+userId.String()+"/subscription/check/free", nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["has_access"] != true {
		t.Errorf("Expected has_access = true, got %v", response["has_access"])
	}
}

func TestHTTP_CheckUserAccess_FreeUser_ProAccess(t *testing.T) {
	CleanupDB(t)

	freeSubId := SetupTestSub(t)
	userId := SetupTestUser(t, freeSubId)

	req, _ := http.NewRequest("GET", "/user/"+userId.String()+"/subscription/check/pro", nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["has_access"] != false {
		t.Errorf("Expected has_access = false, got %v", response["has_access"])
	}
}

func TestHTTP_CheckUserAccess_ProUser_ProAccess(t *testing.T) {
	CleanupDB(t)

	proSubId := SetupTestProSub(t)
	userId := SetupTestUser(t, proSubId)

	req, _ := http.NewRequest("GET", "/user/"+userId.String()+"/subscription/check/pro", nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["has_access"] != true {
		t.Errorf("Expected has_access = true, got %v", response["has_access"])
	}
}

func TestHTTP_CheckUserAccess_NoSubscription_FreeAccess(t *testing.T) {
	CleanupDB(t)

	SetupTestSub(t)

	userId := uuid.New()
	user := models.User{
		Id:             userId,
		Username:       "nosubuser",
		Password:       "password",
		Email:          "nosub@test.com",
		SubscriptionId: uuid.Nil,
	}
	testUsers[userId] = user

	req, _ := http.NewRequest("GET", "/user/"+userId.String()+"/subscription/check/free", nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["has_access"] != true {
		t.Errorf("Expected has_access = true, got %v", response["has_access"])
	}
}

func TestHTTP_CheckUserAccess_NoSubscription_ProAccess(t *testing.T) {
	CleanupDB(t)

	SetupTestSub(t)

	userId := uuid.New()
	user := models.User{
		Id:             userId,
		Username:       "nosubuser",
		Password:       "password",
		Email:          "nosub@test.com",
		SubscriptionId: uuid.Nil,
	}
	testUsers[userId] = user

	req, _ := http.NewRequest("GET", "/user/"+userId.String()+"/subscription/check/pro", nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["has_access"] != false {
		t.Errorf("Expected has_access = false, got %v", response["has_access"])
	}
}

func TestHTTP_CheckUserAccess_InvalidUserId(t *testing.T) {
	CleanupDB(t)

	req, _ := http.NewRequest("GET", "/user/invalid-uuid/subscription/check/free", nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}

func TestHTTP_CheckUserAccess_InvalidSubType(t *testing.T) {
	CleanupDB(t)

	randomUserId := uuid.New()
	req, _ := http.NewRequest("GET", "/user/"+randomUserId.String()+"/subscription/check/invalid", nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}

// Тесты на получение подписки пользователя
func TestHTTP_GetUserSubscription(t *testing.T) {
	CleanupDB(t)

	freeSubId := SetupTestSub(t)
	userId := SetupTestUser(t, freeSubId)

	req, _ := http.NewRequest("GET", "/user/"+userId.String()+"/subscription", nil)
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

func TestHTTP_GetUserSubscription_NoSubscription(t *testing.T) {
	CleanupDB(t)

	freeSubId := SetupTestSub(t)

	userId := uuid.New()
	user := models.User{
		Id:             userId,
		Username:       "nosubuser",
		Password:       "password",
		Email:          "nosub@test.com",
		SubscriptionId: uuid.Nil,
	}
	testUsers[userId] = user

	req, _ := http.NewRequest("GET", "/user/"+userId.String()+"/subscription", nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	data, ok := response["data"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected data to be an object")
	}

	if data["id"] != freeSubId.String() {
		t.Errorf("Expected default Free subscription, got %v", data["id"])
	}
}

// Тесты на назначение подписки пользователю
func TestHTTP_AssignSubscription(t *testing.T) {
	CleanupDB(t)

	freeSubId := SetupTestSub(t)
	proSubId := SetupTestProSub(t)
	userId := SetupTestUser(t, freeSubId)

	req, _ := http.NewRequest("POST", "/user/"+userId.String()+"/subscription/"+proSubId.String(), nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	updatedUser := testUsers[userId]
	if updatedUser.SubscriptionId != proSubId {
		t.Errorf("Expected SubscriptionId = %v, got %v", proSubId, updatedUser.SubscriptionId)
	}
}

func TestHTTP_AssignSubscription_InvalidUserId(t *testing.T) {
	CleanupDB(t)

	proSubId := SetupTestProSub(t)

	req, _ := http.NewRequest("POST", "/user/invalid-uuid/subscription/"+proSubId.String(), nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}

func TestHTTP_AssignSubscription_InvalidSubId(t *testing.T) {
	CleanupDB(t)

	userId := SetupTestUser(t, uuid.Nil)

	req, _ := http.NewRequest("POST", "/user/"+userId.String()+"/subscription/invalid-uuid", nil)
	w := httptest.NewRecorder()
	TestRouter.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}
