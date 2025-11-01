#!/bin/bash

# Script test hệ thống phân quyền mới
echo "🧪 TESTING PERMISSION SYSTEM"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Base URL
API_BASE="http://localhost:3001/api/auth"

echo -e "${BLUE}1. Testing Login...${NC}"
# Login as admin
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}')

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
else
  echo -e "${GREEN}✅ Login successful${NC}"
fi

echo -e "\n${BLUE}2. Testing Role Management Tree API...${NC}"
TREE_RESPONSE=$(curl -s "$API_BASE/permissions/role-management-tree" \
  -H "Authorization: Bearer $TOKEN")

# Check if response contains expected data
if echo "$TREE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Role Management Tree API working${NC}"
  
  # Extract counts
  TOTAL_PAGES=$(echo $TREE_RESPONSE | grep -o '"total_pages":[0-9]*' | cut -d':' -f2)
  TOTAL_FEATURES=$(echo $TREE_RESPONSE | grep -o '"total_features":[0-9]*' | cut -d':' -f2)
  
  echo -e "   📊 Total Pages: ${YELLOW}$TOTAL_PAGES${NC}"
  echo -e "   🔧 Total Features: ${YELLOW}$TOTAL_FEATURES${NC}"
else
  echo -e "${RED}❌ Role Management Tree API failed${NC}"
  echo "Response: $TREE_RESPONSE"
fi

echo -e "\n${BLUE}3. Testing User Access API...${NC}"
ACCESS_RESPONSE=$(curl -s "$API_BASE/permissions/my-access" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ACCESS_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ User Access API working${NC}"
  
  # Extract user permissions count
  USER_PERMS=$(echo $ACCESS_RESPONSE | grep -o '"total_permissions":[0-9]*' | cut -d':' -f2)
  echo -e "   🔑 User Permissions: ${YELLOW}$USER_PERMS${NC}"
else
  echo -e "${RED}❌ User Access API failed${NC}"
  echo "Response: $ACCESS_RESPONSE"
fi

echo -e "\n${BLUE}4. Testing Roles API...${NC}"
ROLES_RESPONSE=$(curl -s "$API_BASE/roles" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ROLES_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Roles API working${NC}"
  
  # Count roles
  ROLE_COUNT=$(echo $ROLES_RESPONSE | grep -o '"name":' | wc -l)
  echo -e "   👥 Total Roles: ${YELLOW}$ROLE_COUNT${NC}"
else
  echo -e "${RED}❌ Roles API failed${NC}"
  echo "Response: $ROLES_RESPONSE"
fi

echo -e "\n${BLUE}5. Testing with Test User...${NC}"
# Login as test user
TEST_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test@123"}')

TEST_TOKEN=$(echo $TEST_LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TEST_TOKEN" ]; then
  echo -e "${RED}❌ Test user login failed${NC}"
else
  echo -e "${GREEN}✅ Test user login successful${NC}"
  
  # Test user access
  TEST_ACCESS_RESPONSE=$(curl -s "$API_BASE/permissions/my-access" \
    -H "Authorization: Bearer $TEST_TOKEN")
  
  if echo "$TEST_ACCESS_RESPONSE" | grep -q '"success":true'; then
    TEST_USER_PERMS=$(echo $TEST_ACCESS_RESPONSE | grep -o '"total_permissions":[0-9]*' | cut -d':' -f2)
    echo -e "   🔑 Test User Permissions: ${YELLOW}$TEST_USER_PERMS${NC}"
    
    # Check if test user has limited permissions (should be less than admin)
    if [ "$TEST_USER_PERMS" -lt "$USER_PERMS" ]; then
      echo -e "${GREEN}✅ Permission restriction working correctly${NC}"
    else
      echo -e "${YELLOW}⚠️  Test user has same permissions as admin${NC}"
    fi
  else
    echo -e "${RED}❌ Test user access API failed${NC}"
  fi
fi

echo -e "\n${BLUE}6. Database Check...${NC}"
# Check if database has the expected permissions
DB_CHECK=$(PGPASSWORD=4 psql -h localhost -p 5433 -U postgres -d auth_db -t -c "SELECT COUNT(*) FROM \"Permission\" WHERE is_active = true;" 2>/dev/null)

if [ $? -eq 0 ]; then
  DB_PERM_COUNT=$(echo $DB_CHECK | tr -d ' ')
  echo -e "${GREEN}✅ Database connection successful${NC}"
  echo -e "   🗄️  Active Permissions in DB: ${YELLOW}$DB_PERM_COUNT${NC}"
  
  # Check if we have the expected 10 permissions
  if [ "$DB_PERM_COUNT" -eq "10" ]; then
    echo -e "${GREEN}✅ Expected permission count matches${NC}"
  else
    echo -e "${YELLOW}⚠️  Expected 10 permissions, found $DB_PERM_COUNT${NC}"
  fi
else
  echo -e "${RED}❌ Database connection failed${NC}"
  echo -e "${YELLOW}💡 Make sure PostgreSQL is running on localhost:5433${NC}"
fi

echo -e "\n${BLUE}7. Testing Permission Structure...${NC}"
# Test specific permissions exist
EXPECTED_PERMISSIONS=(
  "forecast.auto"
  "forecast.custom"
  "data_management.forecast_search"
  "data_management.satellite_search"
  "data_management.verification"
  "data_management.data_update"
  "reports.view"
  "detection.view"
  "user_management.view"
  "role_management.view"
)

FOUND_PERMISSIONS=0
for perm in "${EXPECTED_PERMISSIONS[@]}"; do
  if echo "$TREE_RESPONSE" | grep -q "\"code\":\"$perm\""; then
    echo -e "   ${GREEN}✅${NC} $perm"
    ((FOUND_PERMISSIONS++))
  else
    echo -e "   ${RED}❌${NC} $perm"
  fi
done

echo -e "\n${BLUE}📊 SUMMARY${NC}"
echo "================================"
echo -e "Expected Permissions: ${YELLOW}${#EXPECTED_PERMISSIONS[@]}${NC}"
echo -e "Found Permissions: ${YELLOW}$FOUND_PERMISSIONS${NC}"

if [ "$FOUND_PERMISSIONS" -eq "${#EXPECTED_PERMISSIONS[@]}" ]; then
  echo -e "\n${GREEN}🎉 ALL TESTS PASSED!${NC}"
  echo -e "${GREEN}✅ Permission system is working correctly${NC}"
  echo -e "\n${BLUE}Next steps:${NC}"
  echo "1. Start the React client: cd client && npm run dev"
  echo "2. Navigate to /admin/permission-test to see the UI"
  echo "3. Navigate to /admin/roles to manage roles"
else
  echo -e "\n${RED}❌ SOME TESTS FAILED${NC}"
  echo -e "${YELLOW}Please check the issues above${NC}"
fi

echo -e "\n${BLUE}🔗 Useful URLs:${NC}"
echo "- Auth Service: http://localhost:3001"
echo "- Client (if running): http://localhost:5173"
echo "- Permission Test: http://localhost:5173/admin/permission-test"
echo "- Role Management: http://localhost:5173/admin/roles"

echo -e "\n${BLUE}🔑 Test Credentials:${NC}"
echo "Admin: admin / Admin@123"
echo "Test User: testuser / Test@123"
