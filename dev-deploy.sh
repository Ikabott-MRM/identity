#!/bin/bash

#/ $1: Environment/Branch name
#/ $2: ACR Registry
#/ $3: ACR Repository name
#/ $4: Docker Image tag
az acr login --name $(echo $2 | cut -d'.' -f1) 

# Stop and remove the existing container
docker stop $1-api
docker rm $1-api

# Clean up unused images and containers
docker system prune -a -f

# Checkout the specified branch and pull the latest changes
git checkout .
git checkout $1
git pull

# Run database migrations if the environment is develop
#if [ $1 = develop ]
#then
#  npm run deploy:migrations
#fi

# Run the new container with the specified image from ACR
docker run --name=$1-api -p 80:5000 -p 443:5000 -p 3307:3307 -d $2/$3:$4