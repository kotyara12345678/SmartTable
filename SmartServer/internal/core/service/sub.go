package service

import (
	"SmartServer/pkg/database"
	"SmartServer/pkg/models"
	"SmartServer/pkg/requets"
	"errors"

	"github.com/google/uuid"
)

type SubServiceRepository interface {
	CreateSub(request requets.SubRequest) error
	UpdateSub(request requets.SubRequest) error
	DeleteSub(request requets.SubRequest) error
	GetSub(request requets.SubRequest) (*models.SubModel, error)
	GetAllSubs() ([]models.SubModel, error)
	CheckUserAccess(userId uuid.UUID, subType models.SubscriptionType) (bool, error)
	GetUserSubscription(userId uuid.UUID) (*models.SubModel, error)
	AssignSubscription(userId, subId uuid.UUID) error
}

func (s *SubService) CreateSub(request requets.SubRequest) error {
	newSub := models.SubModel{
		Type:     models.SubscriptionType(request.Type),
		NameSub:  request.NameSub,
		Price:    request.Price,
		DescSub:  request.DescSub,
		Features: request.Features,
	}

	result := database.Db.Create(&newSub)
	if result.Error != nil {
		return errors.New("Failed to create sub: " + result.Error.Error())
	}

	return nil
}

func (s *SubService) UpdateSub(request requets.SubRequest) error {
	var sub models.SubModel
	result := database.Db.First(&sub, "id = ?", request.Id)
	if result.Error != nil {
		return errors.New("Subscription not found")
	}

	updateData := make(map[string]interface{})
	if request.NameSub != "" {
		updateData["name_sub"] = request.NameSub
	}

	if request.DescSub != "" {
		updateData["desc_sub"] = request.DescSub
	}

	if request.Features != "" {
		updateData["features"] = request.Features
	}

	result = database.Db.Model(&sub).Updates(updateData)
	if result.Error != nil {
		return errors.New("Failed to update sub")
	}

	return nil
}

func (s *SubService) DeleteSub(request requets.SubRequest) error {
	result := database.Db.Delete(&models.SubModel{}, "id = ?", request.Id)
	if result.Error != nil {
		return errors.New("Failed to delete sub")
	}

	return nil
}

func (s *SubService) GetSub(request requets.SubRequest) (*models.SubModel, error) {
	var sub models.SubModel
	result := database.Db.First(&sub, "id = ?", request.Id)
	if result.Error != nil {
		return nil, errors.New("Subscription not found")
	}

	return &sub, nil
}

func (s *SubService) GetAllSubs() ([]models.SubModel, error) {
	var subs []models.SubModel
	result := database.Db.Find(&subs)
	if result.Error != nil {
		return nil, errors.New("Failed to get subscriptions")
	}

	return subs, nil
}

func (s *SubService) CheckUserAccess(userId uuid.UUID, subType models.SubscriptionType) (bool, error) {
	var user models.User
	result := database.Db.First(&user, "id = ?", userId)
	if result.Error != nil {
		return false, errors.New("User not found")
	}

	if user.SubscriptionId == uuid.Nil {
		return subType == models.SubscriptionTypeFree, nil
	}

	var sub models.SubModel
	result = database.Db.First(&sub, "id = ?", user.SubscriptionId)
	if result.Error != nil {
		return false, errors.New("Subscription not found")
	}

	if sub.Type == models.SubscriptionTypePro {
		return true, nil
	}

	return subType == models.SubscriptionTypeFree, nil
}

func (s *SubService) GetUserSubscription(userId uuid.UUID) (*models.SubModel, error) {
	var user models.User
	result := database.Db.First(&user, "id = ?", userId)
	if result.Error != nil {
		return nil, errors.New("User not found")
	}

	if user.SubscriptionId == uuid.Nil {
		var defaultSub models.SubModel
		result = database.Db.First(&defaultSub, "type = ?", models.SubscriptionTypeFree)
		if result.Error != nil {
			return nil, errors.New("Default subscription not found")
		}
		return &defaultSub, nil
	}

	var sub models.SubModel
	result = database.Db.First(&sub, "id = ?", user.SubscriptionId)
	if result.Error != nil {
		return nil, errors.New("Subscription not found")
	}
	return &sub, nil
}

func (s *SubService) AssignSubscription(userId, subId uuid.UUID) error {
	var user models.User
	result := database.Db.First(&user, "id = ?", userId)
	if result.Error != nil {
		return errors.New("User not found")
	}

	var sub models.SubModel
	result = database.Db.First(&sub, "id = ?", subId)
	if result.Error != nil {
		return errors.New("Subscription not found")
	}

	result = database.Db.Model(&user).Update("subscription_id", subId)
	if result.Error != nil {
		return errors.New("Failed to assign subscription")
	}

	return nil
}

type SubService struct{}
