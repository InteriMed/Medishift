# Google Cloud Pricing: OCR & AI for Document Processing

## Overview
This document explains the pricing for the Document Auto-Fill feature, including free tiers and cost estimates.

---

## 1. Google Cloud Vision API (OCR)

### Pricing Tiers

#### **Free Tier** ✅
- **First 1,000 units/month**: FREE
- Resets monthly
- No credit card required for free tier

#### **Paid Tier**
After free tier is exhausted:
- **Units 1,001 - 5,000,000**: $1.50 per 1,000 units
- **Units 5,000,001+**: $0.60 per 1,000 units

### What is a "Unit"?
For **TEXT_DETECTION** (what we use):
- **1 unit = 1 image/page**
- Each document counts as 1 unit
- Multi-page PDFs count as multiple units

### Examples

**Scenario 1: Small Usage (Within Free Tier)**
- Documents processed: 500/month
- Cost: **$0.00** ✅ (within free tier)

**Scenario 2: Medium Usage**
- Documents processed: 2,000/month
- Free tier: 1,000 documents = $0.00
- Paid tier: 1,000 documents × $1.50/1000 = **$1.50/month**

**Scenario 3: High Usage**
- Documents processed: 10,000/month
- Free tier: 1,000 documents = $0.00
- Paid tier: 9,000 documents × $1.50/1000 = **$13.50/month**

---

## 2. Vertex AI (Gemini 1.5 Flash)

### Pricing Model

#### **Free Tier** ✅
- **First 15 requests per minute (RPM)**: FREE
- **First 1 million tokens per month**: FREE
- **First 1,500 images per month**: FREE

#### **Paid Tier**
After free tier:

**Input Pricing:**
- Text input: **$0.00001875 per 1,000 characters** ($0.075 per 1M characters)
- Image input: **$0.00001875 per image**

**Output Pricing:**
- Text output: **$0.000075 per 1,000 characters** ($0.30 per 1M characters)

### Token Calculation
- **1 token ≈ 4 characters**
- **1,000 characters ≈ 250 tokens**

### Examples

**Typical Document Processing:**
- OCR extracted text: 2,000 characters (input)
- AI structured response: 500 characters (output)
- **Total input tokens**: ~500 tokens
- **Total output tokens**: ~125 tokens

**Cost per Document:**
- Input: 2,000 chars × $0.00001875/1000 = **$0.0000375**
- Output: 500 chars × $0.000075/1000 = **$0.0000375**
- **Total per document**: ~$0.000075 (less than $0.0001)

**Monthly Costs:**

| Documents/Month | Input Chars | Output Chars | Cost |
|----------------|-------------|--------------|------|
| 100 | 200,000 | 50,000 | **$0.01** ✅ |
| 500 | 1,000,000 | 250,000 | **$0.04** ✅ (within free tier) |
| 1,000 | 2,000,000 | 500,000 | **$0.08** |
| 5,000 | 10,000,000 | 2,500,000 | **$0.38** |
| 10,000 | 20,000,000 | 5,000,000 | **$0.75** |

---

## 3. Firebase Cloud Functions

### Pricing

#### **Free Tier (Spark Plan)** ✅
- **2 million invocations/month**: FREE
- **400,000 GB-seconds**: FREE
- **200,000 CPU-seconds**: FREE
- **5 GB network egress**: FREE

#### **Paid Tier (Blaze Plan)**
After free tier:
- **Invocations**: $0.40 per million
- **Compute time (512MB)**: $0.0000125 per GB-second
- **Network egress**: $0.12 per GB

### Cost per Document
Assuming:
- Processing time: 20 seconds
- Memory: 512MB (0.5GB)
- Network: ~100KB per request

**Calculation:**
- Invocation: $0.40 / 1,000,000 = **$0.0000004**
- Compute: 20 sec × 0.5 GB × $0.0000125 = **$0.000125**
- Network: negligible
- **Total**: ~$0.000125 per document

**Monthly Costs:**

| Documents/Month | Invocations | Compute Time | Cost |
|----------------|-------------|--------------|------|
| 100 | 100 | 2,000 sec | **$0.01** ✅ (within free tier) |
| 1,000 | 1,000 | 20,000 sec | **$0.13** |
| 5,000 | 5,000 | 100,000 sec | **$0.63** |
| 10,000 | 10,000 | 200,000 sec | **$1.25** |

---

## 4. Firebase Storage

### Pricing

#### **Free Tier (Spark Plan)** ✅
- **5 GB storage**: FREE
- **1 GB/day download**: FREE
- **20,000 uploads/day**: FREE
- **50,000 downloads/day**: FREE

#### **Paid Tier (Blaze Plan)**
After free tier:
- **Storage**: $0.026 per GB/month
- **Download**: $0.12 per GB
- **Upload**: FREE
- **Operations**: $0.05 per 10,000 operations

### Cost Estimates

**Assuming:**
- Average document size: 500KB
- Documents stored: 1,000
- Total storage: 500MB

**Monthly Cost:**
- Storage: 0.5 GB × $0.026 = **$0.013/month**
- Downloads: minimal (only for processing)
- **Total**: ~$0.01/month

---

## 5. TOTAL COST BREAKDOWN

### Scenario 1: **Small Business (100 documents/month)**

| Service | Usage | Cost |
|---------|-------|------|
| Cloud Vision OCR | 100 documents | **$0.00** ✅ (free tier) |
| Vertex AI (Gemini) | 200K chars in, 50K out | **$0.01** ✅ (free tier) |
| Cloud Functions | 100 invocations | **$0.00** ✅ (free tier) |
| Firebase Storage | 50MB | **$0.00** ✅ (free tier) |
| **TOTAL** | | **$0.01/month** ✅ |

### Scenario 2: **Medium Business (1,000 documents/month)**

| Service | Usage | Cost |
|---------|-------|------|
| Cloud Vision OCR | 1,000 documents | **$0.00** ✅ (free tier) |
| Vertex AI (Gemini) | 2M chars in, 500K out | **$0.08** |
| Cloud Functions | 1,000 invocations | **$0.13** |
| Firebase Storage | 500MB | **$0.01** |
| **TOTAL** | | **$0.22/month** |

### Scenario 3: **Large Business (5,000 documents/month)**

| Service | Usage | Cost |
|---------|-------|------|
| Cloud Vision OCR | 5,000 documents | **$6.00** |
| Vertex AI (Gemini) | 10M chars in, 2.5M out | **$0.38** |
| Cloud Functions | 5,000 invocations | **$0.63** |
| Firebase Storage | 2.5GB | **$0.07** |
| **TOTAL** | | **$7.08/month** |

### Scenario 4: **Enterprise (10,000 documents/month)**

| Service | Usage | Cost |
|---------|-------|------|
| Cloud Vision OCR | 10,000 documents | **$13.50** |
| Vertex AI (Gemini) | 20M chars in, 5M out | **$0.75** |
| Cloud Functions | 10,000 invocations | **$1.25** |
| Firebase Storage | 5GB | **$0.13** |
| **TOTAL** | | **$15.63/month** |

---

## 6. Free Tier Summary

### What's FREE Forever?

✅ **Cloud Vision OCR**: First 1,000 documents/month
✅ **Vertex AI (Gemini)**: First 1M tokens/month (~4M characters)
✅ **Cloud Functions**: First 2M invocations/month
✅ **Firebase Storage**: First 5GB storage

### Realistic Free Usage

**You can process for FREE:**
- **~1,000 documents per month** (Cloud Vision limit)
- **~2,000 documents per month** (Vertex AI limit)
- **~15,000 documents per month** (Cloud Functions limit)

**Bottleneck**: Cloud Vision OCR (1,000 free documents/month)

**Effective Free Tier**: **~1,000 documents/month** ✅

---

## 7. Cost Optimization Tips

### 1. **Batch Processing**
- Process multiple documents in one function call
- Reduces function invocations

### 2. **Caching**
- Cache OCR results for 24 hours
- Avoid re-processing same document

### 3. **Compression**
- Compress images before OCR
- Reduces processing time

### 4. **Smart Retry**
- Only retry on specific errors
- Avoid unnecessary API calls

### 5. **Rate Limiting**
- Limit uploads per user per day
- Prevents abuse

### 6. **Use Gemini Flash (not Pro)**
- Flash is 20x cheaper than Pro
- Sufficient for document extraction

---

## 8. Billing Setup

### Enable Billing

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **Billing**
4. Link a billing account (required for paid tier)

### Set Budget Alerts

1. Go to **Billing** → **Budgets & alerts**
2. Create budget:
   - Name: "Document Processing Budget"
   - Amount: $10/month (or your limit)
   - Alert at: 50%, 90%, 100%

### Monitor Usage

**Cloud Vision:**
```
Cloud Console → APIs & Services → Cloud Vision API → Quotas & System Limits
```

**Vertex AI:**
```
Cloud Console → Vertex AI → Dashboard → Usage
```

**Cloud Functions:**
```
Firebase Console → Functions → Usage
```

---

## 9. Cost Comparison

### Alternative: Manual Data Entry

**Assumptions:**
- Time to manually enter: 15 minutes/document
- Hourly rate: $20/hour
- Cost per document: $5

**Comparison:**

| Documents | Manual Entry | Auto-Fill | Savings |
|-----------|--------------|-----------|---------|
| 100 | $500 | $0.01 | **99.998%** |
| 1,000 | $5,000 | $0.22 | **99.996%** |
| 5,000 | $25,000 | $7.08 | **99.972%** |
| 10,000 | $50,000 | $15.63 | **99.969%** |

**ROI: Massive savings!** 🚀

---

## 10. Recommendations

### For Startups (< 1,000 docs/month)
- ✅ **Stay on free tier**
- ✅ No billing required
- ✅ Cost: $0.00 - $0.22/month

### For Small Businesses (1,000 - 5,000 docs/month)
- ✅ Enable billing
- ✅ Set budget alerts
- ✅ Cost: $0.22 - $7.08/month

### For Enterprises (> 5,000 docs/month)
- ✅ Enable billing
- ✅ Consider volume discounts
- ✅ Implement cost optimization
- ✅ Cost: $7.08 - $15.63/month per 5,000 docs

---

## 11. FAQ

**Q: Do I need a credit card for the free tier?**
A: No, free tier works without billing enabled.

**Q: What happens if I exceed the free tier?**
A: Requests will fail unless you enable billing.

**Q: Can I set a hard limit on spending?**
A: Yes, set budget alerts and disable APIs if exceeded.

**Q: Is there a daily limit?**
A: Yes, Cloud Vision has a default quota of 1,800 requests/minute.

**Q: Can I get volume discounts?**
A: Yes, contact Google Cloud sales for custom pricing.

**Q: What if I only process 50 documents/month?**
A: Completely free! ✅

---

## Summary

### Bottom Line

**Free Tier**: Up to **1,000 documents/month** at **$0.00** ✅

**Paid Tier**: 
- 1,000 docs/month: **$0.22**
- 5,000 docs/month: **$7.08**
- 10,000 docs/month: **$15.63**

**Compared to manual entry**: **99.9%+ savings**

**Recommendation**: Start with free tier, enable billing only when needed.

---

## Resources

- [Cloud Vision Pricing](https://cloud.google.com/vision/pricing)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Google Cloud Free Tier](https://cloud.google.com/free)
