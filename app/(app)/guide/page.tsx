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
} from "@/components/docs/doc-section";

const NAV = [
  {
    id: "getting-started",
    label: "Getting Started",
    children: [
      { id: "first-login", label: "First Login" },
      { id: "adding-first-key", label: "Adding Your First Key" },
    ],
  },
  {
    id: "key-management",
    label: "Key Management",
    children: [
      { id: "adding-keys", label: "Adding Keys" },
      { id: "rotating-keys", label: "Rotating Keys" },
      { id: "expiry-tracking", label: "Expiry Tracking" },
      { id: "tags", label: "Tags & Search" },
    ],
  },
  {
    id: "monitoring",
    label: "Health Check Monitoring",
    children: [
      { id: "how-monitoring-works", label: "How It Works" },
      { id: "setting-up-monitor", label: "Setting Up a Monitor" },
      { id: "injection-types", label: "Key Injection Methods" },
      { id: "reading-results", label: "Reading Results" },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    children: [
      { id: "setup-slack", label: "Slack" },
      { id: "setup-teams", label: "Microsoft Teams" },
      { id: "setup-email", label: "Email (SMTP)" },
      { id: "notification-types", label: "Notification Types" },
    ],
  },
  {
    id: "access-tokens",
    label: "External Access Tokens",
    children: [
      { id: "creating-tokens", label: "Creating Tokens" },
      { id: "using-tokens", label: "Using Tokens" },
      { id: "admin-token-mgmt", label: "Admin: Manage All Tokens" },
    ],
  },
  {
    id: "team",
    label: "Team & Users",
    children: [
      { id: "roles", label: "Roles" },
      { id: "disabling-users", label: "Disabling Accounts" },
    ],
  },
  {
    id: "security",
    label: "Security Model",
  },
  {
    id: "faq",
    label: "FAQ",
  },
];

export default function GuidePage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="User Guide" description="Everything you need to know about API Monitor" />
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

          {/* ── Getting Started ───────────────────────────────────────── */}
          <DocSection id="getting-started" title="Getting Started">
            <P>
              API Monitor is a self-hosted tool for developer teams to securely store, track expiry,
              and verify the health of API keys. This guide walks through the full feature set.
            </P>

            <DocSubSection id="first-login" title="First Login">
              <P>
                Open the app and register. <strong className="text-[#c8cdd6]">The first account to
                register automatically becomes the admin.</strong> Subsequent registrations land in{" "}
                <strong className="text-[#c8cdd6]">Pending</strong> status — the admin must approve
                them from <strong className="text-[#c8cdd6]">Settings → Team</strong> before they
                can access the app.
              </P>
              <Callout type="tip" title="Want to close registration?">
                Admins can disable the <InlineCode>/register</InlineCode> page entirely from{" "}
                <strong className="text-[#c8cdd6]">Settings → User Registration</strong>.
                When disabled, the register page shows a &quot;Registration closed&quot; message and
                the API rejects new account creation. The first-admin bootstrap always works
                regardless of this setting.
              </Callout>
              <Callout type="tip" title="Running on a LAN / server?">
                Set <InlineCode>NEXTAUTH_URL</InlineCode> in your <InlineCode>.env</InlineCode> to
                your server&apos;s address (e.g. <InlineCode>http://192.168.1.10:3020</InlineCode>)
                so OAuth redirects and session cookies work correctly.
              </Callout>
            </DocSubSection>

            <DocSubSection id="adding-first-key" title="Adding Your First Key">
              <P>Navigate to <strong className="text-[#c8cdd6]">Keys → Add Key</strong>. The recommended flow:</P>
              <ol className="list-decimal list-inside space-y-2 text-sm text-[#8892a4] pl-1">
                <li>Click a <strong className="text-[#c8cdd6]">Quick Start preset</strong> for your service (OpenAI, Stripe, GitHub, etc.) — this pre-fills the monitor configuration automatically.</li>
                <li>Give the key a descriptive <strong className="text-[#c8cdd6]">name</strong> (e.g. "Stripe Live", "OpenAI GPT-4 Batch").</li>
                <li>Paste the <strong className="text-[#c8cdd6]">key value</strong>. It's encrypted before being saved.</li>
                <li>Set an <strong className="text-[#c8cdd6]">expiry date</strong> if the key expires.</li>
                <li>Review the pre-filled <strong className="text-[#c8cdd6]">health check</strong> settings and adjust if needed.</li>
                <li>Click <strong className="text-[#c8cdd6]">Add Key</strong>.</li>
              </ol>
              <Callout type="info">
                Don&apos;t see your service in the presets? Choose <strong>Custom</strong> — you can add any service. The preset buttons only affect the default monitor configuration; the key itself can be from anything.
              </Callout>
            </DocSubSection>
          </DocSection>

          {/* ── Key Management ────────────────────────────────────────── */}
          <DocSection id="key-management" title="Key Management">

            <DocSubSection id="adding-keys" title="Adding Keys">
              <P>
                Each key record stores: name, provider label, encrypted key value, optional expiry
                date, tags, and notes. The key value is encrypted with AES-256-GCM using your
                <InlineCode>ENCRYPTION_KEY</InlineCode> — it is never stored in plain text.
              </P>
              <P>
                To reveal a key value on the Keys page, click the{" "}
                <InlineCode>••••••••</InlineCode> button in the Key column. This makes a separate
                authenticated request to <InlineCode>GET /api/keys/:id/reveal</InlineCode>.
              </P>
            </DocSubSection>

            <DocSubSection id="rotating-keys" title="Rotating Keys">
              <P>
                To rotate a key (replace with a new value without deleting the record):
              </P>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-[#8892a4] pl-1">
                <li>Go to <strong className="text-[#c8cdd6]">Keys → [key name] → Edit</strong>.</li>
                <li>Paste the new key value in the <strong className="text-[#c8cdd6]">New Key Value</strong> field.</li>
                <li>Leave the field blank to keep the existing value.</li>
                <li>Click <strong className="text-[#c8cdd6]">Save Changes</strong>.</li>
              </ol>
              <P>The old value is overwritten. Monitor history and configuration are preserved.</P>
            </DocSubSection>

            <DocSubSection id="expiry-tracking" title="Expiry Tracking">
              <P>Keys with an expiry date show a status badge in the dashboard and key table:</P>
              <Table
                headers={["Badge", "Meaning"]}
                rows={[
                  [<span key="s1" className="text-green-400 text-xs font-medium">● Healthy</span>, "Expiry is more than 30 days away."],
                  [<span key="s2" className="text-amber-400 text-xs font-medium">● Expires in Xw</span>, "Expiry is within 7–30 days. Review soon."],
                  [<span key="s3" className="text-red-400 text-xs font-medium">● Expires in Xd</span>, "Expiry is within 7 days. Rotate immediately."],
                  [<span key="s4" className="text-red-400 text-xs font-medium">Expired</span>, "The key has passed its expiry date."],
                  [<span key="s5" className="text-[#8892a4] text-xs">No expiry</span>, "No expiry date set. Key does not expire automatically."],
                ]}
              />
              <P>
                If Slack, Teams, or email notifications are enabled, the scheduler sends a warning
                message once per hour for any key expiring within the configured warning window
                (default: 14 days).
              </P>
            </DocSubSection>

            <DocSubSection id="tags" title="Tags & Search">
              <P>
                Tags are free-form labels applied per key. Use them to filter the dashboard or the
                external API. Common conventions:
              </P>
              <div className="flex flex-wrap gap-1.5 my-2">
                {["production", "staging", "ci", "internal", "third-party", "billing", "ai", "infra"].map((t) => (
                  <span key={t} className="text-[11px] font-mono bg-[#1e2535] border border-[#2a3447] text-[#8892a4] rounded-full px-2.5 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
              <P>
                The Keys page search filters by name, provider, and tag simultaneously.
                The external API supports <InlineCode>?tag=production</InlineCode> and{" "}
                <InlineCode>?provider=stripe</InlineCode> query parameters.
              </P>
            </DocSubSection>
          </DocSection>

          {/* ── Monitoring ────────────────────────────────────────────── */}
          <DocSection id="monitoring" title="Health Check Monitoring">

            <DocSubSection id="how-monitoring-works" title="How It Works">
              <P>
                For each key with a monitor configured, the app&apos;s background scheduler
                periodically makes an HTTP request to a test endpoint — with your key injected
                into the request exactly as it would be in real usage. If the response code
                matches what you configured as &quot;expected&quot;, the check is recorded as{" "}
                <span className="text-green-400">OK</span>. Otherwise it&apos;s{" "}
                <span className="text-red-400">FAIL</span>.
              </P>
              <Callout type="security" title="Your key stays on your server">
                The test request is made from your server to the configured endpoint.
                Key values are never sent to any third-party service — only to the endpoint you
                control in the monitor configuration.
              </Callout>
              <P>
                The scheduler runs every 60 seconds and dispatches any checks that are due based
                on each key&apos;s configured interval. Results are stored and shown in the key
                detail page as a chart and result table.
              </P>
            </DocSubSection>

            <DocSubSection id="setting-up-monitor" title="Setting Up a Monitor">
              <P>Monitor configuration can be set when adding a key or on the key&apos;s detail page. Fields:</P>
              <Table
                headers={["Field", "Description"]}
                rows={[
                  ["Test Endpoint URL", "A lightweight API endpoint that returns success when the key is valid. Prefer low-cost endpoints like /models, /me, /balance, or /ping."],
                  ["HTTP Method", "The HTTP verb for the test request. Most API validation endpoints use GET."],
                  ["How to send the key", "How the key is attached to the request. See injection methods below."],
                  ["Expected HTTP Status", "The status code that means the key is valid (usually 200). Some APIs return 204 or others."],
                  ["Check every", "How often to poll. Shorter intervals give faster alerts but increase outbound requests from your server."],
                ]}
              />
              <Callout type="tip" title="Choosing a good test endpoint">
                Pick an endpoint that: (1) returns quickly, (2) is cheap/free to call, (3) returns
                a distinct non-success code when the key is invalid (e.g. 401). Avoid endpoints
                that trigger billable operations.
              </Callout>
            </DocSubSection>

            <DocSubSection id="injection-types" title="Key Injection Methods">
              <P>
                &quot;Injection&quot; means how the key is attached to the outgoing test request.
                Choose the method that matches how the API expects to receive credentials.
              </P>
              <Table
                headers={["Method", "When to use", "Example"]}
                rows={[
                  [
                    "HTTP Header",
                    "Most modern REST APIs. The key goes in a request header.",
                    <><InlineCode key="e1">Authorization: Bearer sk-proj-...</InlineCode><br /><span className="text-[#4a5568] text-[11px]">Header name: Authorization, Format: Bearer {"{key}"}</span></>,
                  ],
                  [
                    "URL Query Param",
                    "Older APIs or simple webhook-style APIs that read the key from the URL.",
                    <><InlineCode key="e2">GET /endpoint?api_key=abc123</InlineCode><br /><span className="text-[#4a5568] text-[11px]">Param name: api_key</span></>,
                  ],
                  [
                    "JSON Body",
                    "APIs that accept credentials in the POST body.",
                    <><InlineCode key="e3">{`{"api_key": "abc123"}`}</InlineCode><br /><span className="text-[#4a5568] text-[11px]">Field name: api_key</span></>,
                  ],
                  [
                    "Custom Template",
                    "Any non-standard header format. Use {key} as the placeholder.",
                    <><InlineCode key="e4">X-Auth-Token: {"{key}"}</InlineCode><br /><span className="text-[#4a5568] text-[11px]">Header: X-Auth-Token, Format: {"{key}"}</span></>,
                  ],
                ]}
              />
              <P>
                The <strong className="text-[#c8cdd6]">Request Preview</strong> on the Add Key
                form shows exactly what HTTP call will be made before you save.
              </P>
            </DocSubSection>

            <DocSubSection id="reading-results" title="Reading Results">
              <P>
                Open any key to see its monitor dashboard. The uptime bar shows the last 20
                checks as green/red segments. The area chart shows response time over time.
              </P>
              <Table
                headers={["Metric", "Description"]}
                rows={[
                  ["Uptime %", "Percentage of checks that passed in the displayed window."],
                  ["Avg response", "Mean response time in milliseconds across recent checks."],
                  ["Status bar", "Each segment = one check. Green = OK, red = fail. Hover for timestamp and status code."],
                  ["Result table", "Last 20 checks with exact timestamp, status code, response time, and error message."],
                ]}
              />
            </DocSubSection>
          </DocSection>

          {/* ── Notifications ─────────────────────────────────────────── */}
          <DocSection id="notifications" title="Notifications">
            <P>
              API Monitor supports three notification channels — Slack, Microsoft Teams, and email
              (SMTP). Each can be configured and toggled independently. All channel configurations
              are admin-only. Webhook URLs and SMTP passwords are encrypted at rest using the same
              AES-256-GCM key as your API keys.
            </P>

            <DocSubSection id="setup-slack" title="Slack">
              <ol className="list-decimal list-inside space-y-2 text-sm text-[#8892a4] pl-1">
                <li>Go to <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">api.slack.com/messaging/webhooks</a> and create an incoming webhook for your workspace.</li>
                <li>Copy the webhook URL (starts with <InlineCode>https://hooks.slack.com/services/</InlineCode>).</li>
                <li>Paste it in <strong className="text-[#c8cdd6]">Settings → Slack Notifications → Incoming Webhook URL</strong>.</li>
                <li>Click <strong className="text-[#c8cdd6]">Send Test</strong> to verify it works, then <strong className="text-[#c8cdd6]">Save</strong>.</li>
              </ol>
              <Callout type="info">
                After saving, the webhook URL is masked as ••••••••. This is intentional — the URL
                is treated as a secret and is not returned in plain text after it is stored.
                To update it, paste a new URL over the mask.
              </Callout>
            </DocSubSection>

            <DocSubSection id="setup-teams" title="Microsoft Teams">
              <ol className="list-decimal list-inside space-y-2 text-sm text-[#8892a4] pl-1">
                <li>In Teams, go to the channel you want alerts in → <strong className="text-[#c8cdd6]">… → Connectors → Incoming Webhook</strong>.</li>
                <li>Name it (e.g. &quot;API Monitor&quot;) and copy the generated webhook URL.</li>
                <li>Paste it in <strong className="text-[#c8cdd6]">Settings → Microsoft Teams → Webhook URL</strong>.</li>
                <li>Click <strong className="text-[#c8cdd6]">Send Test</strong> then <strong className="text-[#c8cdd6]">Save</strong>.</li>
              </ol>
            </DocSubSection>

            <DocSubSection id="setup-email" title="Email (SMTP)">
              <P>Configure any SMTP server — your own relay, SendGrid, Postmark, Gmail, etc.</P>
              <Table
                headers={["Field", "Description"]}
                rows={[
                  ["SMTP Host", "Hostname of your SMTP server (e.g. smtp.sendgrid.net)."],
                  ["Port", "Usually 587 (STARTTLS) or 465 (SSL). Defaults to 587."],
                  ["Secure (SSL)", "Enable for port 465. Leave off for 587 with STARTTLS."],
                  ["Username / Password", "SMTP auth credentials. The password is encrypted at rest."],
                  ["From address", "The sender address shown in the email header."],
                  ["To address", "The recipient — a team inbox or individual address."],
                ]}
              />
            </DocSubSection>

            <DocSubSection id="notification-types" title="Notification Types">
              <P>Each channel has independent toggles for the following events:</P>
              <Table
                headers={["Event", "Trigger"]}
                rows={[
                  ["Monitor failure", "A health check returns an unexpected status code or network error."],
                  ["Monitor recovered", "A previously failing check passes again."],
                  ["Key expiry warning", "Hourly check finds a key expiring within the warning window (default: 14 days). Sent once per hour while still within the window."],
                  ["Key added", "A new API key is created."],
                  ["Key removed", "An API key is deleted."],
                ]}
              />
              <Callout type="info">
                Notifications are sent by the server-side scheduler, not your browser session.
                They fire as long as the app is running, regardless of whether anyone is logged in.
              </Callout>
            </DocSubSection>
          </DocSection>

          {/* ── Access Tokens ─────────────────────────────────────────── */}
          <DocSection id="access-tokens" title="External Access Tokens">

            <DocSubSection id="creating-tokens" title="Creating Tokens">
              <P>
                Access tokens let external tools (scripts, CI/CD pipelines, containers) fetch key
                values via the REST API without logging in through the web UI.
              </P>
              <ol className="list-decimal list-inside space-y-2 text-sm text-[#8892a4] pl-1">
                <li>Go to <strong className="text-[#c8cdd6]">Settings → API Access Tokens → New Token</strong>.</li>
                <li>Give the token a descriptive name (e.g. &quot;GitHub Actions Deploy&quot;, &quot;Docker Entrypoint&quot;).</li>
                <li>Select the appropriate scope(s) — prefer <InlineCode>read:metadata</InlineCode> unless you actually need key values.</li>
                <li>Optionally set an expiry date for automatic expiration.</li>
                <li>Click <strong className="text-[#c8cdd6]">Create Token</strong> and copy the value shown. <strong className="text-red-400">It will not be shown again.</strong></li>
              </ol>
            </DocSubSection>

            <DocSubSection id="using-tokens" title="Using Tokens">
              <P>Store the token in an environment variable or secrets manager, then use it in API requests:</P>
              <CodeBlock
                language="bash"
                label="Environment variable"
                code={`export API_MONITOR_TOKEN="atm_..."
export API_MONITOR_URL="http://192.168.1.10:3020"`}
              />
              <P>See the <a href="/docs" className="text-blue-400 hover:text-blue-300">API Reference</a> for full endpoint documentation and code examples in Node.js, Python, and GitHub Actions.</P>
            </DocSubSection>

            <DocSubSection id="admin-token-mgmt" title="Admin: Manage All Tokens">
              <P>
                Admins can view and revoke every access token issued by every team member from{" "}
                <strong className="text-[#c8cdd6]">Settings → All Access Tokens</strong>.
                The panel shows:
              </P>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-[#8892a4] pl-1">
                <li><strong className="text-[#c8cdd6]">Token name and prefix</strong> — identifies which token it is without exposing the secret.</li>
                <li><strong className="text-[#c8cdd6]">Owner</strong> — the team member who created it, including their account status.</li>
                <li><strong className="text-[#c8cdd6]">Scopes, created date, last used, and expiry</strong> — full audit trail.</li>
                <li><strong className="text-[#c8cdd6]">Status badge</strong> — Active, Revoked, Expired, or Blocked (owner's account is disabled).</li>
              </ul>
              <Callout type="info" title="Disabled account = blocked tokens">
                When a user account is set to <strong>Disabled</strong>, all of their access tokens
                are automatically blocked at the API boundary — no request using those tokens will
                succeed. The tokens are not deleted, so re-enabling the account restores access
                immediately. Admins can also permanently revoke individual tokens at any time.
              </Callout>
            </DocSubSection>
          </DocSection>

          {/* ── Team & Users ──────────────────────────────────────────── */}
          <DocSection id="team" title="Team & Users">

            <DocSubSection id="roles" title="Roles">
              <Table
                headers={["Role", "Can do"]}
                rows={[
                  [
                    <span key="a" className="text-violet-400 text-xs font-medium">Admin</span>,
                    "Everything. Manage notification settings (Slack / Teams / Email), view and revoke all team members' access tokens, approve/disable/enable accounts, configure app name, registration toggle, and backup schedule. First registered account.",
                  ],
                  [
                    <span key="sa" className="text-blue-400 text-xs font-medium">Sub-Admin</span>,
                    "Manage Members (approve, disable, change name/email). Edit and delete any key, including keys created by other users. View audit logs. Cannot change notification settings, manage Admin accounts, or access system configuration.",
                  ],
                  [
                    <span key="m" className="text-[#8892a4] text-xs font-medium">Member</span>,
                    "Add keys, view all team keys, reveal any key's value. Edit and delete only the keys they created. Issue and revoke their own access tokens. Cannot change notification or admin settings.",
                  ],
                ]}
              />
              <Callout type="info">
                All authenticated members can read all keys — names, metadata, monitor status, and
                revealed values. <strong className="text-[#c8cdd6]">Edit and delete are ownership-scoped:</strong>{" "}
                members can only modify or remove keys they created. Admins and Sub-Admins can
                edit or delete any key.
              </Callout>
              <P>
                New users register at <InlineCode>/register</InlineCode> and start in{" "}
                <strong className="text-[#c8cdd6]">Pending</strong> status until an Admin approves
                them. Admins can also close registration entirely in{" "}
                <strong className="text-[#c8cdd6]">Settings → User Registration</strong>.
              </P>
            </DocSubSection>

            <DocSubSection id="disabling-users" title="Disabling Accounts">
              <P>
                Admins can disable a team member's account from{" "}
                <strong className="text-[#c8cdd6]">Settings → Team</strong>. A disabled account:
              </P>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-[#8892a4] pl-1">
                <li>Cannot log in to the web UI — the session is rejected at sign-in.</li>
                <li>Has any active browser session terminated within 5 minutes — the JWT re-checks account status periodically, and middleware blocks the request as soon as the disabled status is detected.</li>
                <li>Has all API access tokens <strong className="text-[#c8cdd6]">blocked immediately</strong> — any in-flight API request using one of their tokens returns <InlineCode>401 Unauthorized</InlineCode>.</li>
                <li>Retains all data (keys, tokens, audit history) so nothing is lost if the account is re-enabled later.</li>
              </ul>
              <Callout type="tip" title="Re-enabling restores token access">
                Because tokens are blocked rather than deleted, setting the account back to Active
                instantly restores all previously working tokens. If you want to permanently cut
                access, use the <strong>All Access Tokens</strong> panel to revoke individual tokens.
              </Callout>
            </DocSubSection>
          </DocSection>

          {/* ── Security Model ────────────────────────────────────────── */}
          <DocSection id="security" title="Security Model">
            <Table
              headers={["Concern", "Approach"]}
              rows={[
                ["Key storage", "AES-256-GCM encryption. The plaintext value is never written to disk. Only the ciphertext + IV (12-byte nonce) + auth tag are stored."],
                ["Notification secrets", <>Slack and Teams webhook URLs and SMTP passwords are encrypted with AES-256-GCM before storage. They are never returned in plain text by the API — the GET endpoint shows <InlineCode>••••••••</InlineCode>.</>],
                ["Encryption key", <>Derived from <InlineCode>ENCRYPTION_KEY</InlineCode> env var (64 hex chars = 32 bytes). Changing this env var will break decryption of all existing keys.</>],
                ["Access tokens", "SHA-256 hashed before storage. The plaintext token is never stored — only the hash. Compromise of the database does not expose token values. At verification time the owner's account status is checked — tokens from disabled accounts are rejected even if not explicitly revoked."],
                ["Session security", <>NextAuth JWT sessions signed with <InlineCode>AUTH_SECRET</InlineCode> (minimum 32 chars, validated at startup). The JWT re-validates user status from the database every 5 minutes. Disabled accounts are blocked by edge middleware on every request.</>],
                ["Health checks", <>Made from your server to your configured endpoint. Key values leave only to your own infrastructure. Private/internal URLs (localhost, RFC-1918, link-local, <InlineCode>.local</InlineCode> / <InlineCode>.internal</InlineCode>) are rejected to prevent SSRF.</>],
                ["Key reveal", <>Requires an authenticated session. Rate-limited to 20 requests per user per minute. Reveal requests are made server-side; the decrypted value is returned over HTTPS to the logged-in browser only.</>],
                ["GitHub OAuth", "Optional. Only enabled if AUTH_GITHUB_ID and AUTH_GITHUB_SECRET are set."],
              ]}
            />
            <Callout type="warning" title="Protect your .env">
              Anyone with access to <InlineCode>ENCRYPTION_KEY</InlineCode> can decrypt all keys.
              Use a secrets manager (Vault, AWS Secrets Manager, etc.) or at minimum restrict
              file permissions on <InlineCode>.env</InlineCode>: <InlineCode>chmod 600 .env</InlineCode>.
            </Callout>
            <Callout type="warning" title="Run behind HTTPS in production">
              The <InlineCode>navigator.clipboard</InlineCode> API and secure cookies require HTTPS.
              Use a reverse proxy (nginx, Caddy) with a valid certificate in production.
            </Callout>
          </DocSection>

          {/* ── FAQ ───────────────────────────────────────────────────── */}
          <DocSection id="faq" title="FAQ">

            <DocSubSection title="Can I add keys from any service?">
              <P>
                Yes. The provider field is a free-text label — there is no restriction on what
                services you can add. The Quick Start presets only pre-fill the monitor configuration
                for common services; choosing &quot;Custom&quot; gives you a blank monitor config to fill yourself.
              </P>
            </DocSubSection>

            <DocSubSection title="What happens if the server restarts?">
              <P>
                The database (SQLite <InlineCode>dev.db</InlineCode>) persists on disk and survives
                restarts. The background monitor scheduler restarts automatically when the Next.js
                app starts. Any checks missed during downtime are not backfilled.
              </P>
            </DocSubSection>

            <DocSubSection title="Can I use PostgreSQL instead of SQLite?">
              <P>
                Yes. Update <InlineCode>DATABASE_URL</InlineCode> in your <InlineCode>.env</InlineCode> to a PostgreSQL connection string and change the datasource provider in{" "}
                <InlineCode>prisma/schema.prisma</InlineCode> and{" "}
                <InlineCode>prisma.config.ts</InlineCode> from <InlineCode>sqlite</InlineCode> to{" "}
                <InlineCode>postgresql</InlineCode>. Run{" "}
                <InlineCode>npx prisma migrate deploy</InlineCode> to apply the schema.
              </P>
              <CodeBlock
                language="bash"
                label=".env"
                code={`DATABASE_URL="postgresql://user:password@localhost:5432/api_monitor"`}
              />
            </DocSubSection>

            <DocSubSection title="How do I run this as a persistent background service?">
              <P>Use a process manager like PM2 or a systemd unit:</P>
              <CodeBlock
                language="bash"
                label="PM2"
                code={`npm install -g pm2
npm run build
pm2 start "npm start" --name api-monitor
pm2 save
pm2 startup`}
              />
              <CodeBlock
                language="ini"
                label="systemd unit — /etc/systemd/system/api-monitor.service"
                code={`[Unit]
Description=API Monitor
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/api-monitor
EnvironmentFile=/opt/api-monitor/.env
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target`}
              />
            </DocSubSection>

            <DocSubSection title="How do I put this behind nginx?">
              <CodeBlock
                language="nginx"
                label="nginx site config"
                code={`server {
    listen 80;
    server_name monitor.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name monitor.example.com;

    ssl_certificate     /etc/letsencrypt/live/monitor.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.example.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:3020;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}`}
              />
            </DocSubSection>

            <DocSubSection title="What if I lose my ENCRYPTION_KEY?">
              <P>
                All encrypted key values become unrecoverable — they cannot be decrypted without
                the original key. Back up your <InlineCode>ENCRYPTION_KEY</InlineCode> alongside
                the database, ideally in a secrets manager separate from the application server.
              </P>
            </DocSubSection>

          </DocSection>

        </main>
      </div>
    </div>
  );
}
