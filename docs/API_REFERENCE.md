# Sails Tax API Reference

This document describes the Sails Tax API for calculating sales tax programmatically.

## Base URL

```
https://sails.tax/api/v1
```

## Authentication

All API requests require authentication using a Bearer token (API key).

```bash
Authorization: Bearer stax_your_api_key
```

API keys can be created at [Settings → API Keys](https://sails.tax/settings#apikeys).

## Rate Limits

| Plan | Requests/Minute | Monthly Requests |
|------|-----------------|------------------|
| Starter | 60 | 500 |
| Pro | 120 | 5,000 |
| Business | 300 | Unlimited |

Rate limit headers are included in responses:
- `X-RateLimit-Limit` - Requests per minute
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Unix timestamp when limit resets

---

## Endpoints

### Calculate Tax

Calculate sales tax for a transaction.

```http
POST /api/v1/tax/calculate
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Sale amount in dollars |
| `to_state` | string | Yes | Customer state (2-letter code) |
| `to_zip` | string | No | Customer ZIP code (improves accuracy) |
| `to_city` | string | No | Customer city name |
| `from_state` | string | No | Your business state |
| `from_zip` | string | No | Your business ZIP |
| `category` | string | No | Product category (see below) |
| `shipping` | number | No | Shipping amount (taxable in some states) |

#### Product Categories

- `general` - Standard taxable goods (default)
- `clothing` - Apparel and footwear
- `food_grocery` - Unprepared food/grocery items
- `food_prepared` - Restaurant/prepared food
- `digital_goods` - Software, downloads, streaming
- `software` - Canned software
- `medical` - Medical supplies/equipment
- `electronics` - Consumer electronics

#### Example Request

```bash
curl -X POST https://sails.tax/api/v1/tax/calculate \
  -H "Authorization: Bearer stax_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "to_state": "CA",
    "to_zip": "94102",
    "to_city": "San Francisco",
    "category": "general"
  }'
```

#### Response

```json
{
  "success": true,
  "amount": 100.00,
  "tax": 8.63,
  "total": 108.63,
  "rate": 8.625,
  "breakdown": {
    "state_rate": 7.25,
    "county_rate": 0.0,
    "city_rate": 0.0,
    "special_rate": 1.375
  },
  "jurisdiction": {
    "state": "California",
    "state_code": "CA",
    "county": "San Francisco",
    "city": "San Francisco"
  }
}
```

---

### Validate Address

Validate and normalize a US address for tax purposes.

```http
POST /api/v1/address/validate
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `street` | string | Yes | Street address |
| `city` | string | Yes | City name |
| `state` | string | Yes | State (2-letter code or full name) |
| `zip` | string | Yes | ZIP code |

#### Example Request

```bash
curl -X POST https://sails.tax/api/v1/address/validate \
  -H "Authorization: Bearer stax_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102"
  }'
```

#### Response

```json
{
  "valid": true,
  "normalized": {
    "street": "123 MAIN ST",
    "city": "SAN FRANCISCO",
    "state": "CA",
    "zip": "94102"
  },
  "jurisdiction": {
    "state": "California",
    "county": "San Francisco",
    "city": "San Francisco"
  }
}
```

---

### Get Tax Rates

Get current tax rates for a location.

```http
GET /api/v1/rates
```

#### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `state` | string | Yes | State code (2-letter) |
| `zip` | string | No | ZIP code for local rates |
| `city` | string | No | City name |

#### Example Request

```bash
curl "https://sails.tax/api/v1/rates?state=CA&zip=94102" \
  -H "Authorization: Bearer stax_your_api_key"
```

#### Response

```json
{
  "state": "CA",
  "state_name": "California",
  "combined_rate": 8.625,
  "breakdown": {
    "state_rate": 7.25,
    "county_rate": 0.0,
    "city_rate": 0.0,
    "special_rate": 1.375
  },
  "freight_taxable": true,
  "has_nexus": true
}
```

---

### Get Usage

Check your current API usage.

```http
GET /api/v1/usage
```

#### Example Request

```bash
curl https://sails.tax/api/v1/usage \
  -H "Authorization: Bearer stax_your_api_key"
```

#### Response

```json
{
  "plan": "pro",
  "plan_name": "Pro",
  "orders": {
    "current": 423,
    "limit": 5000,
    "remaining": 4577,
    "percent_used": 8
  },
  "billing_period": {
    "start": "2024-02-01T00:00:00Z",
    "end": "2024-02-29T23:59:59Z"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error type",
  "code": "ERROR_CODE",
  "message": "Human-readable description"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `INVALID_REQUEST` | 400 | Missing required field or invalid format |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `ORDER_LIMIT_EXCEEDED` | 403 | Monthly order limit reached |
| `FREE_TIER_IMPORT` | 403 | Free plan doesn't support this feature |
| `INVALID_STATE` | 400 | Unknown state code |
| `SERVER_ERROR` | 500 | Internal server error |

### Example Error

```json
{
  "error": "Order limit exceeded",
  "code": "ORDER_LIMIT_EXCEEDED",
  "message": "You've reached your monthly limit of 500 orders. Upgrade to Pro for more capacity.",
  "current_count": 500,
  "limit": 500,
  "upgrade_url": "https://sails.tax/pricing"
}
```

---

## SDKs & Libraries

### PHP

```php
// Using Guzzle
$client = new GuzzleHttp\Client();
$response = $client->post('https://sails.tax/api/v1/tax/calculate', [
    'headers' => [
        'Authorization' => 'Bearer stax_your_api_key',
        'Content-Type' => 'application/json',
    ],
    'json' => [
        'amount' => 100,
        'to_state' => 'CA',
        'to_zip' => '94102',
    ],
]);
$tax = json_decode($response->getBody(), true);
```

### Python

```python
import requests

response = requests.post(
    'https://sails.tax/api/v1/tax/calculate',
    headers={
        'Authorization': 'Bearer stax_your_api_key',
        'Content-Type': 'application/json',
    },
    json={
        'amount': 100,
        'to_state': 'CA',
        'to_zip': '94102',
    }
)
tax = response.json()
```

### JavaScript/Node.js

```javascript
const response = await fetch('https://sails.tax/api/v1/tax/calculate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer stax_your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 100,
    to_state: 'CA',
    to_zip: '94102',
  }),
});
const tax = await response.json();
```

### Ruby

```ruby
require 'net/http'
require 'json'

uri = URI('https://sails.tax/api/v1/tax/calculate')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Post.new(uri, {
  'Authorization' => 'Bearer stax_your_api_key',
  'Content-Type' => 'application/json'
})
request.body = { amount: 100, to_state: 'CA', to_zip: '94102' }.to_json

response = http.request(request)
tax = JSON.parse(response.body)
```

---

## Webhooks (Coming Soon)

We're working on webhook support for:
- Order limit warnings (80%, 90%, 100%)
- Tax rate changes in your nexus states
- Filing deadline reminders

---

## Need Help?

- **Email:** api-support@sails.tax
- **Dashboard:** [sails.tax/contact](https://sails.tax/contact)
- **Status:** [status.sails.tax](https://status.sails.tax)
