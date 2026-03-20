package tests

import (
	"SmartServer/internal/core/service"
	"SmartServer/pkg/models"
	"SmartServer/pkg/requets"
	"sync"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var (
	TestService       *TestSubService
	TestRouter        *gin.Engine
	testSubscriptions map[uuid.UUID]models.SubModel
	testUsers         map[uuid.UUID]models.User
	testMu            sync.RWMutex
)

// TestSubService - тестовая реализация сервиса подписок
type TestSubService struct {
	service.SubService
}

func init() {
	gin.SetMode(gin.TestMode)
	testSubscriptions = make(map[uuid.UUID]models.SubModel)
	testUsers = make(map[uuid.UUID]models.User)
	TestService = &TestSubService{}
	TestRouter = setupTestRouter()
}

// Реализация методов для тестового сервиса
func (s *TestSubService) CreateSub(request requets.SubRequest) error {
	testMu.Lock()
	defer testMu.Unlock()

	id := uuid.New()
	if request.Id != uuid.Nil {
		id = request.Id
	}

	sub := models.SubModel{
		Id:       id,
		Type:     models.SubscriptionType(request.Type),
		NameSub:  request.NameSub,
		Price:    request.Price,
		DescSub:  request.DescSub,
		Features: request.Features,
	}
	testSubscriptions[id] = sub
	return nil
}

func (s *TestSubService) GetAllSubs() ([]models.SubModel, error) {
	testMu.RLock()
	defer testMu.RUnlock()

	subs := make([]models.SubModel, 0, len(testSubscriptions))
	for _, sub := range testSubscriptions {
		subs = append(subs, sub)
	}
	return subs, nil
}

func (s *TestSubService) GetSub(request requets.SubRequest) (*models.SubModel, error) {
	testMu.RLock()
	defer testMu.RUnlock()

	sub, ok := testSubscriptions[request.Id]
	if !ok {
		return nil, nil
	}
	return &sub, nil
}

func (s *TestSubService) UpdateSub(request requets.SubRequest) error {
	testMu.Lock()
	defer testMu.Unlock()

	sub, ok := testSubscriptions[request.Id]
	if !ok {
		return nil
	}

	if request.NameSub != "" {
		sub.NameSub = request.NameSub
	}
	if request.DescSub != "" {
		sub.DescSub = request.DescSub
	}
	if request.Features != "" {
		sub.Features = request.Features
	}
	testSubscriptions[request.Id] = sub
	return nil
}

func (s *TestSubService) DeleteSub(request requets.SubRequest) error {
	testMu.Lock()
	defer testMu.Unlock()

	delete(testSubscriptions, request.Id)
	return nil
}

func (s *TestSubService) CheckUserAccess(userId uuid.UUID, subType models.SubscriptionType) (bool, error) {
	testMu.RLock()
	defer testMu.RUnlock()

	user, ok := testUsers[userId]
	if !ok {
		return false, nil
	}

	if user.SubscriptionId == uuid.Nil {
		return subType == models.SubscriptionTypeFree, nil
	}

	sub, ok := testSubscriptions[user.SubscriptionId]
	if !ok {
		return false, nil
	}

	if sub.Type == models.SubscriptionTypePro {
		return true, nil
	}

	return subType == models.SubscriptionTypeFree, nil
}

func (s *TestSubService) GetUserSubscription(userId uuid.UUID) (*models.SubModel, error) {
	testMu.RLock()
	defer testMu.RUnlock()

	user, ok := testUsers[userId]
	if !ok {
		return nil, nil
	}

	if user.SubscriptionId == uuid.Nil {
		for _, sub := range testSubscriptions {
			if sub.Type == models.SubscriptionTypeFree {
				return &sub, nil
			}
		}
		return nil, nil
	}

	sub, ok := testSubscriptions[user.SubscriptionId]
	if !ok {
		return nil, nil
	}
	return &sub, nil
}

func (s *TestSubService) AssignSubscription(userId, subId uuid.UUID) error {
	testMu.Lock()
	defer testMu.Unlock()

	_, ok := testUsers[userId]
	if !ok {
		return nil
	}

	_, ok = testSubscriptions[subId]
	if !ok {
		return nil
	}

	user := testUsers[userId]
	user.SubscriptionId = subId
	testUsers[userId] = user
	return nil
}

// Вспомогательные функции для тестов
func CleanupDB(t *testing.T) {
	testMu.Lock()
	defer testMu.Unlock()

	testSubscriptions = make(map[uuid.UUID]models.SubModel)
	testUsers = make(map[uuid.UUID]models.User)
}

func SetupTestSub(t *testing.T) uuid.UUID {
	return createTestSubscription(t, "free", "Free Test", "0", "Test free subscription", "Basic features")
}

func SetupTestProSub(t *testing.T) uuid.UUID {
	return createTestSubscription(t, "pro", "Pro Test", "9.99", "Test pro subscription", "All features + AI")
}

func createTestSubscription(t *testing.T, subType, name string, price string, desc, features string) uuid.UUID {
	id := uuid.New()
	sub := models.SubModel{
		Id:       id,
		Type:     models.SubscriptionType(subType),
		NameSub:  name,
		Price:    price,
		DescSub:  desc,
		Features: features,
	}
	testSubscriptions[id] = sub
	return id
}

func SetupTestUser(t *testing.T, subId uuid.UUID) uuid.UUID {
	userId := uuid.New()
	user := models.User{
		Id:             userId,
		Username:       "testuser",
		Password:       "testpass",
		Email:          "test@example.com",
		SubscriptionId: subId,
	}
	testUsers[userId] = user
	return userId
}

func setupTestRouter() *gin.Engine {
	r := gin.Default()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/subscriptions", func(c *gin.Context) {
		subs, err := TestService.GetAllSubs()
		if err != nil {
			c.JSON(500, gin.H{"status": "failed", "message": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "success", "data": subs})
	})

	r.GET("/subscription/:id", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"status": "failed", "message": "Invalid subscription id"})
			return
		}
		req := requets.SubRequest{Id: id}
		sub, err := TestService.GetSub(req)
		if err != nil || sub == nil {
			c.JSON(500, gin.H{"status": "failed", "message": "Subscription not found"})
			return
		}
		c.JSON(200, gin.H{"status": "success", "data": sub})
	})

	r.POST("/subscription", func(c *gin.Context) {
		var req requets.SubRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"status": "failed", "message": err.Error()})
			return
		}
		err := TestService.CreateSub(req)
		if err != nil {
			c.JSON(500, gin.H{"status": "failed", "message": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "success"})
	})

	r.PUT("/subscription/:id", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"status": "failed", "message": "Invalid subscription id"})
			return
		}
		var req requets.SubRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"status": "failed", "message": err.Error()})
			return
		}
		req.Id = id
		err = TestService.UpdateSub(req)
		if err != nil {
			c.JSON(500, gin.H{"status": "failed", "message": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "success"})
	})

	r.DELETE("/subscription/:id", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"status": "failed", "message": "Invalid subscription id"})
			return
		}
		req := requets.SubRequest{Id: id}
		err = TestService.DeleteSub(req)
		if err != nil {
			c.JSON(500, gin.H{"status": "failed", "message": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "success"})
	})

	r.GET("/user/:userId/subscription/check/:subType", func(c *gin.Context) {
		userId, err := uuid.Parse(c.Param("userId"))
		if err != nil {
			c.JSON(400, gin.H{"status": "failed", "message": "Invalid user id"})
			return
		}
		subType := models.SubscriptionType(c.Param("subType"))
		if subType != models.SubscriptionTypeFree && subType != models.SubscriptionTypePro {
			c.JSON(400, gin.H{"status": "failed", "message": "Invalid subscription type"})
			return
		}
		hasAccess, err := TestService.CheckUserAccess(userId, subType)
		if err != nil {
			c.JSON(500, gin.H{"status": "failed", "message": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "success", "has_access": hasAccess})
	})

	r.GET("/user/:userId/subscription", func(c *gin.Context) {
		userId, err := uuid.Parse(c.Param("userId"))
		if err != nil {
			c.JSON(400, gin.H{"status": "failed", "message": "Invalid user id"})
			return
		}
		sub, err := TestService.GetUserSubscription(userId)
		if err != nil || sub == nil {
			c.JSON(500, gin.H{"status": "failed", "message": "Subscription not found"})
			return
		}
		c.JSON(200, gin.H{"status": "success", "data": sub})
	})

	r.POST("/user/:userId/subscription/:subId", func(c *gin.Context) {
		userId, err := uuid.Parse(c.Param("userId"))
		if err != nil {
			c.JSON(400, gin.H{"status": "failed", "message": "Invalid user id"})
			return
		}
		subId, err := uuid.Parse(c.Param("subId"))
		if err != nil {
			c.JSON(400, gin.H{"status": "failed", "message": "Invalid subscription id"})
			return
		}
		err = TestService.AssignSubscription(userId, subId)
		if err != nil {
			c.JSON(500, gin.H{"status": "failed", "message": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "success"})
	})

	return r
}
