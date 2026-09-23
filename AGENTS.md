> [!IMPORTANT]
> ovoa.ai is the Cloudflare Worker `ovoa-site` on the admin@ovoa.ai account
> (`wrangler.site.jsonc`), with its data in the D1 database `ovoa-site-db`.
> Deploy from Git Bash with that account's wrangler login:
>
> ```bash
> XDG_CONFIG_HOME=C:/Users/thoma/.wrangler-ovoa npm run db:migrate   # only when migrations/ changed
> XDG_CONFIG_HOME=C:/Users/thoma/.wrangler-ovoa npm run deploy
> ```
>
> Before deploying, `npm run test:billing` and `npm run test:account` (it needs
> `ovoa-app` next to this folder) must pass. Secrets are Worker secrets
> (`npx wrangler secret put NAME -c wrangler.site.jsonc`); setup.md lists them.
> Don't rewrite pushed git history.
