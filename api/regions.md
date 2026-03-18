# Regions

Returns all regions where StreamBIM is available. Use this endpoint to discover regional subdomains (e.g. `sweden`, `norway`) for environment-specific API calls.

## Endpoint

| Method | URL | Auth |
|--------|-----|------|
| GET | `https://global.streambim.com/regions.json` | None |

**Note:** This endpoint is served from `https://global.streambim.com`, not from environment-specific URLs such as `https://{environment}.streambim.com`.

## Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `regions` | array | List of region objects |
| `regions[].subdomain` | string | Subdomain identifier for the region |
| `regions[].title` | string | Display name of the region |
| `regions[].distinctiveLanguages` | string[] | Languages supported in this region |
| `regions[].isDefault` | boolean | Whether this region is the default |

## cURL Example

```bash
curl -X GET "https://global.streambim.com/regions.json"
```

## Example Response

```json
{
  "regions": [
    {
      "subdomain": "sweden",
      "title": "Sweden",
      "distinctiveLanguages": ["sv", "en"],
      "isDefault": false
    },
    {
      "subdomain": "norway",
      "title": "Norway",
      "distinctiveLanguages": ["nb", "en"],
      "isDefault": false
    }
  ]
}
```
