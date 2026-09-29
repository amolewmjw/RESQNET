# RESQNET — Correction & Re-Sync Packet
*(Send this to the other Claude, GPT, and Astra — all three responded off a stale version of the plan. This replaces the numbers and open items in whatever they currently have.)*

---

## Why this packet exists
All three of you locked "3 ambulances / 3 hospitals / 10 victims" as if resolving an open decision — that decision was already resolved differently before you received your files, and none of you have the Live Decision Dashboard feature either. You were working from a merge that predates the actual Phase 0 close. This packet is the correction. Treat everything below as overriding anything conflicting in your current files, then re-read the attached updated `plan-v2.md` and `resqnet-simulation-narrative.md` in full — don't patch your mental model from just this summary.

## 1. Corrected numbers (this is final — see updated `plan-v2.md` §8)
- **13 patients**, not 10: 4 fracture, 4 blood loss, 3 unconscious, 2 limb loss.
- **4 ambulances**, not 3, capacity 2 each — max 8 in flight forces at least 2 dispatch waves every run.
- **4 hospitals**, not 3, with specific uneven inventory (ICU/blood/vent margins deliberately thin, beds abundant) — full table in `plan-v2.md` §8.
- Grounded in the real Satya Niketan Delhi building-collapse case study (7 dead, 12 rescued, 5 hospitalized) — but the hospital *inventory* numbers themselves are an illustrative construction, not sourced real data. Say that plainly if asked.

## 2. New feature you don't have yet: Live Decision Dashboard
A timestamped, append-only log panel next to the map — logs every dispatch/hospital-selection/delivery/reroute decision plus a snapshot every simulated minute. Full spec in `plan-v2.md` §4.4 and narrative §4.4a. This is the "second wow factor," and it's also how we honestly demonstrate the PRD's transparency pillar without a real ledger.

## 3. Astra's six spec bugs — all resolved, all now in `plan-v2.md` §3–4.2
Thank you, Astra — these were real gaps, not nitpicks. Resolutions:
1. **Victim counter timing** → a group is `reserved` the instant an ambulance claims it (prevents double-booking) but stays in the on-site counter until physically `loaded` at pickup.
2. **Cargo before pickup** → ambulance now has separate `claimedGroups` (reserved, en route) vs `cargo` (physically aboard) — the badge only ever shows `cargo`.
3. **Hospital capacity not reserved** → hospitals now track `reserved` separately from `stock`; a hospital is only decremented at actual delivery, but `available = stock - reserved` the instant an ambulance commits, so two ambulances can't both claim the last bed.
4. **Fallback could go negative** → fallback now picks the reachable hospital with the *highest* available amount (even if insufficient), clamps delivery at zero, and logs it as a flagged "under-resourced delivery" — it never goes negative and never stalls indefinitely.
5. **Mid-edge blockage** → an ambulance already crossing a specific edge finishes crossing it even if that edge gets blocked mid-traversal; A* only recomputes once it reaches the next node. No retreat, no teleport.
6. **Group splitting** → a group larger than remaining capacity splits into capacity-sized sub-groups; each is independently claimable.

One more we're deliberately not fixing to save time: **no animated return-to-base trip.** An ambulance with no more waiting victims just goes idle where it stands rather than animating a trip home. This is a stated simplification, not an oversight — flagged in the plan.

Also adopting your language fix: **"delivered," never "treated" or "saved"** — the sim demonstrates matching-and-delivery, not clinical outcomes.

## 4. Corrected: the actual template is 9 slide files, not 8
Checked the raw file structure directly: 7 content slides (title + 6 sections) + slide 8 (instructions, delete) + **slide 9, which is a genuinely blank slide with zero shapes** — almost certainly meant to be deleted too, not used as your one optional extra slide. If you want the optional 8th slide, add new content on a fresh slide rather than filling in slide 9, since there's no indication it's meant to be the designated "extra" slot versus just a leftover blank.

## 5. Known issue in the source research (not ours to silently fix)
The Kerala section of the case-study doc describes the 2018 floods but its reference list cites 2025 monsoon material, and several citations (PDNA/UNDP/CAG) lack matching full references. Whoever owns the Research & References slide: either find the correct 2018-specific sources to replace those citations, or de-emphasize/caveat the Kerala case rather than citing it as-is. Don't present it as fully verified.

## 6. Questions raised that only the user can answer (not resolved here — ask directly)
Consolidating what's been asked across all three responses so it's asked once:
- Exact submission deadline (date + time) — is "~30 hours" still accurate?
- Has any actual code been written yet, or are we still at spec stage for all tracks?
- Team name (for the `psid_teamname` filename)?
- Exact PS ID format expected?
- Is the demo presented live/offline on a laptop, or via a shared link?
- Priority order right now: working demo first, or PPT first?

## 7. Current phase status
Phase 0 is closed on the corrected numbers above. Astra's Phase 1 (Static Scene) prompt already drafted is still valid *except* it should target the corrected counts (4 ambulances/4 hospitals/13 victims across 4 injury types) instead of the 3/3/10 it was written against — regenerate that prompt against `plan-v2.md` §8 before handing it off, don't patch the old one in place.