# ovoa.ai

The OVOA website: the landing pages, plans and Band checkout (Stripe), OVOA accounts
(shared with the app), the members admin and the partner program.

It runs as a Cloudflare Worker (`ovoa-site`, `wrangler.site.jsonc`) on the admin@ovoa.ai
account, with members, partners and Band orders in Cloudflare D1 (`ovoa-site-db`,
tables in `migrations/`). [setup.md](setup.md) has everything about running it.

## Development

```sh
npm install
npm run dev            # http://localhost:8080
npm run test:billing   # checkout, webhooks and memberships against a fake Stripe
npm run test:account   # sign-in and sign-up; needs ovoa-app next to this folder
```

## Deploying

From Git Bash, with the admin@ovoa.ai wrangler login:

```sh
XDG_CONFIG_HOME=C:/Users/thoma/.wrangler-ovoa npm run db:migrate   # when migrations/ changed
XDG_CONFIG_HOME=C:/Users/thoma/.wrangler-ovoa npm run deploy
```

## Built with

- TanStack Start, React, TypeScript, Tailwind CSS
- Cloudflare Workers and D1
- Stripe, Resend
