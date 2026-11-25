# SocialGem design system

Same family as SAP DigiTech Solutions (shared look, own name). Scope so far: public site, sign-in, onboarding. The dashboard keeps its old look until M3.

## 1. Rationale
Warm off-white, navy text, one orange accent, hairlines instead of shadows. Geist for everything, Instrument Serif italic for one accent phrase per heading. The page demonstrates the product (flow, composer, simulator) rather than describing it.

Departures from the brief, and why:
- **Framework is Next.js 16**, by your choice. Motion, shadcn/Radix, Tailwind v4, RHF, zod, sonner and lucide are as listed.
- **Orange buttons use navy text.** White on `#FF6B00` is about 2.9:1 and fails WCAG AA; navy passes. Small orange text uses the darker `brand-ink`.
- **The closing gradient starts at `#C94700`**, so white text stays readable.
- **TanStack Form and Table and TypeScript + JS mix** stay from earlier work; new files are strict TypeScript.
- **Public pages are always light.** Dark tokens exist under `.brand-themed` for product screens.
- **Sign-in offers Google and email with password**, with reset and email confirmation.

## 2. Component inventory
- shadcn-style on Radix: `Button`, `Input`, `NativeSelect`, `Field`, `FormAlert`, `Faq` (accordion), mobile menu (dialog).
- Custom: `SiteHeader`, `SiteFooter`, `ContactStack`, `Effects` (reveal, spotlight), `Logo`, `Hero` with flow, `Features`, `Roles`, `Playground`, `Flight`, `PlatformTable`, `DocPage`, `LoginForm`, `Wizard`.

## 3. Tokens
`src/styles/brand.css`. Wrap a screen in `.brand`. Utilities: `container-1280`, `gradient-text`, `gradient-brand`, `mesh-bg`, `glass`, `glass-dark`, `hairline`, `card-elevated`, `card-interactive`, `hover-lift`, `.reveal`, `.marquee`, `.shimmer`.

## 4. Animation

| What | Motion | Time | Reduced motion |
|---|---|---|---|
| Section reveal | fade, 24px, blur | 750ms, stagger 60ms | shown at once |
| Card spotlight | orange radial follows cursor | 250ms | still, no lift |
| Buttons | press scale 0.98, shimmer on hover | 150ms, 700ms | none |
| Flow lines | path draws, badge pops | 900ms | no path animation |
| Tabs, nav marker | shared `layoutId` | spring | jumps |
| Wizard step | 18px slide and fade | 220ms | fade only |
| Wizard progress | scaleX | 450ms | jumps |
| Completion badge | spring 260/18 | – | still |
| Mobile menu | slide in | 300ms | instant |
| Strip | marquee, pauses on hover | 38s loop | static, wraps |

Easing `cubic-bezier(0.22, 1, 0.36, 1)`. Content stays visible if scripts do not run.

## 5. Responsive
- **360:** one column, drawer menu, flow stacks, week becomes a list, wizard shows a step line and bar.
- **768:** two-column cards, drawer menu, table scrolls inside its frame.
- **1280:** full nav, 4 price cards, split-screen sign-in, wizard sidebar.

## 6. Accessibility
Built in: skip link, landmarks, labelled inputs, errors tied to fields plus a form alert, focus moves to each wizard heading, dialog focus trap and Escape, `aria-current`, progress bar values, 44px targets on new controls, visible focus ring, reduced motion, no colour-only status.
Still to do by hand: screen reader pass, 200% zoom, Safari, Firefox, real phones. Some small controls in the demo calendar are under 44px on desktop.

## 7. States
Loading: wizard skeleton, Google button spinner. Empty: contact page without details. Error: sign-in errors, unconfigured Google, blocked storage. Success: step toast, completion screen.
Razorpay, Gemini-style AI and destructive-action patterns come with their milestones.

## 8. Temporary
- Wizard data is stored in the browser (`src/lib/onboarding.ts` holds the shared zod schema). M2 saves it on the server.
- Legal pages are drafts, marked as such and set to noindex.
- `SUPPORT_EMAIL`, `CONTACT_PHONE`, `CONTACT_WHATSAPP` switch on the contact stack. They are read at build time on static pages.
