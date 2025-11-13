#!/bin/bash

GATEWAY_URL="${GATEWAY_URL:-http://localhost:5000}"
TIMEOUT=30

echo "🧪 Gateway Regression Tests"
echo "=========================="
echo "Gateway URL: $GATEWAY_URL"
echo ""

test_endpoint() {
  local name="$1"
  local path="$2"
  local expected_status="${3:-200}"
  local check_content="$4"
  
  printf "Testing %-50s ... " "$name"
  
  response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$GATEWAY_URL$path" 2>&1)
  status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status" != "$expected_status" ]; then
    echo "❌ FAILED (expected $expected_status, got $status)"
    return 1
  fi
  
  if [ -n "$check_content" ]; then
    if echo "$body" | grep -q "$check_content"; then
      echo "✅ PASSED"
    else
      echo "❌ FAILED (content check failed: expected '$check_content')"
      return 1
    fi
  else
    echo "✅ PASSED"
  fi
  
  return 0
}

FAILED=0
PASSED=0

echo "1. Gateway Health Checks"
echo "------------------------"

test_endpoint "Gateway /health" "/health" 200 "healthy" && ((PASSED++)) || ((FAILED++))
test_endpoint "Gateway /health/services" "/health/services" 200 && ((PASSED++)) || ((FAILED++))

echo ""
echo "2. NuP-Identify Routes"
echo "----------------------"

test_endpoint "NuP-Identify API /api/health" "/nup-identify/api/health" 200 "NuPIdentity" && ((PASSED++)) || ((FAILED++))
test_endpoint "NuP-Identify Homepage" "/nup-identify/" 200 && ((PASSED++)) || ((FAILED++))
test_endpoint "NuP-Identify Vite HMR Client" "/nup-identify/@vite/client" 200 "HMRContext" && ((PASSED++)) || ((FAILED++))

echo ""
echo "3. NuP-AIM Routes"
echo "-----------------"

test_endpoint "NuP-AIM API /api/health" "/nup-aim/api/health" 200 "NuP-AIM" && ((PASSED++)) || ((FAILED++))
test_endpoint "NuP-AIM Homepage" "/nup-aim/" 200 && ((PASSED++)) || ((FAILED++))
test_endpoint "NuP-AIM Vite HMR Client" "/nup-aim/@vite/client" 200 "HMRContext" && ((PASSED++)) || ((FAILED++))

echo ""
echo "4. NuP-Study Routes (Catch-all)"
echo "--------------------------------"

test_endpoint "NuP-Study Homepage" "/" 200 && ((PASSED++)) || ((FAILED++))

echo ""
echo "=========================="
echo "Test Summary"
echo "=========================="
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "⚠️  Some tests failed!"
  exit 1
else
  echo "🎉 All tests passed!"
  exit 0
fi
