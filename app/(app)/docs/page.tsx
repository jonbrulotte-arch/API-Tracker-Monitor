import { Topbar } from "@/components/layout/topbar";
import { DocNav } from "@/components/docs/doc-nav";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocSection,
  DocSubSection,
  P,
  InlineCode,
  Table,
  Callout,
  EndpointBadge,
} from "@/components/docs/doc-section";

const NAV = [
  {
    id: "overview",
    label: "Overview",
    children: [
      { id: "base-url", label: "Base URL" },
      { id: "authentication", label: "Authentication" },
      { id: "scopes", label: "Scopes" },
    ],
  },
  {
    id: "endpoints",
    label: "Endpoints",
    children: [
      { id: "list-keys", label: "List Keys" },
      { id: "get-key", label: "Get Key by Name" },
    ],
  },
  {
    id: "responses",
    label: "Response Format",
    children: [
      { id: "key-object", label: "Key Object" },
      { id: "errors", label: "Error Codes" },
    ],
  },
  { id: "examples", label: "Code Examples" },
  { id: "token-management", label: "Token Management" },
];

export default function ApiDocsPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="API Reference" description="REST API for external tools and automation" />
      <div className="flex flex-1 min-h-0">
        {/* Sticky sidebar nav */}
        <aside className="hidden lg:block w-52 flex-shrink-0 border-r border-[#1e2535] px-4 py-6 sticky top-[57px] self-start max-h-[calc(100vh-57px)] overflow-y-auto">
          <p className="text-[10px] font-semibold text-[#4a5568] uppercase tracking-wider mb-3">
            On this page
          </p>
          <DocNav items={NAV} />
        </aside>

        {/* Main content */}
        <main className="flex-1 max-w-3xl px-8 py-8 space-y-10 overflow-y-auto">

          {/* ── Overview ─────────────────────────────────────────────── */}
          <DocSection id="overview" title="Overview">
            <P>
              The API Monitor REST API lets external tools — CI/CD pipelines, scripts, infrastructure
              code — retrieve decrypted API key values on demand. Keys stay encrypted in the database;
              this API decrypts and returns them only to authenticated callers with the right scope.
            </P>

            <DocSubSection id="base-url" title="Base URL">
              <P>All endpoints are relative to your deployment root:</P>
              <CodeBlock code="https://your-app.com/api/v1" language="text" label="Base URL" />
              <P>
                In development this is typically{" "}
                <InlineCode>http://localhost:3020/api/v1</InlineCode> or your server IP.
              </P>
            </DocSubSection>

            <DocSubSection id="authentication" title="Authentication">
              <P>
                Every request must include a bearer token in the{" "}
                <InlineCode>Authorization</InlineCode> header. Tokens are issued in{" "}
                <strong className="text-[#c8cdd6]">Settings → API Access Tokens</strong> and begin
                with <InlineCode>atm_</InlineCode>.
              </P>
              <CodeBlock
                language="bash"
                label="Header"
                code={`Authorization: Bearer atm_<your-token>`}
              />
              <Callout type="security" title="Token security">
                Tokens are stored as SHA-256 hashes — the plaintext is shown exactly once at creation.
                If you lose it, revoke and reissue. Treat tokens like passwords: store them in
                environment variables, never in source code.
              </Callout>
            </DocSubSection>

            <DocSubSection id="scopes" title="Scopes">
              <P>Each token is issued with one or more scopes that limit what it can do.</P>
              <Table
                headers={["Scope", "What it allows"]}
                rows={[
                  [
                    <InlineCode key="s1">read:keys</InlineCode>,
                    "Decrypt and return key values. Use for CI/CD and scripts that need the actual secret.",
                  ],
                  [
                    <InlineCode key="s2">read:metadata</InlineCode>,
                    "Return key names, providers, expiry dates, and tags — but not values. Use for dashboards or audit tooling.",
                  ],
                ]}
              />
              <Callout type="tip" title="Principle of least privilege">
                Issue tokens with only the scope needed. A deployment script that only checks
                expiry dates doesn&apos;t need <InlineCode>read:keys</InlineCode>.
              </Callout>
            </DocSubSection>
          </DocSection>

          {/* ── Endpoints ────────────────────────────────────────────── */}
          <DocSection id="endpoints" title="Endpoints">

            <DocSubSection id="list-keys" title="List Keys">
              <EndpointBadge method="GET" path="/api/v1/keys" />
              <P>Returns all keys. By default, key values are masked. Pass <InlineCode>?reveal=true</InlineCode> with a <InlineCode>read:keys</InlineCode> token to include decrypted values.</P>

              <p className="text-xs font-medium text-[#c8cdd6] mt-4 mb-2">Query Parameters</p>
              <Table
                headers={["Parameter", "Type", "Default", "Description"]}
                rows={[
                  [<InlineCode key="p1">reveal</InlineCode>, "boolean", "false", <>Include decrypted key values. Requires <InlineCode>read:keys</InlineCode> scope.</>],
                  [<InlineCode key="p2">provider</InlineCode>, "string", "—", "Filter by provider name (case-insensitive exact match)."],
                  [<InlineCode key="p3">tag</InlineCode>, "string", "—", "Filter by tag (case-insensitive exact match)."],
                ]}
              />

              <p className="text-xs font-medium text-[#c8cdd6] mt-4 mb-1">Response</p>
              <CodeBlock
                language="json"
                label="200 OK — keys listed (reveal=false)"
                code={`{
  "keys": [
    {
      "id": "clxabc123",
      "name": "OpenAI Production",
      "provider": "OpenAI",
      "valueMask": "plac••••••hold",
      "expiresAt": null,
      "tags": ["production", "ai"],
      "status": "active",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "count": 1
}`}
              />
              <CodeBlock
                language="json"
                label="200 OK — keys listed (reveal=true)"
                code={`{
  "keys": [
    {
      "id": "clxabc123",
      "name": "OpenAI Production",
      "provider": "OpenAI",
      "value": "sk-proj-abc123...",
      "expiresAt": null,
      "tags": ["production", "ai"],
      "status": "active",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "count": 1
}`}
              />
            </DocSubSection>

            <DocSubSection id="get-key" title="Get Key by Name">
              <EndpointBadge method="GET" path="/api/v1/keys/:name" />
              <P>
                Returns a single key by name and includes its decrypted value. Requires{" "}
                <InlineCode>read:keys</InlineCode> scope. URL-encode the name if it contains
                spaces or special characters.
              </P>
              <Callout type="info">
                The name match is exact. If your key is named{" "}
                <InlineCode>OpenAI Production</InlineCode>, request{" "}
                <InlineCode>/api/v1/keys/OpenAI%20Production</InlineCode>.
              </Callout>

              <p className="text-xs font-medium text-[#c8cdd6] mt-4 mb-1">Response</p>
              <CodeBlock
                language="json"
                label="200 OK"
                code={`{
  "id": "clxabc123",
  "name": "OpenAI Production",
  "provider": "OpenAI",
  "value": "sk-proj-abc123...",
  "expiresAt": null,
  "tags": ["production"],
  "status": "active",
  "updatedAt": "2025-01-15T10:30:00Z"
}`}
              />
            </DocSubSection>
          </DocSection>

          {/* ── Responses ────────────────────────────────────────────── */}
          <DocSection id="responses" title="Response Format">

            <DocSubSection id="key-object" title="Key Object Fields">
              <Table
                headers={["Field", "Type", "Description"]}
                rows={[
                  [<InlineCode key="f1">id</InlineCode>, "string", "Unique key identifier (cuid)."],
                  [<InlineCode key="f2">name</InlineCode>, "string", "The friendly display name you gave the key."],
                  [<InlineCode key="f3">provider</InlineCode>, "string", "Service or provider label (e.g. OpenAI, Stripe)."],
                  [<InlineCode key="f4">value</InlineCode>, "string", <>Decrypted key value. Only present when <InlineCode>read:keys</InlineCode> scope is used.</>],
                  [<InlineCode key="f5">valueMask</InlineCode>, "string", <>A fixed placeholder mask (<InlineCode>plac••••••hold</InlineCode>). Present when <InlineCode>value</InlineCode> is not returned. Use this field only to confirm the key exists, not to preview the value.</>],
                  [<InlineCode key="f6">expiresAt</InlineCode>, "string | null", "ISO 8601 expiry timestamp, or null if the key does not expire."],
                  [<InlineCode key="f7">tags</InlineCode>, "string[]", "Array of tag strings assigned to the key."],
                  [<InlineCode key="f8">status</InlineCode>, "string", <>Currently always <InlineCode>active</InlineCode>. Reserved for future key lifecycle states.</>],
                  [<InlineCode key="f9">updatedAt</InlineCode>, "string", "ISO 8601 timestamp of the last update to this key record."],
                ]}
              />
            </DocSubSection>

            <DocSubSection id="errors" title="Error Codes">
              <Table
                headers={["HTTP Status", "Meaning", "How to fix"]}
                rows={[
                  ["401", "Missing or invalid token", "Include a valid Authorization header with a non-revoked, non-expired token."],
                  ["403", "Insufficient scope", <>The token doesn&apos;t have <InlineCode>read:keys</InlineCode>. Reissue with the required scope.</>],
                  ["404", "Key not found", "Check the name is spelled correctly and URL-encoded. Names are case-sensitive."],
                  ["500", "Decryption error", "The server failed to decrypt the key. Check ENCRYPTION_KEY hasn't changed."],
                ]}
              />
              <P>All error responses have the shape:</P>
              <CodeBlock
                language="json"
                label="Error response"
                code={`{ "error": "Human-readable error message" }`}
              />
            </DocSubSection>
          </DocSection>

          {/* ── Code Examples ─────────────────────────────────────────── */}
          <DocSection id="examples" title="Code Examples">
            <P>Store your token in an environment variable — never hard-code it.</P>

            <DocSubSection title="cURL">
              <CodeBlock
                language="bash"
                label="bash"
                code={`# Get a single key by name
curl -H "Authorization: Bearer $API_MONITOR_TOKEN" \\
  "https://your-app.com/api/v1/keys/OpenAI%20Production"

# List all keys (metadata only)
curl -H "Authorization: Bearer $API_MONITOR_TOKEN" \\
  "https://your-app.com/api/v1/keys"

# List all keys with decrypted values
curl -H "Authorization: Bearer $API_MONITOR_TOKEN" \\
  "https://your-app.com/api/v1/keys?reveal=true"

# Filter by provider
curl -H "Authorization: Bearer $API_MONITOR_TOKEN" \\
  "https://your-app.com/api/v1/keys?provider=stripe&reveal=true"

# Filter by tag
curl -H "Authorization: Bearer $API_MONITOR_TOKEN" \\
  "https://your-app.com/api/v1/keys?tag=production&reveal=true"`}
              />
            </DocSubSection>

            <DocSubSection title="Node.js / TypeScript">
              <CodeBlock
                language="typescript"
                label="typescript"
                code={`const BASE = process.env.API_MONITOR_URL; // e.g. https://your-app.com
const TOKEN = process.env.API_MONITOR_TOKEN; // atm_...

async function getKey(name: string): Promise<string> {
  const url = \`\${BASE}/api/v1/keys/\${encodeURIComponent(name)}\`;
  const res = await fetch(url, {
    headers: { Authorization: \`Bearer \${TOKEN}\` },
  });
  if (!res.ok) throw new Error(\`API Monitor: \${res.status} fetching "\${name}"\`);
  const data = await res.json();
  return data.value;
}

async function listKeys(opts: { provider?: string; tag?: string } = {}) {
  const params = new URLSearchParams({ reveal: "true", ...opts });
  const res = await fetch(\`\${BASE}/api/v1/keys?\${params}\`, {
    headers: { Authorization: \`Bearer \${TOKEN}\` },
  });
  if (!res.ok) throw new Error(\`API Monitor: \${res.status}\`);
  return (await res.json()).keys;
}

// Usage
const openaiKey = await getKey("OpenAI Production");
const stripeKeys = await listKeys({ provider: "stripe" });`}
              />
            </DocSubSection>

            <DocSubSection title="Python">
              <CodeBlock
                language="python"
                label="python"
                code={`import os
import urllib.parse
import requests

BASE = os.environ["API_MONITOR_URL"]   # https://your-app.com
TOKEN = os.environ["API_MONITOR_TOKEN"] # atm_...

HEADERS = {"Authorization": f"Bearer {TOKEN}"}

def get_key(name: str) -> str:
    """Fetch a single key value by name."""
    encoded = urllib.parse.quote(name, safe="")
    r = requests.get(f"{BASE}/api/v1/keys/{encoded}", headers=HEADERS)
    r.raise_for_status()
    return r.json()["value"]

def list_keys(provider: str | None = None, tag: str | None = None) -> list[dict]:
    """List all keys with decrypted values, optionally filtered."""
    params = {"reveal": "true"}
    if provider:
        params["provider"] = provider
    if tag:
        params["tag"] = tag
    r = requests.get(f"{BASE}/api/v1/keys", headers=HEADERS, params=params)
    r.raise_for_status()
    return r.json()["keys"]

# Usage
openai_key = get_key("OpenAI Production")
stripe_keys = list_keys(provider="stripe")`}
              />
            </DocSubSection>

            <DocSubSection title="GitHub Actions">
              <CodeBlock
                language="yaml"
                label="workflow.yml"
                code={`jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch API keys from API Monitor
        id: keys
        run: |
          OPENAI_KEY=$(curl -sf \\
            -H "Authorization: Bearer \${{ secrets.API_MONITOR_TOKEN }}" \\
            "\${{ vars.API_MONITOR_URL }}/api/v1/keys/OpenAI%20Production" \\
            | jq -r .value)
          echo "::add-mask::$OPENAI_KEY"
          echo "OPENAI_API_KEY=$OPENAI_KEY" >> $GITHUB_ENV

      - name: Use the key
        run: echo "Key loaded (masked in logs)"`}
              />
              <Callout type="tip" title="Masking in logs">
                The <InlineCode>::add-mask::</InlineCode> command tells GitHub Actions to redact
                the value from all subsequent log output.
              </Callout>
            </DocSubSection>

            <DocSubSection title="Docker / docker-compose">
              <CodeBlock
                language="bash"
                label="entrypoint.sh"
                code={`#!/bin/sh
# Inject keys at container start instead of baking them into the image

fetch_key() {
  curl -sf \\
    -H "Authorization: Bearer $API_MONITOR_TOKEN" \\
    "$API_MONITOR_URL/api/v1/keys/$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$1")" \\
    | jq -r .value
}

export OPENAI_API_KEY=$(fetch_key "OpenAI Production")
export STRIPE_SECRET=$(fetch_key "Stripe Live")

exec "$@"`}
              />
            </DocSubSection>
          </DocSection>

          {/* ── Token Management ─────────────────────────────────────── */}
          <DocSection id="token-management" title="Token Management">
            <P>
              Tokens are managed under{" "}
              <strong className="text-[#c8cdd6]">Settings → API Access Tokens</strong> in the web UI.
            </P>
            <Table
              headers={["Action", "How"]}
              rows={[
                ["Create a token", "Settings → API Access Tokens → New Token. Choose scopes and optional expiry. Copy the value shown — it won't be displayed again."],
                ["Revoke a token", "Click the trash icon next to any token. Revocation is immediate; all subsequent requests with that token return 401."],
                ["Rotate a token", "Revoke the old token and create a new one. Update the token value in your environment variables or secrets store."],
                ["Check last used", "The token list shows when each token was last used, helping identify stale tokens to revoke."],
              ]}
            />
            <Callout type="warning" title="Token expiry">
              Tokens can be issued with an optional expiry date. An expired token returns 401.
              If you rely on a token in production, set a calendar reminder to rotate it before expiry,
              or issue a non-expiring token and rotate manually on a schedule.
            </Callout>
          </DocSection>

        </main>
      </div>
    </div>
  );
}
