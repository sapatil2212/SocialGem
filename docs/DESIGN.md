# SocialGem design system

Colours follow the logo: violet `#6d28d9` leads, cyan and pink are accents, deep navy `#0d0b2b` is for stages and footers. Geist for text, Instrument Serif italic for one accent phrase per heading. Tokens and utilities are in `src/styles/brand.css`.

- **Logos:** originals are in `public/images/logo`. Trimmed copies in `public/brand` are what pages use; the dark one also has its dark halo removed. Favicons come from `favicon.png`. Use `<Logo tone="light|dark|auto">` and `<Mark>`.
- **Public pages are always light.** Dashboard and admin screens use `.brand-themed` and follow the light or dark theme.
- **Motion** respects reduced motion. Content is visible without scripts.
- **No invented proof:** no fake customers, numbers or testimonials.
- **Legal pages are drafts** until reviewed, and are set to noindex.
- **Contact details** are in `src/content/company.ts`. `SUPPORT_EMAIL`, `CONTACT_PHONE` and `CONTACT_WHATSAPP` override them at build time.

## Super admin
`/admin` has its own session, separate from the customer one: `ADMIN_USER` and `ADMIN_PASS` from the environment, then an emailed code, 4 hours, HttpOnly and SameSite=Strict cookie, revocable row, checked on each request. Changing either setting ends every admin session. Restart the app after changing them.
