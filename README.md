# Jason Fung Studio

A responsive, one-page portfolio and conversion landing page for Jason Fung Studio. The site is intentionally lightweight and has no build step, database, or server requirement.

The project also includes `shopify-store-design.html`, a cleaner alternate landing page built around the founder-led Shopify services offer.

## Open the site

Open `index.html` in any modern browser.

## Structure

- `index.html` contains the page content and search/social metadata.
- `shopify-store-design.html` contains the alternate Shopify growth landing page.
- `shopify-store-design.css` contains the alternate page's responsive visual system.
- `styles.css` contains the complete visual system and responsive layouts.
- `site-data.js` controls the mobile menu and scroll-reveal interactions.

## Before publishing

- Confirm `cptjason.jf@gmail.com` is the correct contact address or replace it in `index.html`.
- Connect the footer social links if they are added later.
- Add an approved social preview image and corresponding Open Graph image tag.
- Test the final site on a real phone and desktop browser.

## Analytics setup

The site sends GA4 events to measurement ID `G-3W5FPCSZQQ`. Shopify Growth
pages use `jfs-core.js`; other public pages use `analytics.js`.

Tracked events:

- `book_button_click` when a visitor follows a client or partner booking link.
- `generate_lead` after a booking questionnaire is accepted by Web3Forms.
- `assessment_started` when the Shopify Growth assessment begins.
- `assessment_step_viewed` once for each question shown.
- `assessment_answered` whenever an answer is selected. Names and email
  addresses are reported only as `provided`; their values are never sent to GA4.
- `assessment_abandoned` on page exit before the recommendation, including the
  last question, answered count, and completion percentage.
- `partial_lead_saved` after the consented email step is saved successfully.
- `recommendation_service_changed` when a visitor edits the final checklist.
- `quick_apply_recommendation_view`, `generate_lead`, `begin_checkout`,
  `checkout_success_view`, and `onboarding_complete` through the purchase flow.

In GA4 Admin, create event-scoped custom dimensions for `flow_variant`,
`question_key`, `answer_value`, `last_question_key`, and `service_key`. Then use
GA4 Explore → Funnel exploration with `assessment_started`,
`assessment_step_viewed`, `quick_apply_recommendation_view`, and
`begin_checkout`. Use a Free form exploration with `question_key` and
`answer_value` to see demand by service.

### Partial Shopify Growth leads

On Shopify Growth 2, completing the email step sends a consented partial lead to
the existing Web3Forms destination before checkout. These messages use a
subject like `Shopify Growth lead JFS-A-… — checkout not started` and include
the visitor's name, email, answers, recommended services, revenue category, and
the same assessment ID. A later checkout submission uses a subject like
`Shopify Growth checkout JFS-A-… — $150/week` and a `Checkout started` status.
Search the Web3Forms email inbox for the assessment ID to see whether a partial
lead later proceeded to checkout; unmatched partial-lead messages are the
follow-up list.

After publishing, verify each event in GA4 DebugView or Realtime before using it
as a conversion/key event.
