#!/bin/bash

# Create Docker network
echo "Creating Docker network..."
docker network create e-commerce

# Run MongoDB container
echo "Running MongoDB container..."
docker run --name mongodb --network e-commerce mongo

# Run RabbitMQ container
echo "Running RabbitMQ container..."
docker run --name rabbitmq --network e-commerce rabbitmq

# Build and run auth-service
echo "Building and running auth-service..."
cd auth-service
docker build -t auth-service .
docker run --name auth-service --network e-commerce -p 7070:7070 auth-service &
cd ..

# Build and run order-service
echo "Building and running order-service..."
cd order-service
docker build -t order-service .
docker run --name order-service --network e-commerce -p 9090:9090 order-service &
cd ..

# Build and run product-service
echo "Building and running product-service..."
cd product-service
docker build -t product-service .
docker run --name product-service --network e-commerce -p 8080:8080 product-service &
cd ..

echo "Services setup complete."
