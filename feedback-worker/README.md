# Anonymous dashboard feedback backend

This is backend scaffolding, not a live feature. No dashboard menu or modal is changed by this commit.

## Cloudflare setup

1. Create a Turnstile widget restricted to `lukestaz.github.io`. Keep its public site key for the later dashboard integration. The widget must use action `feedback`.
2. From this directory deploy with Wrangler using your own authenticated Cloudflare session: `npx wrangler deploy`. This creates the Worker and its SQLite Durable Object binding. Check Cloudflare plan/usage charges before deploying.
3. Set secrets through Cloudflare Worker settings or `npx wrangler secret put NAME`:
   - `GITHUB_TOKEN`: expiring fine-grained GitHub token scoped only to Lukestaz/data-dashboard, Issues write permission. This credential authors submitted issues; visitors do not need GitHub accounts.
   - `TURNSTILE_SECRET`: the widget secret.
   - `IP_HASH_SECRET`: a long random secret for deriving non-public per-client gate identifiers.
4. Keep all secrets out of this repository, the dashboard browser code and chat.
5. Record the Worker `/feedback` URL and public Turnstile site key. These are needed to wire the dashboard modal. Never enable the live Submit button until a real end-to-end issue creation test passes (creating that test issue requires approval).

## Request

POST JSON from origin https://lukestaz.github.io:

`{type: 'idea' | 'bug', title, details, dataset: 'amex' | 'legacy', view: 'cards' | 'map', requestId: crypto.randomUUID(), turnstileToken, publicConsent: true, website: ''}`

The `website` field is a hidden honeypot. Client retries must retain the same requestId and content. Success is HTTP 201 with `{number, url}`; only then show a submitted confirmation. If a response indicates uncertain GitHub creation, do not automatically create a second submission.

## Protection and privacy

- Turnstile verification fails closed and checks hostname and action. Origin restrictions are not authentication; Turnstile is still required.
- Five requests per ten minutes per salted IP-derived Durable Object identifier. No raw IP is stored or included in issues. Network providers may still maintain their own logs.
- Serialized processing and cached successful responses reduce duplicate issues from retries. Network timeouts remain uncertain and are not silently retried. Gate state expires after 24 hours of inactivity.
- Maximum 16 KiB request, 120-character title and 4,000-character description.
- Only submitted content and the allowlisted dataset/view context are sent to GitHub. No sync links, saved list, geolocation or page URL is collected.
- The modal must clearly say: Feedback is posted publicly on GitHub. Do not include personal information. Require explicit acknowledgement.

## Remaining work

Build and connect the kebab-menu modal once the endpoint URL and Turnstile site key exist. Test validation, spam rejection, duplicate retries, rate limits, success, GitHub failure and mobile dialog layering before claiming the feature works. No runtime or deployment tests have been performed for this scaffolding.
