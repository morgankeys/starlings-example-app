// Folders and files in Meridian's workspace. Documents carry real text in `contentText`
// (a small markdown subset: #, ##, paragraphs, "- " bullets) so the preview has something
// to render and Ask Birdy has something to read.
import type { FileKind, GeneralAccess, ShareGrant } from '@/domain/types';
import type { FileRecord, FolderRecord } from '../db-types';
import type { SeedClock } from './dates';

const team = (id: string, level: 'view' | 'edit' = 'edit'): ShareGrant => ({
  principalType: 'team',
  principalId: id,
  level,
});
const user = (id: string, level: 'view' | 'edit' = 'edit'): ShareGrant => ({
  principalType: 'user',
  principalId: id,
  level,
});

export function buildFolders(c: SeedClock): FolderRecord[] {
  const folder = (
    id: string,
    name: string,
    parentId: string | null,
    ownerId: string,
    generalAccess: GeneralAccess,
    grants: ShareGrant[] = [],
    projectId: string | null = null,
    created = -120,
  ): FolderRecord => ({
    id,
    name,
    parentId,
    ownerId,
    projectId,
    generalAccess,
    grants,
    createdAt: c.at(created),
    updatedAt: c.at(Math.min(created + 30, -1)),
    deletedAt: null,
  });

  return [
    folder('fd_root', 'All files', null, 'u_dana', 'restricted'),
    folder('fd_company', 'Company', 'fd_root', 'u_dana', 'org_view'),
    folder(
      'fd_catalog',
      "Spring '27 Catalog",
      'fd_root',
      'u_julia',
      'org_view',
      [team('tm_marketing'), team('tm_design')],
      'p_catalog',
      -60,
    ),
    folder('fd_cat_briefs', 'Briefs', 'fd_catalog', 'u_julia', 'org_view', [], 'p_catalog', -58),
    folder('fd_cat_copy', 'Copy', 'fd_catalog', 'u_noah', 'org_view', [], 'p_catalog', -40),
    folder(
      'fd_cat_photo',
      'Photography',
      'fd_catalog',
      'u_ava',
      'org_view',
      [user('u_elena')],
      'p_catalog',
      -45,
    ),
    folder(
      'fd_checkout',
      'Checkout Redesign',
      'fd_root',
      'u_maya',
      'restricted',
      [team('tm_design'), team('tm_eng'), team('tm_marketing', 'view')],
      'p_checkout',
      -90,
    ),
    folder(
      'fd_co_research',
      'Research',
      'fd_checkout',
      'u_sam',
      'restricted',
      [],
      'p_checkout',
      -85,
    ),
    folder('fd_co_design', 'Design', 'fd_checkout', 'u_maya', 'restricted', [], 'p_checkout', -70),
    folder(
      'fd_supplier',
      'Supplier Portal',
      'fd_root',
      'u_priya',
      'restricted',
      [team('tm_ops'), team('tm_eng'), user('u_ines'), user('u_maya', 'view')],
      'p_supplier',
      -50,
    ),
    folder(
      'fd_marketing',
      'Marketing',
      'fd_root',
      'u_julia',
      'org_view',
      [team('tm_marketing')],
      null,
      -200,
    ),
    folder('fd_ops', 'Operations', 'fd_root', 'u_dana', 'restricted', [team('tm_ops')], null, -200),
  ];
}

interface FileSeed {
  id: string;
  name: string;
  kind: FileKind;
  folderId: string;
  ownerId: string;
  /** Days ago it was last updated (negative), and who updated it. */
  updated: number;
  updatedById?: string;
  size?: number;
  version?: number;
  generalAccess?: GeneralAccess;
  grants?: ShareGrant[];
  content?: string;
}

const FILES: FileSeed[] = [
  // ---- Company --------------------------------------------------------------------------
  {
    id: 'fl_handbook',
    name: 'Employee handbook 2026.pdf',
    kind: 'pdf',
    folderId: 'fd_company',
    ownerId: 'u_dana',
    updated: -64,
    size: 2_480_000,
    version: 4,
    content: `# Employee handbook 2026

## Working at Meridian
Meridian makes gear for people who spend their weekends outside. We work the same way we expect our gear to work: dependable, repairable and honest about what it can do.

## Core hours
Core collaboration hours are 10:00–15:00 Mountain Time, Monday to Thursday. Fridays are kept meeting-free wherever possible.

## Time off
Everyone gets 25 days of paid time off plus the Meridian "field days": two extra days a year to go use the gear.

## Tools
- Birdy for tasks, files and team spaces
- Email for external partners
- The #ask-ops channel for anything about equipment, travel or payroll`,
  },
  {
    id: 'fl_brand',
    name: 'Brand guidelines.pdf',
    kind: 'pdf',
    folderId: 'fd_company',
    ownerId: 'u_ava',
    updated: -30,
    size: 18_400_000,
    version: 7,
    content: `# Meridian brand guidelines

## Voice
Plain-spoken, warm and specific. We'd rather say "keeps you dry in a sideways storm" than "advanced weather protection."

## Photography
Real places, real weather, people mid-activity. No studio sweeps for hero images. Gear is used, a little muddy, and never posed like a mannequin.

## Color
Earth-toned neutrals with one accent per spread. The Meridian orange is reserved for the logo and calls to action.`,
  },
  {
    id: 'fl_calendar',
    name: '2027 planning calendar.xlsx',
    kind: 'sheet',
    folderId: 'fd_company',
    ownerId: 'u_dana',
    updated: -12,
    size: 96_000,
    version: 11,
    content: `# 2027 planning calendar

- January: Spring '27 catalog launch (week 2), Q1 campaign starts
- February: Supplier portal pilot with three vendors
- March: Spring freight lands at the Denver warehouse
- April: Checkout redesign full rollout
- May: Summer line photography`,
  },
  {
    id: 'fl_orgchart',
    name: 'Org chart.png',
    kind: 'image',
    folderId: 'fd_company',
    ownerId: 'u_dana',
    updated: -40,
    size: 640_000,
  },

  // ---- Spring '27 Catalog ---------------------------------------------------------------
  {
    id: 'fl_launch_plan',
    name: "Spring '27 launch plan.docx",
    kind: 'doc',
    folderId: 'fd_catalog',
    ownerId: 'u_julia',
    updated: -2,
    updatedById: 'u_julia',
    size: 184_000,
    version: 9,
    content: `# Spring '27 catalog launch plan

## Goal
Launch the Spring '27 catalog in print and on meridianoutdoor.com in the second week of January, with the new tents and shelters line as the hero story.

## Milestones
- Photography selects delivered: end of this month
- Product copy locked: two weeks before print
- Page map final: before layout starts
- Print files to printer: six weeks before launch
- Landing page live: launch day, 7:00 MT

## Owners
- Julia Romero: overall launch, page map, budget
- Noah Fischer: product copy and headlines
- Ava Lindqvist: photography production with Northlight Studio
- Leo Brandt: catalog landing page design
- Marcus Bell: launch email sequence and paid social

## Risks
- Tents and shelters copy is late, which pushes the copy lock.
- Ridgeline jacket colorways might change after the supplier's fabric test.
- The landing page depends on the new product-grid component from Product Design.

## Decisions
- Decision: The cover story is the Alpine 2 tent at the Maroon Bells campsite.
- Decision: Print run drops from 120k to 95k; the difference goes to paid social.`,
  },
  {
    id: 'fl_launch_notes',
    name: 'Launch sync notes.docx',
    kind: 'doc',
    folderId: 'fd_catalog',
    ownerId: 'u_julia',
    updated: -1,
    updatedById: 'u_noah',
    size: 52_000,
    version: 3,
    content: `# Launch sync notes

Attendees: Julia, Noah, Ava, Leo, Maya, Marcus

## Status
Photography is on track; Elena delivers Ridgeline jacket selects this week. Copy for tents and shelters is behind by about three days. The page map is in its final review.

## Discussion
Maya raised that the landing page needs the product-grid component before Leo can finish layout. Raj's team can ship it in the next sprint if the spec is final by Friday.

## Decisions
- Decision: Keep the cover headline short; Noah will bring three options.
- Decision: Hero shot list needs Maya's approval before the shoot is booked.

## Action items
- Action: Noah to finish tents and shelters copy.
- Action: Maya to approve the hero shot list.
- Action: Julia to finalize the page map.
- Action: Leo to start the landing page layout.`,
  },
  {
    id: 'fl_page_map',
    name: 'Catalog page map.xlsx',
    kind: 'sheet',
    folderId: 'fd_catalog',
    ownerId: 'u_julia',
    updated: -3,
    size: 74_000,
    version: 14,
    content: `# Catalog page map

- Pages 1–2: Cover, Alpine 2 tent at Maroon Bells
- Pages 3–10: Tents and shelters (8 SKUs)
- Pages 11–18: Ridgeline jacket and layering system
- Pages 19–24: Packs and carry
- Pages 25–30: Camp kitchen
- Pages 31–32: Repair program and store locator`,
  },
  {
    id: 'fl_creative_brief',
    name: 'Catalog creative brief.docx',
    kind: 'doc',
    folderId: 'fd_cat_briefs',
    ownerId: 'u_julia',
    updated: -45,
    size: 96_000,
    version: 5,
    content: `# Spring '27 catalog creative brief

## The story
"Further, together." Spring is when people plan their first trips of the year. The catalog should feel like a trip-planning companion, not a price list.

## Audience
Weekend adventurers aged 28–45 who buy fewer, better things and care about repairability.

## What success looks like
- Catalog-attributed online sales up 15% over Spring '26
- Tents and shelters category up 25%
- 40% of catalog visitors land on a product page within two clicks

## Mandatories
- Every product shot outdoors in real conditions
- Repair program on the closing spread
- Prices and SKU codes on every product`,
  },
  {
    id: 'fl_shoot_brief',
    name: 'Hero shoot brief.docx',
    kind: 'doc',
    folderId: 'fd_cat_briefs',
    ownerId: 'u_ava',
    updated: -9,
    size: 68_000,
    version: 4,
    grants: [user('u_elena', 'view')],
    content: `# Hero shoot brief

## Shoots
- Alpine 2 tent, Maroon Bells campsite at first light
- Ridgeline jacket, ridge walk in wind, two colorways
- Packs, trailhead to summit sequence

## Look
Golden hour, natural light, no artificial fill. Faces partly turned away so the gear leads.

## Logistics
Northlight Studio (Elena Ruiz) shoots. Two shoot days plus a weather day. Permits for Maroon Bells are confirmed by Ava.

## Approvals
Maya approves the hero shot list for design fit before the shoot is booked. Julia gives final sign-off on selects.`,
  },
  {
    id: 'fl_copy_deck',
    name: 'Product copy deck.docx',
    kind: 'doc',
    folderId: 'fd_cat_copy',
    ownerId: 'u_noah',
    updated: -1,
    updatedById: 'u_noah',
    size: 142_000,
    version: 12,
    content: `# Product copy deck

## Status
Packs: done. Camp kitchen: done. Ridgeline jacket: in review. Tents and shelters: in progress (4 of 8 SKUs written).

## Alpine 2 tent (draft)
Two doors, two vestibules and a pitch you can do with cold hands. The Alpine 2 weighs 1.6 kg and still stands up to a Rocky Mountain afternoon storm.

## Ridgeline jacket (in review)
Three layers, fully taped and cut long enough to cover a harness. Built to be repaired, not replaced.

## Open questions
- Do we say "waterproof" or "storm-proof"? Legal prefers "waterproof (20k mm)".
- Theo asked to keep spec lines in the same order on every product.`,
  },
  {
    id: 'fl_headlines',
    name: 'Cover headlines v3.docx',
    kind: 'doc',
    folderId: 'fd_cat_copy',
    ownerId: 'u_noah',
    updated: -2,
    size: 24_000,
    version: 3,
    content: `# Cover headlines v3

- Further, together.
- First light, first trip.
- The season starts outside.

Noah's pick: "Further, together." It matches the brief and works as the campaign line.`,
  },
  {
    id: 'fl_shot_list',
    name: 'Hero shot list.xlsx',
    kind: 'sheet',
    folderId: 'fd_cat_photo',
    ownerId: 'u_ava',
    updated: -1,
    updatedById: 'u_elena',
    size: 41_000,
    version: 6,
    content: `# Hero shot list

- 01 Cover: Alpine 2 tent, Maroon Bells, sunrise, wide (needs design approval)
- 02 Tents spread: Alpine 2 interior, two people, morning light
- 03 Ridgeline jacket: ridge walk, wind, Basalt colorway
- 04 Ridgeline jacket: detail, hood adjustment, Lichen colorway
- 05 Packs: trailhead sequence, three frames
- 06 Repair program: hands patching a jacket at a workbench`,
  },
  {
    id: 'fl_moodboard',
    name: 'Spring moodboard.pptx',
    kind: 'slides',
    folderId: 'fd_cat_photo',
    ownerId: 'u_ava',
    updated: -6,
    size: 22_600_000,
    version: 2,
    content: `# Spring moodboard

## Slide 1: Light
Early-morning alpine light, long shadows, cool blues warming to gold.

## Slide 2: People
Small groups, mid-conversation, gear in use. Nobody looks at the camera.

## Slide 3: Texture
Granite, frost on tent fabric, mud on boots.`,
  },
  {
    id: 'fl_img_ridgeline',
    name: 'Ridgeline jacket – hero.jpg',
    kind: 'image',
    folderId: 'fd_cat_photo',
    ownerId: 'u_elena',
    updated: -2,
    updatedById: 'u_elena',
    size: 8_200_000,
  },
  {
    id: 'fl_img_alpine',
    name: 'Alpine 2 – campsite test.jpg',
    kind: 'image',
    folderId: 'fd_cat_photo',
    ownerId: 'u_elena',
    updated: -5,
    size: 7_600_000,
  },

  // ---- Checkout Redesign ----------------------------------------------------------------
  {
    id: 'fl_co_brief',
    name: 'Checkout redesign – project brief.docx',
    kind: 'doc',
    folderId: 'fd_checkout',
    ownerId: 'u_maya',
    updated: -50,
    size: 88_000,
    version: 6,
    content: `# Checkout redesign: project brief

## Problem
68% of shoppers who start checkout on meridianoutdoor.com don't finish. Mobile abandonment is 74%. The biggest drop-offs are the account wall, the address form, and surprise shipping costs on the payment step.

## Goals
- Reduce checkout abandonment from 68% to 55% by April
- Add guest checkout
- Show shipping cost before the payment step
- Support Apple Pay and Google Pay

## Scope
Cart review, address, shipping options, payment, and confirmation. Account creation moves to after the purchase.

## Team
Maya Okafor (lead), Leo Brandt, Inés Carvalho, Sam Whitaker, Theo Nakamura. Engineering: Raj Patel's team.`,
  },
  {
    id: 'fl_review_notes',
    name: 'Design review notes – checkout v2.docx',
    kind: 'doc',
    folderId: 'fd_checkout',
    ownerId: 'u_maya',
    updated: -2,
    updatedById: 'u_maya',
    size: 46_000,
    version: 2,
    content: `# Design review notes: checkout v2

Attendees: Maya, Leo, Inés, Sam, Theo, Raj, Chloé

## What we reviewed
The v2 flow: cart review, single-page address and shipping, payment with express wallets at the top.

## Feedback
Raj flagged that inline address validation needs the new address service, and the API key for it hasn't been issued yet. Chloé can't finish the Safari autocomplete fix without it.
Sam noted that round 2 participants missed the "edit cart" link on mobile.

## Decisions
- Decision: Express wallets (Apple Pay, Google Pay) move above the card form.
- Decision: Guest checkout is the default; account creation is offered on the confirmation page.
- Decision: Error states for the address form must be final before engineering starts the build.

## Action items
- Action: Maya to finalize address form error states.
- Action: Leo to add the Apple Pay flow to the spec.
- Action: Ben to send the address-service API key to Chloé.
- Action: Sam to synthesize round 2 interviews.`,
  },
  {
    id: 'fl_findings',
    name: 'Checkout usability study – findings.docx',
    kind: 'doc',
    folderId: 'fd_co_research',
    ownerId: 'u_sam',
    updated: -20,
    size: 128_000,
    version: 3,
    content: `# Checkout usability study: findings (round 1)

## Method
Eight moderated sessions, five on mobile and three on desktop. Participants bought a jacket and a tent on the live site.

## Key findings
- Six of eight participants hesitated at the account wall; two abandoned there.
- The address form's error messages appeared only after submit, and three participants couldn't tell which field was wrong.
- Shipping cost appeared only on the payment step; four participants called it "a surprise".
- Participants who had Apple Pay looked for it and didn't find it.

## Recommendations
- Make guest checkout the default.
- Validate the address inline, field by field, with specific messages.
- Show shipping options and cost on the address step.
- Put express wallets at the top of payment.`,
  },
  {
    id: 'fl_interviews',
    name: 'Interview notes – round 2.docx',
    kind: 'doc',
    folderId: 'fd_co_research',
    ownerId: 'u_sam',
    updated: -1,
    updatedById: 'u_sam',
    size: 210_000,
    version: 8,
    content: `# Interview notes: round 2

Six sessions on the v2 prototype. Synthesis in progress.

## P1 (mobile, returning customer)
Finished in 2:40. Liked seeing shipping cost early. Missed the "edit cart" link and went back with the browser button.

## P2 (mobile, first-time)
Chose guest checkout right away. "I don't want another password." Address autocomplete suggested the wrong unit number.

## P3 (desktop)
Used Apple Pay. Finished in 1:15. Asked whether the repair program is included.

## P4 (mobile)
Got stuck on the postcode error: "Enter a valid postcode" didn't say what was wrong (they'd typed a space).

## Early themes
- Guest checkout works; nobody looked for the sign-in.
- Error messages still aren't specific enough.
- "Edit cart" is hard to find on mobile.`,
  },
  {
    id: 'fl_funnel',
    name: 'Funnel analysis Q3.xlsx',
    kind: 'sheet',
    folderId: 'fd_co_research',
    ownerId: 'u_marcus',
    updated: -25,
    size: 310_000,
    version: 5,
    content: `# Funnel analysis Q3

- Cart → checkout start: 41%
- Checkout start → address complete: 58%
- Address → payment: 71%
- Payment → order placed: 77%
- Overall checkout completion: 32% (abandonment 68%)
- Mobile completion: 26%`,
  },
  {
    id: 'fl_spec',
    name: 'Checkout spec v2.docx',
    kind: 'doc',
    folderId: 'fd_co_design',
    ownerId: 'u_leo',
    updated: -3,
    updatedById: 'u_leo',
    size: 164_000,
    version: 15,
    content: `# Checkout spec v2

## Flow
1. Cart review with an inline "edit cart"
2. Address and shipping on one step; shipping cost updates live
3. Payment with Apple Pay and Google Pay above the card form
4. Confirmation with an optional "save your details" account offer

## Address form
Fields: full name, address line 1 and 2, city, state, postcode, phone (optional). Autocomplete from the address service. Validation happens per field, on blur.

## Error states (pending final from Maya)
- Postcode: say what's wrong ("Postcodes have 5 digits")
- Address not found: offer "use as entered"

## Open items
- Apple Pay flow: Leo to add
- Analytics events: Chloé to instrument`,
  },
  {
    id: 'fl_payment_explorations',
    name: 'Payment step explorations.pptx',
    kind: 'slides',
    folderId: 'fd_co_design',
    ownerId: 'u_ines',
    updated: -4,
    size: 31_000_000,
    version: 3,
    content: `# Payment step explorations

## Option A: Wallets first
Apple Pay and Google Pay as large buttons on top, the card form collapsed below.

## Option B: Tabs
Card, wallet and PayPal as tabs. Cleaner, but hides wallets on mobile.

## Option C: Smart default
Show the method the shopper used last. Needs account data, so it doesn't work for guests.

Recommendation: Option A, which matches the design review decision.`,
  },
  {
    id: 'fl_address_states',
    name: 'Address form states.png',
    kind: 'image',
    folderId: 'fd_co_design',
    ownerId: 'u_maya',
    updated: -1,
    updatedById: 'u_maya',
    size: 1_900_000,
  },

  // ---- Supplier Portal ------------------------------------------------------------------
  {
    id: 'fl_portal_reqs',
    name: 'Supplier portal requirements.docx',
    kind: 'doc',
    folderId: 'fd_supplier',
    ownerId: 'u_priya',
    updated: -14,
    size: 132_000,
    version: 7,
    content: `# Supplier portal requirements v1

## Why
Today suppliers email spreadsheets to Priya every week. Inventory updates arrive late and purchase-order status lives in inboxes.

## Users
Supplier account managers at about 40 vendors, plus Meridian's operations team.

## Must have
- Supplier sign-in with multi-factor authentication
- Upload and update inventory levels (CSV or form)
- See open purchase orders and confirm ship dates
- Onboarding checklist for new vendors

## Later
- Invoicing
- Sustainability certifications

## Pilot
Three vendors in February: Basalt Textiles, Ridgeway Metals and Cascadia Packs.`,
  },
  {
    id: 'fl_onboarding',
    name: 'Supplier onboarding checklist.docx',
    kind: 'doc',
    folderId: 'fd_supplier',
    ownerId: 'u_priya',
    updated: -6,
    size: 38_000,
    version: 4,
    content: `# Supplier onboarding checklist

- Signed supplier agreement
- Tax and banking details verified
- Code of conduct acknowledged
- Product catalog uploaded (SKU, cost, lead time)
- Portal account created with MFA
- First purchase order confirmed`,
  },
  {
    id: 'fl_vendors',
    name: 'Vendor list.xlsx',
    kind: 'sheet',
    folderId: 'fd_supplier',
    ownerId: 'u_priya',
    updated: -18,
    size: 58_000,
    version: 22,
    content: `# Vendor list

42 active vendors. Known duplicates: "Basalt Textiles" and "Basalt Textile Co." are the same supplier; "Cascadia Packs" appears twice with different contacts.`,
  },
  {
    id: 'fl_api_notes',
    name: 'Inventory API integration notes.docx',
    kind: 'doc',
    folderId: 'fd_supplier',
    ownerId: 'u_ben',
    updated: -2,
    updatedById: 'u_ben',
    size: 44_000,
    version: 5,
    content: `# Inventory API integration notes

## Spike goal
Prove we can sync supplier inventory into the warehouse system every 15 minutes.

## Findings so far
- Two of the three pilot vendors have REST APIs; Cascadia Packs only sends CSV.
- Rate limits: Basalt allows 60 requests a minute, which is enough.

## Next
- Build the CSV import path for Cascadia.
- Decide on conflict rules when the portal and the API disagree.`,
  },

  // ---- Marketing ------------------------------------------------------------------------
  {
    id: 'fl_q1_plan',
    name: 'Q1 campaign plan.docx',
    kind: 'doc',
    folderId: 'fd_marketing',
    ownerId: 'u_julia',
    updated: -8,
    size: 76_000,
    version: 4,
    content: `# Q1 campaign plan

## Campaign
"Further, together." Runs alongside the catalog launch through March.

## Channels
- Email: launch sequence of four sends
- Paid social: $180k, shifted from the print budget
- Retail: in-store displays in 14 partner shops

## Budget
Draft due this week. Paid social takes the money saved by cutting the print run to 95k.`,
  },
  {
    id: 'fl_email_cal',
    name: 'Email calendar.xlsx',
    kind: 'sheet',
    folderId: 'fd_marketing',
    ownerId: 'u_marcus',
    updated: -4,
    size: 33_000,
    version: 9,
    content: `# Email calendar

- Send 1, launch day: "Further, together." cover story
- Send 2, launch +3 days: tents and shelters
- Send 3, launch +10 days: Ridgeline layering guide
- Send 4, launch +17 days: repair program`,
  },
  {
    id: 'fl_social',
    name: 'Social content – January.xlsx',
    kind: 'sheet',
    folderId: 'fd_marketing',
    ownerId: 'u_marcus',
    updated: -3,
    size: 29_000,
    version: 3,
  },

  // ---- Operations -----------------------------------------------------------------------
  {
    id: 'fl_forecast',
    name: "Inventory forecast Spring '27.xlsx",
    kind: 'sheet',
    folderId: 'fd_ops',
    ownerId: 'u_hugo',
    updated: -5,
    size: 420_000,
    version: 17,
    generalAccess: 'org_view',
    content: `# Inventory forecast Spring '27

- Alpine 2 tent: 6,400 units (up 30% on last spring)
- Ridgeline jacket: 9,800 units across two colorways
- Packs: 12,000 units
- New SKUs still to add: two camp kitchen items and the Alpine 3`,
  },
  {
    id: 'fl_freight',
    name: 'Freight & logistics notes.docx',
    kind: 'doc',
    folderId: 'fd_ops',
    ownerId: 'u_dana',
    updated: -1,
    updatedById: 'u_dana',
    size: 39_000,
    version: 6,
    content: `# Freight and logistics notes

## March shipments
Spring inventory has to land in Denver by March 10. Three forwarders are quoting; the decision is due today.

## Quotes so far
- Pacific Bridge: lowest price, 38-day transit
- Summit Freight: mid price, 31 days, better track record
- Third quote still outstanding

## Recommendation
Summit Freight, unless the third quote comes in at least 10% lower.`,
  },
];

export function buildFiles(c: SeedClock): FileRecord[] {
  return FILES.map((f) => ({
    id: f.id,
    name: f.name,
    kind: f.kind,
    folderId: f.folderId,
    ownerId: f.ownerId,
    size: f.size ?? 120_000,
    generalAccess: f.generalAccess ?? 'restricted',
    grants: f.grants ?? [],
    createdAt: c.at(f.updated - 30),
    updatedAt: c.at(f.updated, 9 + (f.id.length % 8), (f.id.length * 7) % 60),
    updatedById: f.updatedById ?? f.ownerId,
    version: f.version ?? 1,
    contentText: f.content ?? '',
    deletedAt: null,
  }));
}
