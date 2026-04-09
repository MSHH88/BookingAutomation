# GapsBeforeProd — All Gaps, Issues & Required Changes Before Production

> Last updated: 2026-04-09 (expanded with full competitor gap audit, profit tracking, nice-to-have features, CRM warning system notes, multi-language clarification, and phased roadmap)
> Status: OPEN — none of the items below have been implemented yet.

---

## 1. SUPER_ADMIN / PLATFORM OWNER ROLE (CRITICAL)

**Gap:** There is no `SUPER_ADMIN` (platform owner / creator) role in the system. The current role hierarchy is only:
`ADMIN (3) > ARTIST (2) > CUSTOMER (1)`

**Required:**
- Add a `SUPER_ADMIN` role that sits above all others (level 4+).
- SUPER_ADMIN is the only role that can:
  - Turn features on or off (feature flags).
  - Switch the business type (e.g. barber → studio → restaurant).
  - See **all leads** across all tenants/businesses.
  - Give any user any role (including ADMIN).
  - Remove any role from any user.
  - Enable or disable entire backend modules for a sold instance.
- ADMIN (business owner) **cannot** assign roles to others by default — unless SUPER_ADMIN explicitly grants them that ability (a "can assign roles" permission flag).
- A customer must **never** be able to give themselves more features or see leads they haven't paid for.
- All of this must be manageable from the CRM.

**Files to change:** `prisma/schema.prisma` (add `SUPER_ADMIN` to `enum Role`), `requireRole.ts`, all route guards.

---

## 2. WHATSAPP MESSAGES ARE HARDCODED — NOT DB-EDITABLE (CRITICAL)

**Gap:** All 5 WhatsApp message templates are hardcoded inside `whatsapp.queue.ts` → `buildWhatsAppMessage()`. There is **no database model** for WhatsApp templates. There is **no CRM UI** to edit them.

**Current hardcoded templates (all 5):**
1. `lead-inquiry` — "Thanks for reaching out, artist will be in touch"
2. `booking-confirmed` — "Your appointment is confirmed for [date] at [time]"
3. `appointment-reminder` — "Reminder: your appointment is tomorrow at [time]"
4. `post-visit-review` — "Thank you for visiting, please leave a Google review"
5. `restaurant-reminder` — "Looking forward to seeing you tonight at [time]"

**Required:**
- Add a `WhatsAppTemplate` model to Prisma schema (fields: `id`, `key`, `body`, `variables`, `isActive`, `updatedAt`).
- Move all 5 template bodies into the DB (seeded with defaults).
- `buildWhatsAppMessage()` must look up the template from DB (or a cache) instead of hardcoding strings.
- Every template must be **fully editable** from the CRM backend — businesses must be able to change the text, language, and signature.
- Each template must support **placeholder variables** (e.g. `{{customerName}}`, `{{studioName}}`, `{{date}}`, `{{time}}`) rendered at send time.

---

## 3. MISSING WHATSAPP MESSAGE TYPES

**Gap:** The current 5 types cover basic journeys but are missing several important automation types common in industry (Fresha, Booksy, Vagaro standard).

**Missing WhatsApp message types to add:**
- **Cancellation confirmation** — sent to customer when their booking is cancelled.
- **Reschedule confirmation** — sent when a booking is rescheduled (new date/time).
- **Waitlist notification** — "A slot has opened up, book now."
- **Payment received / deposit confirmation** — "Your deposit of €X has been received." _(Note: This message is only sent if the Deposit feature is enabled — see Gap #16)_
- **Invoice / receipt link** — "Your invoice is ready."
- **Quote response (tattoo/bespoke)** — "Your artist has responded to your quote request."
- **No-show follow-up** — sent after a no-show to re-engage.
- **Loyalty / reward notification** — "You've earned X loyalty points."
- **Welcome message (new customer)** — first-time booking/registration welcome.
- **Staff notification** — internal WhatsApp alert to artist/staff on new booking (optional but valuable).

---

## 4. EMAIL TEMPLATES — PARTIALLY DONE BUT NOT FULLY EDITABLE FROM CRM

**Gap:** Email templates **do** exist in the DB (`EmailTemplate` model with `key`, `subject`, `htmlBody`, `variables`, `isActive`) and are rendered via Handlebars. However:
- There is **no CRM UI endpoint or section** to list, view, or edit email templates.
- The notifications module has the service logic but it is not exposed to the CRM interface.

**Required:**
- Add a **Email Templates section** to the CRM.
- SUPER_ADMIN and ADMIN (with permission) must be able to: list all templates, edit subject and body, preview rendered output, activate/deactivate a template.
- All businesses must be able to customise templates in their own language and with their own signature/branding.

**Missing email message types to review/add:**
- Booking cancellation email (to customer).
- Booking reschedule email (to customer).
- Waitlist slot available email.
- Payment / deposit receipt email.
- Quote accepted / artist reply email.
- No-show follow-up email.
- Welcome / onboarding email (new customer registration).
- Password reset / account email (if not already present).
- Staff/artist new booking notification email.
- Loyalty reward notification email.

---

## 5. NO CRM EMAIL & WHATSAPP TEMPLATE MANAGEMENT SECTION

**Gap:** There is no dedicated section in the CRM to manage messaging.

**Required CRM sections to build:**
- **Messages > WhatsApp Templates** — list all 5 (and future) WhatsApp templates, edit body text, preview with sample variables.
- **Messages > Email Templates** — list all email templates, edit subject and HTML body, activate/deactivate.
- Both sections must be accessible to SUPER_ADMIN always, and to ADMIN only if SUPER_ADMIN has granted access.

---

## 6. NO CRM ROLES SECTION

**Gap:** There is no CRM UI section for managing user roles and permissions.

**Required:**
- Add a **Roles** section to the CRM.
- SUPER_ADMIN can view all users and change any role.
- SUPER_ADMIN can toggle a "can assign roles" flag on any ADMIN user.
- ADMIN users (with the flag) can assign roles to users within their own business only, and only up to ADMIN level — never SUPER_ADMIN.
- Role changes must take effect immediately (JWT refresh or short TTL required).

---

## 7. NO CRM CONTROL CENTRE (FEATURE FLAGS / BUSINESS TYPE)

**Gap:** Feature flags exist in the DB and there is an admin API endpoint (`PATCH /api/admin/feature-flags/:key`) but there is no CRM Control Centre section.

**Required:**
- Add a **Control Centre** section to the CRM (SUPER_ADMIN only).
- Toggle any feature flag on or off per business/tenant.
- Switch business type (e.g. `barber` → `tattoo_studio`) — this arms/disarms entire backend modules.
- Only SUPER_ADMIN can access this — no other role, no matter what.

---

## 8. NO MULTI-TENANCY / TENANT ISOLATION

**Gap:** The entire codebase is single-tenant. There is no `tenantId` on any model. When you sell a second business the same backend, all data is shared in one DB with no isolation.

**Required (for reselling model):**
- Add `tenantId` to all relevant models: `User`, `Artist`, `Booking`, `Lead`, `StudioSettings`, `FeatureFlag`, `EmailTemplate`, `WhatsAppTemplate`, etc.
- All queries must be scoped to the calling user's `tenantId`.
- SUPER_ADMIN can query across all tenants.
- Feature flags and templates must be per-tenant (each business gets its own copy/overrides).

**Architecture decision needed:** whether to use a single DB with `tenantId` columns (simplest, recommended for start) or separate schemas/databases per tenant.

---

## 9. NO CRM SERVICES SECTION (AVAILABLE OPTIONS / HAIRSTYLES ETC.)

**Gap:** There is no section in the CRM to manage what services, styles, or options a business offers (e.g. available hairstyles for a barber, tattoo styles for a studio, menu items for a restaurant).

**Required:**
- Add a **Services** section to the CRM.
- ADMIN (and SUPER_ADMIN) can add/edit/delete: service names, descriptions, prices, durations, which artists offer which service.
- This connects to the existing `ArtistService` / `setArtistServices` endpoint already built.
- Services must be filterable by business type.

---

## 10. NO CRM ARTIST / FRONTEND MEDIA MANAGEMENT SECTION

**Gap:** There is no section in the CRM to update artist profile pictures or frontend imagery.

**Required:**
- Add a media/content section (or part of the artist profile section) in the CRM.
- Upload or change artist profile photos.
- Update portfolio images.
- Cloudinary is already set up as the media library (`src/lib/cloudinary.ts`).

---

## 11. RESELLING MODEL — CRM URL / MULTI-INSTANCE ARCHITECTURE (DECISION NEEDED)

**Gap:** No architecture decision has been made or implemented for how to serve multiple businesses from one codebase.

**Industry standard approach (recommended):**
- The CRM runs at the **same URL as the frontend**, under a `/crm` path (e.g. `yourbusiness.com/crm`). This is how HubSpot, GoHighLevel, and most SaaS CRMs in the US, Europe, and Asia operate — no separate CRM domain needed per client.
- Each business gets one domain (their own or a subdomain on your platform). The CRM is behind login at `/crm`.
- SUPER_ADMIN has a master login that can switch between tenants.
- No new domain or URL needs to be purchased per client — one deployment, one platform, many tenants.

**What needs to be decided/built:**
- Subdomain routing strategy (e.g. `businessname.yourplatform.com`) OR path-based (`yourplatform.com/client/businessname`).
- Tenant resolution middleware (reads subdomain or header, sets `tenantId` on request context).
- Onboarding flow: SUPER_ADMIN creates a new tenant, assigns ADMIN user, enables features, sets business type — all from CRM.

---

## 12. WHATSAPP AGENT AS A SERVICE (NOT YET BUILT)

**Gap:** The current WhatsApp setup uses Twilio's WhatsApp API (send-only, template-based). There is no conversational WhatsApp agent.

**Required (if requested):**
- Integrate Meta's WhatsApp Business API (Cloud API) — preferred over Twilio for production scale and verified Business accounts.
- Build an inbound webhook to receive customer replies.
- Add an AI agent layer (e.g. OpenAI function-calling) that can: answer FAQs, check availability, take a booking, escalate to human.
- Store conversation history in DB.
- CRM inbox to see and respond to WhatsApp conversations.
- This is a significant standalone feature — should be a separate step.

---

## 13. LEADS ACCESS CONTROL — PARTIALLY DONE BUT NOT COMPLETE

**Current state:** Leads routes are gated by `requireRole('ADMIN')` — so ADMIN and above can see leads. This means any user given ADMIN role can see leads.

**Gap:** Per your requirement, only SUPER_ADMIN should see leads by default. An ADMIN should only see leads if SUPER_ADMIN explicitly grants them "lead access". A customer must never see leads regardless of role.

**Required:**
- Add a `canViewLeads` permission flag per user (default: false).
- SUPER_ADMIN always sees leads.
- ADMIN only sees leads if `canViewLeads = true` (set by SUPER_ADMIN).
- Change leads route guard from `requireRole('ADMIN')` to a custom `requireLeadAccess` middleware.

---

## 14. GENERAL SETTINGS SECTION IN CRM

**Gap:** Studio settings (`StudioSettings`) have an API (`GET/PATCH /api/settings`) but no dedicated CRM UI section distinct from Control Centre.

**Required:**
- A clearly separate **Settings** section in the CRM for general business settings: studio name, email, phone, address, timezone, currency, cancellation policy, Google review URL, etc.
- Distinct from Control Centre (which is for feature flags/business type) and Roles (which is for user permissions).

---

## 15. MESSAGE TEMPLATES NOT PER-TENANT / NOT PER-BUSINESS-TYPE

**Gap:** Email templates are shared globally (no `tenantId`, no `businessType` filter). WhatsApp templates don't exist in DB at all.

**Required:**
- Each tenant (business) must have its own copy of all templates.
- Templates should have a `businessType` tag so defaults can be seeded correctly per type (tattoo studio gets tattoo-specific language, barber gets barber-specific language, etc.).
- SUPER_ADMIN seeds the master defaults; each ADMIN can customise their own copy.

---

## 16. DEPOSIT-FIRST BOOKING ENFORCEMENT

**Gap:** The `Deposit` fields exist in the schema and settings, but there is no enforcement logic that blocks a booking from being confirmed until a deposit is paid.

**Important:** This entire gap **only applies when the Deposit feature flag is enabled**. When the flag is off, bookings flow as normal with no deposit requirement.

**Required:**
- When `DEPOSIT_ENABLED = true`, the booking confirmation endpoint must check whether a deposit payment has been made before moving status from `PENDING` to `CONFIRMED`.
- The deposit amount, percentage vs. flat fee, and which services require it must all be **fully configurable from the CRM Settings**.
- Editable fields: deposit amount (£/€ flat), deposit percentage (% of service price), minimum deposit threshold, which service types require a deposit, refund policy on cancellation.
- The booking-creation flow must present a payment step to the customer before the confirmation is issued.
- Fresha / Booksy enforce this automatically — we should too, but gated behind the feature flag.

---

## 17. NO PROFIT TRACKING / ANALYTICS DASHBOARD

**Gap:** There is no aggregated profit or revenue tracking in the system. Payments are stored as individual `Payment` records but there is no reporting layer.

**Required:**
- Admin profit/analytics dashboard showing: total revenue per period (day/week/month/year), revenue per artist, revenue per service type, average booking value, cancellation rate, no-show rate, top-spending customers.
- **Artist individual profit view** — each artist can log in and see their own: total earnings, commission breakdown, number of bookings completed, average booking value, repeat customer rate, busiest hours/days. This is essential for artist retention and transparency.
- All analytics must be filterable by date range, service, and artist.
- Feature flag `ANALYTICS_ENABLED` to gate this module.

---

## 18. SMS NOTIFICATIONS (NOT JUST WHATSAPP)

**Gap:** All automated notifications currently go via WhatsApp only. Native SMS is a separate channel that many customers (especially older clients) prefer. WhatsApp requires opt-in; SMS just needs a phone number.

**Required:**
- Add SMS support via **Twilio SMS** (separate from Twilio WhatsApp).
- All transactional message types (booking confirmation, reminder, cancellation, reschedule) must support both SMS and WhatsApp as delivery channels.
- Per-customer channel preference: customer chooses SMS or WhatsApp (or both).
- Feature flag `SMS_ENABLED` to gate this channel.

---

## 19. ONLINE BOOKING WIDGET / EMBEDDABLE BOOKING PAGE

**Gap:** There is no public-facing booking page or embeddable widget. The API exists for authenticated flows but there is no anonymous "book a slot" endpoint that a customer can use from a business's website.

**Required:**
- A shareable booking link (`bookings.yourplatform.com/[business-slug]`) or embeddable `<iframe>` snippet.
- Anonymous customer booking flow: select service → select artist → select date/time → enter name/phone/email → confirm (+ deposit if enabled).
- Backend: public `POST /api/public/bookings` endpoint (no auth, rate-limited, CAPTCHA-protected).
- The booking widget must respect all feature flags (deposit, table selection, etc.).
- This is the primary acquisition tool for every competitor (Fresha, Acuity, Booksy all lead with this).

---

## 20. NO-SHOW CHARGE AUTOMATION

**Gap:** No-show fees can be configured in settings but there is no automated enforcement — staff must manually charge or forgive.

**Required:**
- When a booking reaches its scheduled time and is still `CONFIRMED` (not checked in / completed), start a no-show timer (configurable window, e.g. 15 minutes after appointment start).
- After the timer, automatically: mark booking as `NO_SHOW`, trigger the no-show fee charge via Stripe (if card on file), send a no-show follow-up WhatsApp/SMS.
- Feature flag `NO_SHOW_AUTOMATION_ENABLED`.
- ADMIN can configure: no-show fee amount, grace period window, auto-charge vs. manual-review.

---

## 21. STAFF ROTA / SHIFT SCHEDULING

**Gap:** Artists have availability blocks but there is no formal shift/rota system for staff working set hours per week.

**Required:**
- Shift model: recurring weekly schedule per artist (e.g. Mon–Fri 9am–6pm, Sat 10am–4pm, Sun off).
- Rota view in CRM showing all staff shifts for the week.
- Availability blocks become overrides on top of the rota rather than the sole source of truth.
- ADMIN can set, edit, and publish rotas for each artist.
- Feature flag `ROTA_ENABLED`.

---

## 22. SERVICE PACKAGES / BUNDLES

**Gap:** There is no concept of pre-paid service packages or bundles.

**Required:**
- Package model: name, included services, number of uses, total price, expiry.
- Examples: "10 massages for £350", "5 blowdries for £90", "Buy 5 get 1 free".
- Customer can purchase a package online or at checkout.
- System tracks remaining uses per customer per package.
- Each booking auto-deducts from the package balance.
- Feature flag `PACKAGES_ENABLED`.

---

## 23. MEMBERSHIPS / SUBSCRIPTIONS

**Gap:** No recurring subscription or membership billing exists.

**Required:**
- Membership model: name, monthly/annual price, included services, usage limits or unlimited.
- Examples: "Unlimited blowdries £49/month", "Monthly massage subscription £79/month".
- Billing via **Stripe Subscriptions** (recurring monthly or annual payments).
- Member customers get discounted or included services automatically when booking.
- ADMIN can create/manage memberships; customers can subscribe via the booking widget.
- Feature flag `MEMBERSHIPS_ENABLED`.

---

## 24. TIP COLLECTION AT CHECKOUT

**Gap:** There is no tip field on payment — customers cannot add a tip online or at in-person checkout.

**Required:**
- Add optional tip input at the payment step (online and POS).
- Tip options: preset percentages (10%, 15%, 20%) + custom amount.
- Tip is tracked separately on the `Payment` record.
- Tips included in artist earnings/profit view and commission reports.
- Feature flag `TIPS_ENABLED`.

---

## 25. GIFT CARDS / VOUCHERS

**Gap:** There is no gift card or voucher system.

**Required:**
- `GiftCard` model: code, value, issuer, recipient, balance, expiry, redeemed status.
- Sell gift cards online (business can set available denominations).
- Redeem at checkout: customer enters code, balance deducted from invoice total.
- Partial redemption supported (remaining balance stays on card).
- Feature flag `GIFT_CARDS_ENABLED`.

---

## 26. LOYALTY / POINTS PROGRAM

**Gap:** There is no loyalty or points system.

**Required:**
- `LoyaltyAccount` model per customer: points balance, tier, history.
- Points earned per visit, per £ spent, or per specific service.
- Points redeemable on future bookings (ADMIN sets redemption rate).
- Tier levels (e.g. Bronze / Silver / Gold) with perks.
- Loyalty notifications via WhatsApp/SMS/email when points are earned or a reward is available.
- Feature flag `LOYALTY_ENABLED`.

---

## 27. PRODUCT / INVENTORY MANAGEMENT

**Gap:** There is no module for managing retail products alongside services (shampoo, aftercare kits, nail polish, etc.).

**Required:**
- `Product` model: name, SKU, price, stock level, category, image.
- Stock tracking: deduct when sold, alert when low.
- Products can be sold standalone or added to a service booking (e.g. aftercare kit with tattoo session).
- Inventory reports: top-selling products, low-stock alerts, total product revenue.
- Feature flag `INVENTORY_ENABLED`.

---

## 28. POINT OF SALE (POS)

**Gap:** There is no POS mode for in-person walk-in checkout combining services, products, tips, and vouchers.

**Required:**
- POS mode in CRM: staff can create a walk-in booking on the spot, add services + products, apply discount/voucher/gift card, take tip, and process payment.
- Supports cash, card (Stripe Terminal), and voucher payment methods.
- Prints or emails receipt.
- Walk-in bookings are tracked in the same booking system.
- Feature flag `POS_ENABLED`.

---

## 29. STRIPE TERMINAL / CARD READER SUPPORT

**Gap:** Stripe payment is online-only. There is no support for physical card reader (in-person card payment).

**Required:**
- Integrate **Stripe Terminal** (physical card reader SDK).
- POS mode (Gap #28) uses Stripe Terminal for in-person card payments.
- Staff can initiate a payment on the card reader from the CRM/tablet.
- Feature flag `STRIPE_TERMINAL_ENABLED`.

---

## 30. STAFF PAYROLL & COMMISSION TRACKING

**Gap:** There is no payroll, commission, or payout reporting module.

**Required:**
- Per-artist: base pay rate (hourly or daily), commission % on services, commission % on products sold.
- Weekly/monthly payout report: earnings = (base pay) + (service commission) + (product commission) + (tips).
- Split reporting between service earnings and product sales.
- Export to CSV for accountant/payroll processing.
- Artists see their own earnings in their personal dashboard (Gap #17).
- Feature flag `PAYROLL_ENABLED`.

---

## 31. INTAKE / CONSENT FORMS

**Gap:** There is no structured form builder or intake form system. Currently only free-text notes/special requests exist.

**Required:**
- Custom form builder: ADMIN creates forms with field types (text, checkbox, dropdown, date, signature).
- Forms attached to specific services or business types (tattoo consent waiver, massage health questionnaire, allergy form).
- Form presented to customer when booking a service that requires it — must be completed before confirmation.
- Completed form responses stored per booking.
- This is a **legal requirement** for tattoo and massage businesses.
- Feature flag `INTAKE_FORMS_ENABLED`.

---

## 32. SOCIAL MEDIA "BOOK NOW" INTEGRATION

**Gap:** There is no direct Instagram / Facebook booking button integration.

**Required:**
- Generate a shareable booking URL per business (ties into Gap #19 - public booking page).
- Meta Business API integration: add "Book Now" action button to Instagram and Facebook profiles.
- Track bookings that originate from social media (source attribution).
- Feature flag `SOCIAL_BOOKING_ENABLED`.

---

## 33. MULTI-LOCATION SUPPORT

**Gap:** The system is single-location per tenant. Businesses that grow to multiple branches need location switching within one account.

**Required:**
- `Location` model: name, address, timezone, phone — linked to a tenant.
- Artists and services can be scoped to specific locations.
- ADMIN can switch between locations in the CRM.
- Booking widget shows location selector to customers.
- Analytics are per-location and also rolled up across all locations.
- Feature flag `MULTI_LOCATION_ENABLED` (off by default, only needed for multi-branch businesses).

---

## 34. RECURRING BOOKINGS

**Gap:** `rebookIntervalDays` exists on the Service model but there is no automated or customer-facing recurring booking logic.

**Required:**
- When a booking is completed, the system checks `rebookIntervalDays` for that service.
- Auto-send a rebooking nudge via WhatsApp/SMS/email after the interval: "It's been 4 weeks since your last haircut — book again?"
- Customer-facing option during booking to set up recurring bookings (e.g. "Book every 4 weeks").
- ADMIN can view and manage recurring booking schedules per customer.
- Feature flag `RECURRING_BOOKINGS_ENABLED`.

---

## 35. OUTLOOK / APPLE CALENDAR SYNC

**Gap:** Only Google Calendar sync exists. Many artists and business owners use Outlook (Microsoft) or iCloud (Apple).

**Required:**
- **Microsoft Outlook / Exchange** sync via Microsoft Graph API OAuth.
- **Apple iCloud Calendar** sync via CalDAV.
- Same sync behaviour as Google: create/update/delete calendar events when bookings change.
- ADMIN/artist can connect any of the three calendar providers.
- Feature flag `OUTLOOK_CALENDAR_ENABLED`, `APPLE_CALENDAR_ENABLED`.

---

## 36. STAFF MOBILE APP

**Gap:** There is no dedicated mobile view for artists to manage their schedule on-the-go.

**Required:**
- Artist-facing mobile-optimised web app (PWA or React Native wrapper).
- View daily/weekly schedule.
- Accept or decline incoming booking requests.
- View customer details and notes before each appointment.
- Receive push notifications for new bookings, cancellations, messages.
- This is a frontend build — backend APIs mostly exist; need push notification infrastructure.
- Feature flag `STAFF_APP_ENABLED`.

---

## 37. BEFORE / AFTER PHOTO TRACKING PER BOOKING

**Gap:** A photo upload module exists (`src/lib/cloudinary.ts`) but photos are not linked to specific bookings as "result photos".

**Required:**
- Artist can upload before/after photos when completing a booking.
- Photos stored against the booking record and accessible in the customer profile history.
- Portfolio view: artist can see all their before/after work in one gallery.
- Customer can optionally view/download their own photos.
- Important for tattoo, nail, and salon industries for both legal records and portfolio building.
- Feature flag `BOOKING_PHOTOS_ENABLED`.

---

## 38. GROUP / CLASS BOOKING

**Gap:** All bookings are 1:1 (one customer, one artist). There is no capacity-based or group booking model.

**Required:**
- Session model with a `capacity` field (max attendees).
- Customers can book a slot in a session — multiple customers book the same slot up to capacity.
- Relevant for "nail party" events, group massage sessions, group fitness/beauty classes.
- ADMIN can create sessions and set capacity.
- Waiting list for full sessions (ties into existing waitlist module).
- Feature flag `GROUP_BOOKING_ENABLED`.

---

## 39. CUSTOMER SPEND HISTORY / LIFETIME VALUE (LTV) TRACKING

**Gap:** Individual booking and payment records exist but there is no aggregated customer dashboard showing LTV stats.

**Required:**
- Customer profile enriched with: total spend (lifetime), number of visits, last visit date, average spend per visit, most booked service, most booked artist, first visit date.
- ADMIN can filter/sort customers by LTV, visit frequency, last seen date.
- LTV data used for marketing segmentation (e.g. "top spenders", "lapsed customers").
- Customer "health score" for retention risk flagging.

---

## 40. BULK MESSAGING CAMPAIGNS

**Gap:** Only transactional messages exist (triggered by booking events). There is no way to send a broadcast message to a segment of customers.

**Required:**
- Campaign builder: compose an SMS/WhatsApp/email message, select audience (all customers, inactive 30+ days, birthday this month, top spenders, by service type), schedule send time.
- Campaign analytics: delivered, opened (email), clicked, replied.
- Unsubscribe / opt-out handling (legal requirement).
- Templates reusable from the existing template system.
- Feature flag `CAMPAIGNS_ENABLED`.

---

## 41. AUTOMATED REBOOKING NUDGES

**Gap:** `rebookIntervalDays` exists but no automated outreach is sent when the interval has passed.

**Required:**
- BullMQ job scheduled at booking completion + rebookIntervalDays delay.
- Message: "It's been [X] weeks since your [service name] — book again?" with a booking link.
- Send via preferred customer channel (WhatsApp / SMS / email).
- Artist/ADMIN can override per-customer or disable globally.
- Feature flag `REBOOKING_NUDGES_ENABLED`.

_(Note: overlaps with Gap #34 Recurring Bookings — build together in the same phase)_

---

## 42. CLIENT BIRTHDAY AUTOMATION

**Gap:** Customer profiles have a `dateOfBirth` field but no birthday-triggered automation exists.

**Required:**
- Scheduled job (runs daily) checks for customers whose birthday is today or in N days.
- Auto-send birthday message via WhatsApp/SMS/email: "Happy birthday! Here's 15% off your next visit."
- ADMIN can configure: message template, discount amount, advance notice (e.g. send 3 days before).
- Feature flag `BIRTHDAY_AUTOMATION_ENABLED`.

---

## 43. CUSTOMER REFERRAL TRACKING

**Gap:** There is no referral system. No way to track who referred a new customer or to reward referrers.

**Required:**
- "Referred by" field on customer profile (links to another customer record).
- ADMIN can configure referral reward: e.g. referrer gets £10 credit, referee gets 10% off first visit.
- Referral link generation: customer gets a unique link to share; new sign-ups via that link are automatically attributed.
- Referral report: who referred whom, total reward value issued.
- Feature flag `REFERRALS_ENABLED`.

---

## 44. ALLERGY / HEALTH FLAGS ON CUSTOMER PROFILE

**Gap:** Only free-text notes exist for customer health information. There is no structured flag system.

**Required:**
- Structured health flag fields on customer profile: latex allergy, blood thinners, skin conditions, pregnancy, epilepsy, pacemaker, specific product sensitivities.
- Flags are set by ADMIN/artist or by the customer during intake form completion (Gap #31).
- When staff open a booking for a flagged customer, a **visible warning banner** is shown automatically — staff cannot miss it.
- Critical for tattoo, massage, and nail businesses (potential liability issue without this).
- Feature flag `HEALTH_FLAGS_ENABLED`.

---

## 45. DYNAMIC PRICING / SURGE PRICING

**Gap:** Service prices are static. There is no time-based or demand-based pricing adjustment.

**Required:**
- Admin configures pricing rules: peak times (e.g. Fri/Sat evenings +20%), off-peak discounts (e.g. Mon/Tue mornings -15%), seasonal multipliers.
- The booking widget shows adjusted prices dynamically per slot.
- Price shown at booking time is locked in for that booking.
- Revenue analytics show impact of dynamic pricing.
- Feature flag `DYNAMIC_PRICING_ENABLED`.
- **Competitive edge:** No major competitor (Fresha, Booksy, Vagaro) has this. This is a significant differentiator.

---

## 46. SMART WAITLIST MATCHING

**Gap:** Current waitlist just stores entries. When a slot opens, no automated matching occurs.

**Required:**
- When a booking is cancelled, the system scans the waitlist for entries that match: same service, same or any artist, date range overlap, time-of-day preference.
- Best matching waitlist entry is notified immediately via WhatsApp/SMS with a booking link.
- If no response within a configurable window (e.g. 30 minutes), notify the next best match.
- Waitlist entry expires once filled or after ADMIN-set expiry period.
- **Competitive edge:** Most waitlist systems just broadcast to everyone. Smart matching is unique.

---

## 47. ARTIST PERSONAL PERFORMANCE DASHBOARD

**Gap:** Artists have no self-service view of their own performance metrics.

**Required:**
- Artist logs in and sees: own total revenue, revenue by service, revenue by month, repeat customer rate (% of customers who rebooked), average rating (from reviews), average tip amount, busiest hours/days, most popular service, least popular service.
- Visual charts (bar, line, pie).
- Comparison vs. previous month/period.
- This empowers artists and improves retention — they can see the value of their work.
- **Competitive edge:** Vagaro has a basic owner-level version. No platform gives this to the artists themselves.

---

## 48. AI-POWERED BOOKING SUGGESTIONS

**Gap:** No AI recommendation engine exists for personalized rebooking or upsell suggestions.

**Required:**
- Post-visit: "Your regular blowout was 6 weeks ago — want to rebook?" triggered automatically (uses `rebookIntervalDays` + customer history).
- "Based on your history, customers who book [service A] also love [service B] — want to add it?"
- "Your usual artist [name] has availability Tuesday at 3pm — want to grab it?"
- Implementation: call **OpenAI API** with customer's booking history context, get back a natural-language suggestion, send via WhatsApp/SMS/email.
- **Not hard to integrate:** customer booking history already in DB. 1–2 days of backend work, small per-suggestion API cost (~$0.01). Gated by feature flag.
- Feature flag `AI_SUGGESTIONS_ENABLED`.
- **Competitive edge:** No competitor has real AI recommendations — they have basic "rebook" reminders. This is genuinely ahead of the market.

---

## 49. NO-SHOW CHARGE AUTOMATION (FULL AUTOMATION)

_(Overlaps with Gap #20 — documented together for completeness)_

**Gap:** Fresha requires manual triggering of no-show charges. We should fully automate it.

**Required:** See Gap #20. The addition here is that the automation runs **without any staff action** — the timer fires, checks the booking status, and if no check-in recorded, charges the card on file and sends the no-show message automatically.

---

## 50. FRONTEND CRM DESIGN NOTES — WARNING & ALERT SYSTEM

> These are notes for when the frontend CRM is built. Backend data models must support these warning displays.

**Warning banners that must appear in the CRM booking/calendar view:**

- 🔴 **Health Flag Warning** — shown at top of booking detail when the customer has any active health flags (Gap #44). Staff must acknowledge before proceeding.
- 🟡 **Deposit Pending Warning** — shown when deposit feature is enabled and the deposit for the booking has not been received yet. ADMIN is alerted to chase or cancel.
- 🔴 **Overdue Invoice Warning** — shown when a booking has a generated invoice that is past due date.
- 🟡 **Waitlist Match Available** — shown in the calendar when a cancellation has matching waitlist entries waiting. Prompt staff to confirm auto-notification or trigger manually.
- 🟠 **Rebooking Due Warning** — shown in customer profile when the customer is overdue a rebook based on their last service's `rebookIntervalDays`.
- 🟡 **Low Stock Warning** (when Inventory enabled) — shown in POS/checkout when a product being added to a sale has stock below the configured threshold.
- 🔴 **No-Show Timer Active** — shown in calendar view when an appointment start time has passed and the customer has not been marked as checked in. Countdown to auto-charge.
- 🟡 **Card Not on File** — shown when a no-show fee or deposit-first policy is active but the customer has no saved payment method.
- 🔴 **Subscription Payment Failed** — shown in customer profile and admin alerts when a membership/subscription payment has failed via Stripe.
- 🟢 **Birthday Today** — shown in customer profile and booking view when the customer's birthday is today.

---

## 51. MULTI-LANGUAGE UI — CLARIFICATION

**Question from owner:** _"THE MULTI LANGUAGE SUPPORT — WHAT DO YOU MEAN BY THAT AND FOR WHOM? FOR THE CUSTOMERS? I DON'T THINK A SALON OR NAIL TECH NEEDS CUSTOMER SUPPORT."_

**Answer:** You are correct. Multi-language is **NOT for customers**. The customer booking widget should default to English (or whatever language the business owner chooses for their business). Customers contact the business directly if they have questions — there is no customer support layer.

**What multi-language IS for (and who it benefits):**
- The **admin CRM and artist dashboard** UI — so that when you sell this to a French salon, a Dutch nail studio, or a Spanish barber, the staff and ADMIN can use the CRM in their own language.
- It is purely an operator/staff-facing UI translation — labels, menu items, settings, error messages, notifications inside the CRM.
- **Low priority** — for v1 launch, English-only is fine. This only matters when you start selling to non-English-speaking markets.
- Feature flag `UI_LANGUAGE_ENABLED` — off by default. When enabled, ADMIN picks their CRM language from a list.

---

## Summary Table

| # | Gap | Priority | Complexity |
|---|-----|----------|------------|
| 1 | SUPER_ADMIN role missing | CRITICAL | Medium |
| 2 | WhatsApp templates hardcoded | CRITICAL | Medium |
| 3 | Missing WhatsApp message types | HIGH | Medium |
| 4 | Email templates not editable from CRM | HIGH | Low |
| 5 | No CRM Messages section | HIGH | Medium |
| 6 | No CRM Roles section | HIGH | Medium |
| 7 | No CRM Control Centre | HIGH | Low |
| 8 | No multi-tenancy / tenantId | HIGH | High |
| 9 | No CRM Services section | MEDIUM | Low |
| 10 | No CRM artist media management | MEDIUM | Low |
| 11 | Reselling architecture not decided | HIGH | High |
| 12 | WhatsApp agent (AI/conversational) | MEDIUM | Very High |
| 13 | Leads access control incomplete | CRITICAL | Low |
| 14 | No CRM general Settings UI | MEDIUM | Low |
| 15 | Templates not per-tenant | HIGH | Medium |
| 16 | Deposit-first enforcement | HIGH | Medium |
| 17 | No profit tracking / analytics | HIGH | Medium |
| 18 | SMS channel missing | HIGH | Medium |
| 19 | No public booking widget/embed | CRITICAL | High |
| 20 | No-show charge not automated | HIGH | Medium |
| 21 | No staff rota / shift scheduling | MEDIUM | Medium |
| 22 | No service packages / bundles | HIGH | Medium |
| 23 | No memberships / subscriptions | HIGH | High |
| 24 | No tip collection at checkout | MEDIUM | Low |
| 25 | No gift cards / vouchers | HIGH | Medium |
| 26 | No loyalty / points program | MEDIUM | Medium |
| 27 | No product / inventory management | HIGH | Medium |
| 28 | No POS mode | HIGH | High |
| 29 | No Stripe Terminal / card reader | MEDIUM | High |
| 30 | No staff payroll & commission | HIGH | Medium |
| 31 | No intake / consent forms | HIGH | Medium |
| 32 | No social media "Book Now" integration | MEDIUM | Medium |
| 33 | No multi-location support | LOW | High |
| 34 | No recurring bookings automation | HIGH | Medium |
| 35 | No Outlook / Apple Calendar sync | MEDIUM | Medium |
| 36 | No staff mobile app | MEDIUM | High |
| 37 | No before/after photo per booking | MEDIUM | Low |
| 38 | No group / class booking | LOW | Medium |
| 39 | No customer LTV tracking | HIGH | Low |
| 40 | No bulk messaging campaigns | HIGH | Medium |
| 41 | No automated rebooking nudges | HIGH | Low |
| 42 | No birthday automation | MEDIUM | Low |
| 43 | No customer referral tracking | MEDIUM | Medium |
| 44 | No allergy / health flags | HIGH | Low |
| 45 | No dynamic / surge pricing | MEDIUM | Medium |
| 46 | No smart waitlist matching | MEDIUM | Medium |
| 47 | No artist personal performance dashboard | HIGH | Medium |
| 48 | No AI booking suggestions | LOW | Low |
| 49 | No-show charge full automation | HIGH | Medium |
| 50 | CRM warning/alert system (frontend notes) | HIGH | Medium |
| 51 | Multi-language UI (staff/admin only) | LOW | High |

---

## PHASED ROADMAP

> Phases are grouped by theme so related features are built together, sharing schema changes, queue infrastructure, and frontend sections.

---

### PHASE 0 — Security & Architecture Foundation _(Do First — Nothing Else Works Without This)_

All items here are blockers for everything downstream.

| Item | Gap |
|------|-----|
| #1 | SUPER_ADMIN role |
| #13 | Leads access control |
| #6 | CRM Roles section |
| #7 | CRM Control Centre (feature flags) |
| #14 | CRM General Settings UI |
| #11 | Reselling architecture decision (single DB with tenantId is the answer) |
| #8 | Multi-tenancy / tenantId on all models |
| #15 | Templates per-tenant |

---

### PHASE 1 — Messaging Foundation _(WhatsApp + Email + SMS — Build All Together)_

These all touch the same message queue, template system, and delivery infrastructure. Build as one unit.

| Item | Gap |
|------|-----|
| #2 | WhatsApp templates → DB + editable |
| #3 | Missing WhatsApp message types |
| #4 | Email templates editable from CRM |
| #5 | CRM Messages section |
| #18 | SMS via Twilio (separate channel) |
| #42 | Client birthday automation |
| #41 | Automated rebooking nudges |
| #34 | Recurring bookings |
| #40 | Bulk messaging campaigns |

---

### PHASE 2 — Booking Completeness _(Core Booking Flow Gaps)_

These all relate to how bookings are created, confirmed, and managed.

| Item | Gap |
|------|-----|
| #16 | Deposit-first enforcement (when feature enabled, editable amount) |
| #20 / #49 | No-show charge automation |
| #19 | Public booking widget / embeddable page |
| #32 | Social media "Book Now" integration |
| #50 | CRM warning/alert system (frontend design — backend data support) |

---

### PHASE 3 — Customer Profile & Safety _(All About Customer Data — Build Together)_

These all add fields/logic to the customer profile and booking detail view.

| Item | Gap |
|------|-----|
| #44 | Allergy / health flags (with CRM warning banner) |
| #31 | Intake / consent forms |
| #37 | Before/after photo per booking |
| #39 | Customer LTV / spend history tracking |
| #43 | Customer referral tracking |

---

### PHASE 4 — Financial & POS _(Revenue, Payments, Products — Build Together)_

These all share the payment model, Stripe integration, and financial reporting.

| Item | Gap |
|------|-----|
| #24 | Tip collection at checkout |
| #25 | Gift cards / vouchers |
| #27 | Product / inventory management |
| #28 | POS mode |
| #29 | Stripe Terminal / card reader |
| #30 | Staff payroll & commission tracking |
| #17 | Profit tracking / analytics dashboard |
| #47 | Artist personal performance dashboard |

---

### PHASE 5 — Packages, Loyalty & Retention _(Repeat Business — Build Together)_

These all drive customer retention and recurring revenue.

| Item | Gap |
|------|-----|
| #22 | Service packages / bundles |
| #23 | Memberships / subscriptions (Stripe Subscriptions) |
| #26 | Loyalty / points program |
| #46 | Smart waitlist matching |

---

### PHASE 6 — Staff & HR _(Staff-Facing Tools — Build Together)_

These are all staff/artist-facing and don't affect the customer booking flow.

| Item | Gap |
|------|-----|
| #21 | Staff rota / shift scheduling |
| #36 | Staff mobile app |
| #9 | CRM Services section |
| #10 | CRM artist media management |

---

### PHASE 7 — Calendar & Integration Expansion _(Can Do Together)_

These share OAuth / calendar sync infrastructure.

| Item | Gap |
|------|-----|
| #35 | Outlook / Apple Calendar sync |

---

### PHASE 8 — Advanced Intelligence _(AI & Dynamic Features)_

These require the data from all previous phases to be meaningful.

| Item | Gap |
|------|-----|
| #45 | Dynamic / surge pricing |
| #48 | AI-powered booking suggestions (OpenAI — 1–2 days backend work, feature-flagged) |

---

### PHASE 9 — Scale & Growth _(Only Needed When You Have Multi-Location Clients)_

These are only relevant once the business grows.

| Item | Gap |
|------|-----|
| #33 | Multi-location support |
| #38 | Group / class booking |

---

### PHASE 10 — Future / Optional Add-Ons

These are standalone products or features with their own significant scope.

| Item | Gap |
|------|-----|
| #12 | WhatsApp AI conversational agent (significant standalone feature) |
| #51 | Multi-language CRM UI (staff/admin only — not customers) |

---

> **All features are gated by individual feature flags** so they can be toggled on/off per business from the Control Centre. Nothing in any phase is forced on — every business owner can enable only what they need.
