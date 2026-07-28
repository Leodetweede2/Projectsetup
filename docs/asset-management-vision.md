# Asset Management Vision — Amphia

*A working vision for up-to-date IT & device asset management in a ~5,000-employee hospital.*

**Version:** 0.1 (draft for iteration) · **Date:** 2026-07-28
**Authored from three lenses:** Asset Manager · System Architect · Process Owner
**Status:** discussion document — not a committed plan. Everything here is a target to argue with, refine, and stage.

> Scope note: this document is deliberately vendor- and infrastructure-neutral. Where it names a category of system (endpoint management, ITSM, CMMS…), treat the specific product as *to be confirmed* with Amphia's own landscape. No internal hostnames, addresses, or credentials belong in this file.

---

## 1. Executive summary

Today this application answers one question well: **"Where is this PC?"** It imports the SharePoint/Excel asset export, matches each row's room number to a pin on a floor plan, and lets the servicedesk find a device on a map. Recent iterations added coverage insight (how many devices we can and cannot locate), activity signals (last-seen), and import match-quality feedback.

That is a strong **beachhead**. The vision is to grow it — or feed it — into a **living, trustworthy single source of truth for every asset the hospital depends on**, from a laptop at a reception desk to a network-connected infusion pump, with location, ownership, lifecycle state, and risk visible in one place and kept current by automation rather than by re-uploading spreadsheets.

The north star, in one sentence:

> **Every asset the hospital relies on is known, located, owned, up-to-date, and accounted for — automatically — so that care is never interrupted by an asset we couldn't find, patch, replace, or trust.**

The three biggest shifts to get there:

1. **From snapshot to stream** — replace the manual Excel re-import with automated feeds from the systems that already know the truth (endpoint management, directory, procurement, CMMS).
2. **From inventory to lifecycle** — track each asset from request → procure → deploy → operate → maintain → retire → dispose, not just its current row.
3. **From "IT PCs" to "everything clinical care touches"** — extend the same discipline to medical devices and IoMT, where "where is it and is it safe" is a patient-safety question, not a convenience.

---

## 2. Where we are today (honest baseline)

**What exists and works:**
- Asset list imported from an Excel/SharePoint export; the room-number column links rows to floor-plan pins.
- Floor plans (PDF → image) with room pins placed by an admin; zoom/pan; servicedesk search by room or PC.
- Dashboard: located vs. unlocated PCs, coverage by department, unmapped room numbers, OS breakdown, last-seen activity buckets, per-location totals, data-freshness indicator.
- Import **match-quality** feedback and an in-editor "unplaced rooms" worklist to close the import→match→pin loop.
- RBAC, audit log, dark mode, Amphia house style.

**What this baseline is not yet:**
- It is a **read-only visualization of one exported list**, refreshed by hand. Freshness depends on someone re-exporting and re-importing.
- It knows **PCs from one spreadsheet** — not the full estate (medical devices, phones, monitors, printers, VDI, servers, licenses).
- It has **no lifecycle**: no request/procure/retire/dispose states, no financial or warranty data, no ownership chain beyond a free-text "user" field.
- It has **no authoritative identity** for an asset (no stable asset tag / serial as the primary key across systems).
- It is **one-directional**: nothing flows back to the servicedesk tool, the CMDB, or finance.

Naming this plainly matters, because the roadmap is essentially the list of gaps above, sequenced.

---

## 3. Guiding principles

1. **Single source of truth, federated by design.** One place answers "what/where/whose/what-state" for an asset — but it is *fed* by the authoritative system for each attribute, not re-keyed. Endpoint management owns "last seen" and OS; procurement owns "purchase date"; the CMDB owns "service relationships"; this system owns/derives **location**.
2. **Automate the truth; humans handle the exceptions.** The steady state is machine-to-machine sync. People spend their time on the ~5–10% that doesn't reconcile, not on maintaining spreadsheets.
3. **Every asset has one stable identity.** A single primary key (asset tag, mapped to serial number) that every system agrees on. Location, tickets, contracts, and risk all hang off it.
4. **Location is first-class.** In a hospital, "which room / which building / which floor" is operationally critical (theft, recalls, incident response, capacity). This system's differentiator is that it does location better than anything else.
5. **Patient safety and privacy are constraints, not features.** NEN 7510 / ISO 27001 / AVG (GDPR) and, for medical devices, MDR and IEC 80001 shape the design from day one.
6. **Data quality is a measured, owned metric** — not a hope. Coverage %, match %, staleness, and duplicate rate are on a dashboard with an owner and a target.
7. **Interoperable and boring.** Standard identifiers, standard APIs, standard lifecycle states (align to ISO/IEC 19770 for IT assets and ISO 55000 for the broader discipline). No clever lock-in.

---

## 4. The Asset Manager's view — what "good" looks like

The asset manager cares about **completeness, accuracy, cost, risk, and lifecycle** across the estate.

### 4.1 Asset classes to bring into scope (phased)
| Class | Examples | Authoritative feed (typical) | Why it matters |
|---|---|---|---|
| **End-user compute** | Laptops, desktops, thin clients, VDI | Endpoint management (Intune/SCCM-class) + directory | Largest count; the current beachhead |
| **Mobile & peripherals** | Phones, tablets, monitors, docks, printers | MDM / endpoint mgmt / procurement | High churn, easily lost |
| **Medical devices (IoMT)** | Infusion pumps, monitors, imaging, bedside PCs | CMMS / biomedical inventory | Patient safety, recalls, MDR |
| **Datacenter & network** | Servers, switches, APs, storage | CMDB / monitoring / IPAM | Service continuity |
| **Software & licenses** | OS, clinical apps, SaaS | SAM tool / endpoint mgmt | Compliance & cost |
| **Consumables/non-IT (optional)** | Beds, wheelchairs (if in scope) | CMMS / facility | Only if the org wants one system |

### 4.2 The attributes that make an asset "managed"
- **Identity:** asset tag (primary), serial, manufacturer, model, class.
- **Ownership:** assigned user *and* responsible cost center / department / owning team.
- **Location:** building → floor → room (this system), with history.
- **Lifecycle state:** requested → ordered → in-stock → deployed → in-use → in-repair → retired → disposed.
- **Financial:** purchase date, price, depreciation, warranty end, contract/lease, supplier.
- **Operational:** last seen, patch/OS state, compliance state, criticality.
- **Risk & compliance:** data classification, medical-device class, recall status, end-of-life date.

### 4.3 KPIs the asset manager should watch (candidate targets)
- **Inventory accuracy** ≥ 98% (sampled physical audits vs. record).
- **Location coverage** ≥ 95% of in-scope assets pinned to a room (this app already measures the precursor).
- **Data freshness**: authoritative attributes < 24h stale; 0 sources older than their SLA.
- **Ghost / zombie rate**: assets not seen in 90+ days investigated < 30 days.
- **Unassigned / no-owner rate** trending to < 2%.
- **Lifecycle hygiene**: % of retired assets with confirmed secure disposal = 100%.
- **License compliance**: 0 unlicensed installs of governed software.
- **Time-to-locate** (servicedesk): median seconds from ticket to "found on map".

### 4.4 Financial & sustainability angle
- Depreciation and refresh forecasting ("how many W10→W11 / EOL devices, where, whose budget").
- Warranty/lease expiry pipeline to avoid paying for dead assets or running out-of-support ones.
- **Circularity**: reuse/redeploy before buy; certified data-wipe and e-waste tracking at disposal (also a compliance requirement).

---

## 5. The System Architect's view — how it fits together

### 5.1 Reference architecture (conceptual)
```
        Authoritative sources                Integration                 Asset SoT & UX
  ┌───────────────────────────┐        ┌──────────────────┐        ┌────────────────────┐
  │ Endpoint mgmt (Intune/SCCM)│──feed──▶│                  │        │  Asset registry     │
  │ Directory (AD/Entra)       │──feed──▶│  Integration /   │──────▶ │  (single source of  │
  │ Procurement / finance      │──feed──▶│  reconciliation  │        │   truth for assets) │
  │ CMMS / biomedical inventory│──feed──▶│  layer           │        │                     │
  │ ITSM / CMDB (TOPdesk/SNow) │◀─sync──▶│  (ETL + matching │◀─────▶ │  Location engine    │
  │ Network / IPAM / DHCP      │──feed──▶│   + identity)    │        │  (THIS app's core)  │
  └───────────────────────────┘        └──────────────────┘        │  Floor plans + pins │
                                                                     │  Dashboards / APIs  │
                                                                     └────────────────────┘
```
Two viable shapes — decide early:

- **Option A — This app becomes the location engine, CMDB stays the SoT.** The ITSM/CMDB (e.g. TOPdesk / ServiceNow-class) remains the asset system of record; this app specializes in *location* and enriches the CMDB via API. Lower risk, faster, avoids duplicating a CMDB. **Recommended default.**
- **Option B — This app grows into the asset registry.** Justified only if there is no adequate CMDB and the org wants a purpose-built, location-first registry. More build, more governance, more risk.

The architecture below assumes **A**, with the seams to grow toward B if needed.

### 5.2 Data model evolution (from today's schema)
Today: `FloorPlan → Room → (pins)`, plus `AssetImport → AssetRecord` (JSON rows) matched by normalized room number. Evolve to:

- **`Asset`** as a first-class entity keyed by **asset tag** (not a spreadsheet row): identity, class, lifecycle state, owner, financials, links.
- **`AssetLocation`** with **history** (asset → room, from/to timestamps) so we can answer "where was it last week / when did it move".
- **`Room` / `FloorPlan`** unchanged as the spatial backbone (already solid).
- **`Source` / `SyncRun`** to record which feed asserted which attribute and when (provenance + freshness per attribute).
- Keep `AssetImport`/`AssetRecord` as **one source among many** during transition, not the center.

Design rules: stable IDs, append-only location history, per-attribute provenance, soft-delete + audit (already present), and an explicit **match/reconciliation** table for fuzzy joins (room-number typos, serial/tag mismatches).

### 5.3 Integration & identity — the hard part
- **Identity resolution** is the crux: the same physical device appears as a hostname in endpoint mgmt, a serial in procurement, an asset tag on a sticker, and a room in a spreadsheet. Build a deterministic match on **serial/asset-tag** first, fall back to hostname/MAC, and **surface unresolved matches to a human** (the app already does this pattern for unmapped rooms — generalize it).
- **Near-miss matching** for room numbers (one separator/character off) to auto-heal the most common cause of "unlocated".
- **Sync cadence**: event-driven where possible (webhooks), scheduled pulls otherwise; every attribute carries a "last confirmed" timestamp and an SLA.
- **APIs**: expose a clean read API (`/asset/{tag}`, `/room/{id}/assets`, search) and a location webhook so the CMDB/servicedesk can deep-link to the map (the shareable `/map?room=` link is the seed of this).

### 5.4 Non-functionals
- **Security:** SSO (Entra), least-privilege RBAC (already present), full audit (present), encryption in transit/at rest, secrets management, no PII beyond what's justified.
- **Availability:** the servicedesk uses this during incidents — target high availability, graceful read-only degradation if a feed is down (show last-known + staleness, which the app already models).
- **Scale:** 5,000 employees ≈ tens of thousands of assets and pins; keep the map performant (counter-scaled pins, filtered rendering — already done) and paginate/stream large lists.
- **Observability:** sync success/failure, match rate, staleness as first-class metrics with alerting.
- **Privacy/data residency:** keep hospital data within approved boundaries; the app should never require exporting sensitive inventory to unmanaged locations.

---

## 6. The Process Owner's view — how it stays true

Technology without process rots. The process owner defines **who does what, when, and how the data stays correct.**

### 6.1 Core lifecycle processes (align to ITIL 4 / ISO 19770)
1. **Request & procure** — standard catalog, approval, PO; asset created in `requested/ordered` state at purchase, not at first login.
2. **Receive & tag** — physical asset tag applied and scanned on intake; identity established once, up front.
3. **Deploy & assign** — device linked to a user and a room; location set (this app) at hand-out.
4. **Operate & maintain** — patching/compliance from endpoint mgmt; for medical devices, planned maintenance & calibration from CMMS; moves update location.
5. **Move / transfer** — room changes captured (barcode scan or servicedesk action) → location history.
6. **Retire & dispose** — decommission, **certified data wipe**, e-waste, record closed. No asset silently disappears.

### 6.2 Roles & RACI (illustrative — adapt to Amphia's org)
| Activity | Asset Mgr | System Owner/Architect | Servicedesk | Dept/Team lead | Security/CISO | Biomedical/CMMS |
|---|---|---|---|---|---|---|
| Data model & standards | A | R | C | I | C | C |
| Integrations & sync | C | A/R | I | I | C | C |
| Day-to-day location updates | I | I | R/A | C | I | R (med devices) |
| Data-quality KPIs & audits | A/R | C | C | C | I | C |
| Lifecycle policy (retire/dispose) | A | C | R | C | R | C |
| Medical-device compliance (MDR) | C | C | I | I | C | A/R |

*(A=Accountable, R=Responsible, C=Consulted, I=Informed.)*

### 6.3 Governance & cadence
- **Data-quality council** (monthly): reviews coverage/match/staleness KPIs, owns remediation.
- **Physical audit program**: periodic sampled floor walks (the map + barcode make this efficient) to validate the digital record.
- **Change control** for the data model and integrations; **release notes** to the servicedesk.
- **Exception queues** with SLAs: unmatched assets, unmapped rooms, ghost devices, no-owner assets.

### 6.4 Compliance backbone (hospital-specific)
- **NEN 7510 / ISO 27001** — information security management (Dutch healthcare baseline).
- **AVG / GDPR** — minimize and protect personal data in the asset record.
- **MDR (EU 2017/745)** — medical device identification, traceability, recall handling.
- **IEC 80001** — risk management for IT-networks that include medical devices (directly relevant once IoMT is in scope).
- **ISO 55000** — asset management system discipline; **ISO/IEC 19770** — IT asset & software asset management.

---

## 7. Roadmap — from locator to living asset management

Each horizon delivers standalone value; stop-and-ship at any boundary.

### Horizon 0 — Harden the beachhead *(now → ~3 months)*
- Automate the current import (scheduled pull from the source instead of manual upload); keep match-quality + freshness dashboards.
- Introduce **asset tag / serial as identity** alongside the room key; add near-miss room matching to cut "unlocated".
- Add **location history** (append-only) and basic lifecycle state to the model.
- Coverage-trend snapshot (chart located-% over time) so improvement is visible.
- Outcome: the location truth is current without human re-uploads; coverage is trending and measured.

### Horizon 1 — Connect the authoritative feeds *(~3 → 9 months)*
- Integrate **endpoint management** (last-seen, OS, compliance) and **directory** (owner, department) as live feeds; retire the spreadsheet as the primary source.
- Two-way link with **ITSM/CMDB**: deep-link tickets to the map; push location back to the CMDB.
- Stand up the **reconciliation/exception workflow** (unmatched, ghost, no-owner queues with SLAs).
- Financial attributes (warranty, contract, cost center) from procurement.
- Outcome: one trustworthy, auto-refreshed IT-asset picture with location; servicedesk works from it daily.

### Horizon 2 — Extend to medical devices & the full estate *(~9 → 24 months)*
- Bring **medical devices / IoMT** in via CMMS/biomedical inventory; apply MDR/IEC 80001 attributes (device class, calibration, recall status).
- Add software/license and network/datacenter classes.
- Lifecycle end-to-end (procure→dispose) with certified-disposal evidence.
- Predictive refresh & warranty pipelines; sustainability/circularity reporting.
- Outcome: a hospital-wide, patient-safety-aware asset management capability with location at its heart.

### Horizon 3 — Optimize & predict *(24 months+)*
- Analytics: utilization, theft/loss patterns, recall blast-radius ("which rooms hold the recalled model"), capacity planning by area.
- Real-time location (RTLS/RFID/BLE) for high-value or safety-critical mobile assets, feeding the same map.
- Self-healing data quality; the exception queue shrinks as matching improves.

---

## 8. Risks & how to manage them
| Risk | Impact | Mitigation |
|---|---|---|
| Spreadsheet-forever inertia | Data stays stale; tool loses trust | Automate feeds early (Horizon 0/1); make freshness visible |
| Identity mismatch across systems | Duplicates, wrong locations | Serial/tag as primary key; human-in-the-loop exception queue |
| Scope creep into a full CMDB rebuild | Cost, delay, duplication | Prefer Option A (enrich existing CMDB) unless proven inadequate |
| Medical-device complexity underestimated | Compliance & safety exposure | Partner with biomedical/CMMS owners; treat as its own workstream |
| Data quality unowned | KPIs drift, estate rots | Named owner + monthly council + audit program |
| Privacy/security gaps | Regulatory & trust damage | NEN 7510/ISO 27001 by design; SSO, RBAC, audit, data minimization |

---

## 9. Immediate next steps (concrete)
1. **Confirm the operating-model choice** (Option A vs. B) with IT and the CMDB owner.
2. **Pick the identity key** (asset tag ↔ serial) and the two first feeds (endpoint mgmt + directory).
3. **Add location history + lifecycle state** to the data model in this app (small, high-leverage).
4. **Automate the current import** and add the coverage-trend snapshot.
5. **Name a data-quality owner** and the first three exception queues with SLAs.
6. **Draft the integration contract** (read API + location webhook) so the CMDB/servicedesk can consume location.

---

## 10. Glossary
- **SoT** — Single source of truth.
- **ITAM / SAM** — IT Asset Management / Software Asset Management (ISO/IEC 19770).
- **CMDB** — Configuration Management Database (service relationships).
- **CMMS** — Computerized Maintenance Management System (medical/biomedical equipment).
- **IoMT** — Internet of Medical Things (network-connected medical devices).
- **RTLS** — Real-Time Location System (RFID/BLE tags).
- **MDR** — EU Medical Device Regulation 2017/745.
- **NEN 7510** — Dutch information-security standard for healthcare.
- **Ghost/zombie asset** — a record with no recent signal (possibly lost/retired) / a device present but unrecorded.

---

*This is a living document. Iterate freely: challenge the operating-model choice, resequence the horizons to fit budget and appetite, and localize the RACI and compliance list to Amphia's actual organization and system landscape.*
