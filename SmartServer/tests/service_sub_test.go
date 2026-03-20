package tests

import (
	"SmartServer/pkg/models"
	"SmartServer/pkg/requets"
	"testing"

	"github.com/google/uuid"
)

// Тесты на создание подписок
func TestSubService_CreateSub(t *testing.T) {
	CleanupDB(t)

	req := requets.SubRequest{
		Type:     "free",
		NameSub:  "Free Plan",
		Price:    "0",
		DescSub:  "Free plan description",
		Features: "Basic features",
	}

	err := TestService.CreateSub(req)
	if err != nil {
		t.Fatalf("CreateSub() error = %v", err)
	}

	subs, _ := TestService.GetAllSubs()
	if len(subs) != 1 {
		t.Fatalf("Expected 1 subscription, got %d", len(subs))
	}

	if subs[0].NameSub != req.NameSub {
		t.Errorf("Expected NameSub = %v, got %v", req.NameSub, subs[0].NameSub)
	}
	if subs[0].Price != req.Price {
		t.Errorf("Expected Price = %v, got %v", req.Price, subs[0].Price)
	}
	if subs[0].Type != models.SubscriptionTypeFree {
		t.Errorf("Expected Type = %v, got %v", models.SubscriptionTypeFree, subs[0].Type)
	}
}

// Тесты на получение всех подписок
func TestSubService_GetAllSubs(t *testing.T) {
	CleanupDB(t)

	freeSubId := SetupTestSub(t)
	proSubId := SetupTestProSub(t)

	subs, err := TestService.GetAllSubs()
	if err != nil {
		t.Fatalf("GetAllSubs() error = %v", err)
	}

	if len(subs) != 2 {
		t.Errorf("Expected 2 subscriptions, got %d", len(subs))
	}

	foundFree := false
	foundPro := false
	for _, sub := range subs {
		if sub.Id == freeSubId {
			foundFree = true
		}
		if sub.Id == proSubId {
			foundPro = true
		}
	}

	if !foundFree {
		t.Error("Free subscription not found in GetAllSubs")
	}
	if !foundPro {
		t.Error("Pro subscription not found in GetAllSubs")
	}
}

// Тесты на получение подписки по ID
func TestSubService_GetSub(t *testing.T) {
	CleanupDB(t)
	subId := SetupTestSub(t)

	req := requets.SubRequest{Id: subId}
	sub, err := TestService.GetSub(req)
	if err != nil {
		t.Fatalf("GetSub() error = %v", err)
	}

	if sub == nil || sub.Id != subId {
		t.Errorf("Expected Id = %v, got %v", subId, sub)
	}
}

func TestSubService_GetSub_NotFound(t *testing.T) {
	CleanupDB(t)

	randomId := uuid.New()
	req := requets.SubRequest{Id: randomId}

	sub, err := TestService.GetSub(req)
	if err != nil || sub != nil {
		t.Error("Expected nil for non-existent subscription")
	}
}

// Тесты на обновление подписки
func TestSubService_UpdateSub(t *testing.T) {
	CleanupDB(t)
	subId := SetupTestSub(t)

	req := requets.SubRequest{
		Id:       subId,
		NameSub:  "Updated Free Plan",
		Price:    "0",
		DescSub:  "Updated description",
		Features: "Updated features",
	}

	err := TestService.UpdateSub(req)
	if err != nil {
		t.Fatalf("UpdateSub() error = %v", err)
	}

	sub, _ := TestService.GetSub(requets.SubRequest{Id: subId})
	if sub.NameSub != "Updated Free Plan" {
		t.Errorf("Expected NameSub = 'Updated Free Plan', got %v", sub.NameSub)
	}
	if sub.DescSub != "Updated description" {
		t.Errorf("Expected DescSub = 'Updated description', got %v", sub.DescSub)
	}
}

// Тесты на удаление подписки
func TestSubService_DeleteSub(t *testing.T) {
	CleanupDB(t)
	subId := SetupTestSub(t)

	req := requets.SubRequest{Id: subId}
	err := TestService.DeleteSub(req)
	if err != nil {
		t.Fatalf("DeleteSub() error = %v", err)
	}

	sub, _ := TestService.GetSub(req)
	if sub != nil {
		t.Error("Subscription still exists after deletion")
	}
}
