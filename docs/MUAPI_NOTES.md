# MuAPI notes

Checked 25 Nov 2026 from public docs only. **No authenticated or publish call has been made.** Nothing here is proven until spike S1 (see PLAN.md).

Evidence tags: **[DOC]** docs page · **[SPEC]** `api.muapi.ai/openapi.json` · **[MODEL]** `GET /api/v1/models/{name}` · **[PLAY]** playground page · **[CODE]** only seen in the existing repo.

Sources: `/docs/social-publishing`, `/docs/pricing`, `/docs/credits`, `/docs/webhooks`, `/docs/authentication`, `/docs/api-reference`, `/docs/file-upload`, `/docs/sandbox-api`, `/docs/white-label`, `/llms.txt`, `/terms`, `/privacy`, `/refund-policy`, three playground pages, the OpenAPI spec and model JSON. `llms.txt` was keyword-searched, not read line by line. The terms, privacy and refund pages were read through a summarising fetch tool, so check the wording before relying on it legally.

## 1. Headline findings

1. **X has no documented per-customer connect flow.** [DOC][SPEC] `connect-url` exists only for YouTube, TikTok, Instagram and Facebook. X, LinkedIn, Threads and Pinterest have only `GET /social/{platform}/connect`, which has no `external_user_id` and connects the account under *our* MuAPI user. X is a must-have, so this is a release blocker until resolved.
2. **There is another company behind it.** [SPEC] describes seven platforms, all except YouTube, as "PostForMe-backed". The approved Meta and X apps therefore appear to belong to PostForMe, or to MuAPI through it. It belongs in the privacy review as a probable sub-processor.
3. **Text-only posts are supported** on Facebook, X, LinkedIn and Threads. [SPEC][MODEL][PLAY] Media is optional, and a caption is then required. Instagram, YouTube, TikTok and Pinterest require media.
4. **No idempotency key on publish endpoints.** [SPEC] A few unrelated endpoints (social search) have `idempotency_key`; the publish schemas do not.
5. **Webhooks have no documented signature.** Treat them as a hint and confirm by polling.
6. **The current catalogue price is $0.02 for all three launch platforms.** [MODEL] See section 7.
7. **MuAPI `upload_file` looks unsuitable for scheduling.** [DOC] "Presigned URLs expire after 1 hour" and files are for "temporary use". Use R2.

## 2. Auth and hosts

- Header `x-api-key`. [DOC] OAuth client-credentials also exists but lists no social scope.
- Documented server: `https://api.muapi.ai`. [SPEC]
- White-label endpoints live under `/api/v1/social/...`.
- Own-account endpoints are `/social/...` in [SPEC], but docs and code use `https://muapi.ai/api/social/...`. Unreconciled.

## 3. Connecting accounts

| Action | Call | Evidence |
|---|---|---|
| Connect Facebook, Instagram, YouTube, TikTok | `POST /api/v1/social/{platform}/connect-url`, body `external_user_id` (required), `redirect_to` (optional full URL). Returns `{url}` | DOC, SPEC |
| Connect X, LinkedIn, Threads, Pinterest | `GET /social/{platform}/connect?account_name&redirect_to`. No `external_user_id`. Returning the URL in a redirect `Location` is CODE only | SPEC, CODE |
| List one workspace's accounts | `GET /api/v1/social/ext/accounts?external_user_id=` | DOC, SPEC |
| List our own accounts | `GET /social/accounts` | DOC, SPEC |
| Rename | `PATCH /api/v1/social/ext/accounts/{id}`, body `account_name` | DOC, SPEC |
| Reversible disconnect | `POST /api/v1/social/ext/accounts/{id}/disconnect`. Publishing then returns 409 | DOC, SPEC |
| Permanent delete | `DELETE /api/v1/social/ext/accounts/{id}`. Frees the account to be connected under another `external_user_id` | DOC, SPEC |

- Ext list fields: `id`, `platform_name`, `account_name`, `platform_user_id`, `external_user_id`, `connected`, `connected_at`. `connected: false` means reconnect needed. **No avatar field.** [DOC]
- The spec describes ext list, rename and delete as covering YouTube, TikTok, Instagram and Facebook only.
- Only platform codes 1=YouTube, 2=TikTok, 3=Instagram are documented. Codes 4–8 in the repo are unsupported by the docs; match on `platform_name`.
- Reconnecting the same underlying account reactivates the old row: the spec says the callback dedupes by `platform_user_id`. **What happens when two workspaces connect the same Page is not stated.**
- Not stated: query parameters added to `redirect_to`; what happens on consent denial; Page picker for someone with several Pages; link expiry.

## 4. Publishing

All are `POST https://api.muapi.ai/api/v1/{platform}-publish`, JSON body, `account_id` (integer) required, returning `request_id` and `status`. [DOC][SPEC]

| Platform | Other fields | Completed output |
|---|---|---|
| facebook | `media_url?`, `caption`, `placement`: reels, stories, timeline (default timeline) | `platform`, `publish_id` [MODEL] |
| instagram | `media_url` **required**, `caption`, `placement`: reels, stories, timeline (default reels), `share_to_feed` (default true), `cover_url?`, `thumb_offset?` | `platform`, `media_id` |
| x | `media_url?`, `caption` (max 280), `reply_settings`: everyone, subscribers, mentioned | `platform`, `publish_id` |
| youtube | `media_url`, `title` (max 100) required; `description`, `tags[]`, `privacy`, `category_id`, `made_for_kids` | `url` |
| tiktok | `media_url`, `title` (max 150), `privacy_level`; SPEC: `allow_comment/duet/stitch`, `is_ai_generated` | `publish_id` |
| linkedin | `media_url?`, `caption` | not stated |
| threads | `media_url?`, `caption`, `placement`: reels, timeline | not stated |
| pinterest | `media_url` required, `title`, `caption`, `board_id?`, `link?` | not stated |

`media_url` has a maximum length of 2,083 and takes exactly one URL. No carousel field exists. Stories placement **is** listed for Facebook and Instagram. `webhook_url` is also accepted in the body. [SPEC]

### Documentation conflicts
- **Instagram:** DOC and PLAY mention `media_type` (VIDEO/IMAGE, default VIDEO); SPEC and MODEL have no such field. How to send a single feed image is unproven: `placement: timeline`, `media_type: IMAGE`, or both.
- **TikTok:** DOC uses `disable_*`; SPEC uses `allow_*`.
- **X reply settings:** PLAY prose says `followers_only`/`accounts_you_follow`; SPEC and MODEL say `subscribers`/`mentioned`. Follow the schema.
- **Result shape:** `output` object on the social page, `outputs` array in the API reference. Parse both.
- **Status:** "fully supported" names only YouTube, Instagram, TikTok, but Facebook and X are `is_enabled: 1`, `is_coming_soon: false`. [MODEL]

### Media rules
MuAPI publishes no numeric limits for our three platforms. Instagram says only MP4/MOV within Reels requirements. The limits in our validator must come from Meta's and X's own documentation and S1.

## 5. Results

- Poll `GET /api/v1/predictions/{request_id}/result`. Statuses: `queued`, `pending`, `processing`, `completed`, `failed`, `cancelled`. [SPEC] (The code's `succeeded` is undocumented.)
- Webhook: `?webhook=https://...`. Payload documented for generations: `id`, `status`, `outputs`, `error`, `created_at` and others. Up to three retries. Social payload not specified.
- Not stated: polling rate, result retention, maximum time in `processing`, whether a "completed" job guarantees the post is live.

## 6. Errors and limits

Documented for social: **409** disconnected account, **404** another developer's account; 422 validation in SPEC. Rate limits, insufficient-balance response for publish, 5xx semantics: **not stated**.

## 7. Money

| Source | Facebook | Instagram | X |
|---|---|---|---|
| Social docs | $0.01 | $0.01 | $0.01 |
| Playground | $0.02 | $0.01 | $0.02 |
| Model JSON (live catalogue) | $0.02 | $0.02 | $0.02 |

- **Budget at $0.02.** `dynamic_pricing: true`, with `POST /api/v1/models/{name}/estimate-cost` available.
- Cost object: `amount_usd`, `amount_credits`, `bonus_credits_used`, `refunded`. Headers: `X-MuAPI-Cost-USD`, `X-MuAPI-Cost-Credits`, `X-MuAPI-Cost-Bonus-Credits`, `X-MuAPI-Cost-Refunded`, `X-Account-Balance` (USD).
- The spec says costs are debited on completion; the credits page says generation deducts at generation time. `llms.txt`: "Failed requests are not charged." Refund policy: usage charges are non-refundable. Not reconciled for publishing.
- Balance: `GET /api/v1/account/balance`; docs example `{"balance": 42.50}`.
- Auto top-up settings exist: `GET/PUT /api/v1/account/auto-topup` (enabled, threshold, amount). Recommended, configured by the owner.

## 8. Test mode
Sandbox keys (`is_test: true`) return mock output without billing. Whether this covers publish endpoints, and whether it truly posts nothing, is **not stated**. We will not depend on it.

## 9. Terms and privacy (needs legal review)
- Terms prohibit using the API to "build competing services". Resale through a scheduler is not addressed. MuAPI sells its own white-label Studio and social tools.
- No SLA. Liability limited to the lesser of $100 or six months' fees.
- The privacy page at `/privacy` is for a PhotoAI mobile app and says nothing about social tokens. Token storage, encryption, retention and region are not stated. No DPA found.
- Site footer names Vadoo Internet Services Private Limited.

## 10. Open questions for MuAPI support
1. How do we connect **X** for an end customer with `external_user_id`? Will `POST /social/x/connect-url` be added?
2. Is reselling through our scheduler allowed under the "competing services" clause? Please confirm in writing.
3. Who holds tokens and platform approvals (MuAPI or PostForMe)? Is there a DPA?
4. Same Page or account connected by two `external_user_id` values: what happens?
5. Instagram single image: exact payload?
6. What price applies per platform, and is a failed publish ever charged?
7. Is there a publish idempotency key, or a way to look up a lost `request_id`?
8. Rate limits, and the response when the balance is too low?
9. Webhook signature? Social payload?
10. Does a sandbox key work for publish without posting?
11. What parameters arrive at `redirect_to`, including on denial?
12. When are results and media fetched and discarded? How long must `media_url` stay live?
13. Is `publish_id` the platform's post ID, so that a link can be built?
14. Is a Page picker offered for owners of several Facebook Pages?

## 11. Live checks (25 Nov 2026, real key, nothing connected or published)
- `GET /account/balance`: 200, `currency: USD`, `balance: 0.0`. Units are confirmed as USD.
- `GET /social/ext/accounts` for an unknown `external_user_id`: 200 and an empty list.
- `connect-url` for Facebook and Instagram: 200 with a `http://localhost` `redirect_to`.
- **Confirmed: PostForMe is the upstream.** Both consent links return to `app.postforme.dev`. It must be named in the privacy policy.
- Still unknown: what reaches our address after consent, and whether its path survives.
