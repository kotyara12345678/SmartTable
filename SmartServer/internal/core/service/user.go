package service

import (
	"SmartServer/pkg/database"
	"SmartServer/pkg/models"
	"SmartServer/pkg/requets"
	"errors"
)

type UserRepository interface {
	Reg(request requets.UserRequest) error
	Auth(request requets.UserRequest) error
}

type UserService struct{}

func (us *UserService) Reg(request requets.UserRequest) error {
	newUser := models.User{
		Username: request.Username,
		Password: request.Password,
		Email:    request.Email,
	}

	err := database.Db.Create(&newUser)
	if err != nil {
		return errors.New("UserService Reg Error")
	}

	return nil
}

func (us *UserService) Auth(request requets.UserRequest) error {
	newUser := models.User{
		Username: request.Username,
		Password: request.Password,
		Email:    request.Email,
	}

	err := database.Db.Find(&newUser, "username = ? AND password = ?", request.Username, request.Password).Error
	if err != nil {
		return errors.New("UserService Auth Error")
	}

	return nil
}
