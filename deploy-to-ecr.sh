#!/bin/bash
# Deploy Agent UI (frontend + backend) to AWS ECR (k3s homelab)
# Builds AMD64 images from M1 Mac and pushes to ECR

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
ECR_REGISTRY="852893458518.dkr.ecr.us-east-2.amazonaws.com"
FRONTEND_REPO="${ECR_REGISTRY}/agent-ui-frontend"
BACKEND_REPO="${ECR_REGISTRY}/agent-ui-backend"
VERSION="${1:-v1.0.0}"
REGION="us-east-2"

echo "=========================================="
echo "  Deploy Agent UI to ECR"
echo "=========================================="
echo ""
echo "Frontend: $FRONTEND_REPO"
echo "Backend:  $BACKEND_REPO"
echo "Version:  $VERSION"
echo "Region:   $REGION"
echo ""

# Step 1: Login to ECR
echo -e "${BLUE}Step 1: Logging into ECR...${NC}"
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Logged in to ECR${NC}"
else
    echo -e "${RED}❌ ECR login failed${NC}"
    echo "Ensure AWS CLI is configured and you have ECR permissions"
    exit 1
fi
echo ""

# Step 2: Build backend image for AMD64
echo -e "${BLUE}Step 2: Building backend image for AMD64...${NC}"
docker buildx build \
  --platform linux/amd64 \
  -t agent-ui-backend:$VERSION \
  -f backend/Dockerfile \
  --load \
  backend/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend image built${NC}"
else
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi
echo ""

# Step 3: Build frontend image for AMD64
echo -e "${BLUE}Step 3: Building frontend image for AMD64...${NC}"
docker buildx build \
  --platform linux/amd64 \
  -t agent-ui-frontend:$VERSION \
  -f frontend/Dockerfile \
  --load \
  frontend/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend image built${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi
echo ""

# Step 4: Tag for ECR
echo -e "${BLUE}Step 4: Tagging for ECR...${NC}"
docker tag agent-ui-backend:$VERSION $BACKEND_REPO:$VERSION
docker tag agent-ui-backend:$VERSION $BACKEND_REPO:latest
docker tag agent-ui-frontend:$VERSION $FRONTEND_REPO:$VERSION
docker tag agent-ui-frontend:$VERSION $FRONTEND_REPO:latest

echo -e "${GREEN}✅ Images tagged:${NC}"
echo "   - $BACKEND_REPO:$VERSION"
echo "   - $BACKEND_REPO:latest"
echo "   - $FRONTEND_REPO:$VERSION"
echo "   - $FRONTEND_REPO:latest"
echo ""

# Step 5: Push to ECR
echo -e "${BLUE}Step 5: Pushing backend to ECR...${NC}"
docker push $BACKEND_REPO:$VERSION
docker push $BACKEND_REPO:latest

echo -e "${BLUE}Pushing frontend to ECR...${NC}"
docker push $FRONTEND_REPO:$VERSION
docker push $FRONTEND_REPO:latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All images pushed to ECR${NC}"
else
    echo -e "${RED}❌ Push failed${NC}"
    exit 1
fi
echo ""

# Step 6: Verify in ECR
echo -e "${BLUE}Step 6: Verifying in ECR...${NC}"
echo ""
echo "Backend images:"
aws ecr describe-images \
  --repository-name agent-ui-backend \
  --region $REGION \
  --output table \
  --query 'sort_by(imageDetails,& imagePushedAt)[*].[imageTags[0],imagePushedAt,imageSizeInBytes]' || true

echo ""
echo "Frontend images:"
aws ecr describe-images \
  --repository-name agent-ui-frontend \
  --region $REGION \
  --output table \
  --query 'sort_by(imageDetails,& imagePushedAt)[*].[imageTags[0],imagePushedAt,imageSizeInBytes]' || true

echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}  Deploy Complete!${NC}"
echo "=========================================="
echo ""
echo "Images available at:"
echo "  - $BACKEND_REPO:$VERSION"
echo "  - $BACKEND_REPO:latest"
echo "  - $FRONTEND_REPO:$VERSION"
echo "  - $FRONTEND_REPO:latest"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Create ECR repos (if first time):"
echo "   aws ecr create-repository --repository-name agent-ui-backend --region $REGION"
echo "   aws ecr create-repository --repository-name agent-ui-frontend --region $REGION"
echo ""
echo "2. Deploy to k3s:"
echo "   kubectl apply -f k8s/"
echo ""
echo "3. Verify deployment:"
echo "   kubectl get pods -n kagent -l app=agent-ui"
echo ""
