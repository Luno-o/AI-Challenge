#!/bin/bash

API="http://localhost:4000"

echo "🐳 ===== DOCKER MCP TESTING ====="

# Test 1: List containers
echo -e "\n1️⃣ Listing containers..."
curl -s "$API/api/docker/containers"
echo ""

# Test 2: Setup test environment
echo -e "\n2️⃣ Setting up test environment..."
curl -s -X POST "$API/api/orchestrate/setup-test-env"
echo ""

# Wait for containers
echo -e "\n⏳ Waiting 10 seconds for containers to start..."
sleep 10

# Test 3: List containers again
echo -e "\n3️⃣ Listing containers after setup..."
curl -s "$API/api/docker/containers"
echo ""

# Test 4: Cleanup
echo -e "\n4️⃣ Cleaning up environment..."
curl -s -X POST "$API/api/orchestrate/cleanup-env"
echo ""

echo -e "\n✅ Testing completed!"
