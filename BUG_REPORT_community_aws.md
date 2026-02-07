# Bug Report - community.aws.acm_certificate 404 Error

**Date:** 2025-12-14  
**Reported by:** User  
**Investigated by:** Claude  
**Status:** ✅ **RESOLVED** - Not a bug in our application

---

## 🐛 **Symptom**

User reported: "bug: sur la prod, le module community.aws.acm_certificate revoie l'erreur 404"

**URL Tested:** https://coupel.net/ansible-builder/api/galaxy/namespaces/community/collections/aws/versions/latest/modules/acm_certificate/schema

**Error Response:**
```json
{"detail":"Documentation not found for community.aws:latest"}
```

---

## 🔍 **Investigation Results**

### 1. Application Behavior ✅ CORRECT
- ✅ Module `acm_certificate` exists in collection `community.aws:10.0.0`
- ✅ Our API correctly lists the module in `/modules` endpoint
- ✅ Our API correctly detects missing documentation
- ✅ Error message is accurate and helpful
- ✅ HTTP 404 status is appropriate for missing resource

### 2. Root Cause Analysis
**Issue Source:** Galaxy API documentation limitation

**Evidence:**
```json
// docs-blob content for community.aws:10.0.0
{
  "content_name": "acm_certificate",
  "content_type": "module",
  "doc_strings": null,     // <- This is the problem
  "readme_file": null,
  "readme_html": null
}
```

**Key Finding:** ALL modules in community.aws collection have `"doc_strings": null`

### 3. Version Analysis
Tested multiple versions of community.aws:
- ✅ v10.0.0: `doc_strings: null` for all modules
- ✅ v5.0.0: `doc_strings: null` for most modules (only aws_ssm plugin has doc_strings)
- ✅ Pattern consistent across versions

### 4. Comparison Test
Tested working collection (community.general) to confirm our system works:
- ✅ Other collections with proper doc_strings work correctly
- ✅ Our API successfully returns schemas when documentation is available

---

## ✅ **Conclusion**

**NOT A BUG in Ansible Builder v1.9.0**

This is a **limitation of the Galaxy API documentation** for the `community.aws` collection. The collection maintainers have not provided structured `doc_strings` in the format required by Galaxy API v3.

### Our Application Behavior is Correct:
1. ✅ Correctly identifies module exists
2. ✅ Correctly detects missing documentation  
3. ✅ Returns appropriate 404 with clear error message
4. ✅ Follows proper error handling patterns

---

## 📋 **User Communication**

**Response:** 
"The error is expected behavior. The `community.aws` collection doesn't provide structured module documentation through Galaxy API. This is a limitation of the collection itself, not our application. 

**Workarounds:**
1. Use modules from collections with better documentation (e.g., `amazon.aws`)
2. Refer to Ansible documentation directly for community.aws modules
3. Check if newer versions of community.aws improve documentation

**Status:** Application working as designed ✅"

---

## 🔧 **Technical Details**

**Application Version:** 1.9.0  
**API Endpoint:** `/api/galaxy/namespaces/{namespace}/collections/{collection}/versions/{version}/modules/{module}/schema`  
**Error Handling:** Line 614-618 in `backend/app/api/endpoints/galaxy.py`  
**Log Entry:** `"Docs-blob not found for community.aws:latest"`

**No action required** - application behavior is correct.