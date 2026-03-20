package tests

import (
	"SmartServer/pkg/models"
	"testing"

	"github.com/google/uuid"
)

// Тесты на проверку доступа пользователя к подписке
func TestSubService_CheckUserAccess_FreeUser_FreeAccess(t *testing.T) {
	CleanupDB(t)
	freeSubId := SetupTestSub(t)
	userId := SetupTestUser(t, freeSubId)

	hasAccess, err := TestService.CheckUserAccess(userId, models.SubscriptionTypeFree)
	if err != nil {
		t.Fatalf("CheckUserAccess() error = %v", err)
	}

	if !hasAccess {
		t.Error("Expected Free user to have Free access")
	}
}

func TestSubService_CheckUserAccess_FreeUser_ProAccess(t *testing.T) {
	CleanupDB(t)
	freeSubId := SetupTestSub(t)
	userId := SetupTestUser(t, freeSubId)

	hasAccess, err := TestService.CheckUserAccess(userId, models.SubscriptionTypePro)
	if err != nil {
		t.Fatalf("CheckUserAccess() error = %v", err)
	}

	if hasAccess {
		t.Error("Expected Free user to NOT have Pro access")
	}
}

func TestSubService_CheckUserAccess_ProUser_FreeAccess(t *testing.T) {
	CleanupDB(t)
	proSubId := SetupTestProSub(t)
	userId := SetupTestUser(t, proSubId)

	hasAccess, err := TestService.CheckUserAccess(userId, models.SubscriptionTypeFree)
	if err != nil {
		t.Fatalf("CheckUserAccess() error = %v", err)
	}

	if !hasAccess {
		t.Error("Expected Pro user to have Free access")
	}
}

func TestSubService_CheckUserAccess_ProUser_ProAccess(t *testing.T) {
	CleanupDB(t)
	proSubId := SetupTestProSub(t)
	userId := SetupTestUser(t, proSubId)

	hasAccess, err := TestService.CheckUserAccess(userId, models.SubscriptionTypePro)
	if err != nil {
		t.Fatalf("CheckUserAccess() error = %v", err)
	}

	if !hasAccess {
		t.Error("Expected Pro user to have Pro access")
	}
}

func TestSubService_CheckUserAccess_NoSubscription_FreeAccess(t *testing.T) {
	CleanupDB(t)
	SetupTestSub(t)

	userId := uuid.New()
	user := models.User{
		Id:             userId,
		Username:       "nosubuser",
		Password:       "testpass",
		Email:          "nosub@example.com",
		SubscriptionId: uuid.Nil,
	}
	testUsers[userId] = user

	hasAccess, err := TestService.CheckUserAccess(userId, models.SubscriptionTypeFree)
	if err != nil {
		t.Fatalf("CheckUserAccess() error = %v", err)
	}

	if !hasAccess {
		t.Error("Expected user without subscription to have Free access")
	}
}

func TestSubService_CheckUserAccess_NoSubscription_ProAccess(t *testing.T) {
	CleanupDB(t)
	SetupTestSub(t)

	userId := uuid.New()
	user := models.User{
		Id:             userId,
		Username:       "nosubuser",
		Password:       "testpass",
		Email:          "nosub@example.com",
		SubscriptionId: uuid.Nil,
	}
	testUsers[userId] = user

	hasAccess, err := TestService.CheckUserAccess(userId, models.SubscriptionTypePro)
	if err != nil {
		t.Fatalf("CheckUserAccess() error = %v", err)
	}

	if hasAccess {
		t.Error("Expected user without subscription to NOT have Pro access")
	}
}

// Тесты на получение подписки пользователя
func TestSubService_GetUserSubscription(t *testing.T) {
	CleanupDB(t)
	freeSubId := SetupTestSub(t)
	userId := SetupTestUser(t, freeSubId)

	sub, err := TestService.GetUserSubscription(userId)
	if err != nil {
		t.Fatalf("GetUserSubscription() error = %v", err)
	}

	if sub == nil || sub.Id != freeSubId {
		t.Errorf("Expected subscription Id = %v, got %v", freeSubId, sub)
	}
}

func TestSubService_GetUserSubscription_NoSubscription(t *testing.T) {
	CleanupDB(t)
	freeSubId := SetupTestSub(t)

	userId := uuid.New()
	user := models.User{
		Id:             userId,
		Username:       "nosubuser",
		Password:       "testpass",
		Email:          "nosub@example.com",
		SubscriptionId: uuid.Nil,
	}
	testUsers[userId] = user

	sub, err := TestService.GetUserSubscription(userId)
	if err != nil {
		t.Fatalf("GetUserSubscription() error = %v", err)
	}

	if sub == nil || sub.Id != freeSubId {
		t.Errorf("Expected default Free subscription Id = %v, got %v", freeSubId, sub)
	}
}

// Тесты на назначение подписки пользователю
func TestSubService_AssignSubscription(t *testing.T) {
	CleanupDB(t)
	freeSubId := SetupTestSub(t)
	proSubId := SetupTestProSub(t)

	user := models.User{
		Id:             uuid.New(),
		Username:       "assignuser",
		Password:       "testpass",
		Email:          "assign@example.com",
		SubscriptionId: freeSubId,
	}
	testUsers[user.Id] = user

	err := TestService.AssignSubscription(user.Id, proSubId)
	if err != nil {
		t.Fatalf("AssignSubscription() error = %v", err)
	}

	updatedUser := testUsers[user.Id]
	if updatedUser.SubscriptionId != proSubId {
		t.Errorf("Expected SubscriptionId = %v, got %v", proSubId, updatedUser.SubscriptionId)
	}
}

func TestSubService_AssignSubscription_UserNotFound(t *testing.T) {
	CleanupDB(t)
	SetupTestProSub(t)

	randomUserId := uuid.New()
	err := TestService.AssignSubscription(randomUserId, randomUserId)
	// Ожидается, что ошибка не возвращается, но подписка не назначается
	if err != nil {
		t.Error("Expected no error for non-existent user")
	}
}

func TestSubService_AssignSubscription_SubscriptionNotFound(t *testing.T) {
	CleanupDB(t)

	userId := uuid.New()
	user := models.User{
		Id:       userId,
		Username: "testuser2",
		Password: "testpass",
		Email:    "test2@example.com",
	}
	testUsers[userId] = user

	randomSubId := uuid.New()
	err := TestService.AssignSubscription(userId, randomSubId)
	// Ожидается, что ошибка не возвращается, но подписка не назначается
	if err != nil {
		t.Error("Expected no error for non-existent subscription")
	}
}
