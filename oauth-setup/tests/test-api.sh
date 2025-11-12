#!/bin/bash
# OAuth API Testing Script / سكريبت اختبار API OAuth
# 
# This script provides examples of how to test OAuth endpoints using curl
# يوفر هذا السكريبت أمثلة على كيفية اختبار نقاط نهاية OAuth باستخدام curl

# Configuration / التكوين
BASE_URL="http://localhost:3000"
TOKEN="" # Will be set after successful authentication / سيتم تعيينه بعد المصادقة الناجحة

echo "======================================================"
echo "  OAuth API Testing Script"
echo "  سكريبت اختبار API OAuth"
echo "======================================================"
echo ""

# Test 1: Health Check / اختبار 1: فحص الصحة
echo "Test 1: Health Check"
echo "الاختبار 1: فحص الصحة"
echo "------------------------------------------------------"
curl -s -X GET "${BASE_URL}/health" | jq '.'
echo ""
echo ""

# Test 2: Get Documentation / اختبار 2: الحصول على الوثائق
echo "Test 2: Get API Documentation"
echo "الاختبار 2: الحصول على وثائق API"
echo "------------------------------------------------------"
curl -s -X GET "${BASE_URL}/docs" | jq '.'
echo ""
echo ""

# Test 3: Get Enabled Providers / اختبار 3: الحصول على المزودين المفعلين
echo "Test 3: Get Enabled OAuth Providers"
echo "الاختبار 3: الحصول على مزودي OAuth المفعلين"
echo "------------------------------------------------------"
curl -s -X GET "${BASE_URL}/auth/providers" | jq '.'
echo ""
echo ""

# Test 4: Check Auth Status (Not authenticated) / اختبار 4: التحقق من حالة المصادقة (غير مصادق عليه)
echo "Test 4: Check Auth Status (Not authenticated)"
echo "الاختبار 4: التحقق من حالة المصادقة (غير مصادق عليه)"
echo "------------------------------------------------------"
curl -s -X GET "${BASE_URL}/auth/status" | jq '.'
echo ""
echo ""

# Test 5: Try Protected Route Without Token / اختبار 5: محاولة الوصول إلى مسار محمي بدون رمز
echo "Test 5: Access Protected Route Without Token (Should Fail)"
echo "الاختبار 5: الوصول إلى مسار محمي بدون رمز (يجب أن يفشل)"
echo "------------------------------------------------------"
curl -s -X GET "${BASE_URL}/auth/me" | jq '.'
echo ""
echo ""

# Test 6: Initiate OAuth Flow (Manual) / اختبار 6: بدء تدفق OAuth (يدوي)
echo "Test 6: Initiate GitHub OAuth Flow"
echo "الاختبار 6: بدء تدفق GitHub OAuth"
echo "------------------------------------------------------"
echo "To test OAuth flow, open this URL in your browser:"
echo "لاختبار تدفق OAuth، افتح هذا الرابط في المتصفح:"
echo "${BASE_URL}/auth/github"
echo ""
echo "After successful authentication, you will receive a token."
echo "بعد المصادقة الناجحة، ستحصل على رمز."
echo ""
echo ""

# Test 7: Test Protected Route With Token / اختبار 7: اختبار مسار محمي بالرمز
echo "Test 7: Access Protected Route With Token"
echo "الاختبار 7: الوصول إلى مسار محمي بالرمز"
echo "------------------------------------------------------"
if [ -z "$TOKEN" ]; then
    echo "⚠️  No token provided. Set TOKEN variable after authentication."
    echo "⚠️  لم يتم توفير رمز. قم بتعيين متغير TOKEN بعد المصادقة."
    echo ""
    echo "Example / مثال:"
    echo "  TOKEN='your-jwt-token-here' ./test-api.sh"
else
    curl -s -X GET "${BASE_URL}/auth/me" \
         -H "Authorization: Bearer ${TOKEN}" | jq '.'
fi
echo ""
echo ""

# Test 8: Test Logout / اختبار 8: اختبار تسجيل الخروج
echo "Test 8: Logout"
echo "الاختبار 8: تسجيل الخروج"
echo "------------------------------------------------------"
curl -s -X POST "${BASE_URL}/auth/logout" | jq '.'
echo ""
echo ""

echo "======================================================"
echo "  Testing Complete / اكتمل الاختبار"
echo "======================================================"
echo ""
echo "Notes / ملاحظات:"
echo "- Install 'jq' for better JSON formatting / قم بتثبيت 'jq' لتنسيق JSON أفضل"
echo "- Set TOKEN variable to test protected routes / قم بتعيين متغير TOKEN لاختبار المسارات المحمية"
echo "- OAuth flow requires browser interaction / يتطلب تدفق OAuth تفاعل المتصفح"
echo ""
