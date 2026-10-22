# Handoff: Taily service area (neighborhoods + ZIP codes)

Ready to move into the production app (`taily-app`) when Kevin says so. Nothing here has been run against production.

> **Before merging (Kevin, Oct 22):** double-check the ZIP codes (against a current USPS / NYC source, shared ZIPs
> especially) and the table names (match `neighborhoods.sql` to the production schema). Tracked in
> `docs/v5/POST-LAUNCH.md` → "Before merging into taily-app".

| File | What it is |
| --- | --- |
| `neighborhoods.json` | The full table: 3 boroughs, 30 neighborhoods (picker order), 60 ZIPs, and each ZIP's neighborhoods + "home". |
| `neighborhoods.csv` | One row per neighborhood × ZIP, for a spreadsheet or an admin import. |
| `neighborhoods.sql` | An idempotent Postgres (Supabase) seed: creates 4 small tables and upserts the rows. Deletes nothing. |

## The rules the data encodes

- **Tailor side (Where you work):** a tailor picks neighborhoods; the ZIPs they cover are the union of those neighborhoods' ZIPs.
- **Customer side:** a customer's ZIP is in Taily's area when any neighborhood lists it; otherwise "Taily isn't in that
  area yet." The address reads as the ZIP's **home** neighborhood (10027 → Harlem, New York, NY).
- **Shared ZIPs (8):** a ZIP two or three neighborhoods share is covered when a tailor picks *any* of them, and reads as its
  home: 10001 / 10011 → Chelsea · 10002 → Lower East Side · 10003 → Greenwich Village · 10012 / 10013 → SoHo ·
  11201 → Brooklyn Heights · 11238 → Prospect Heights. A real geocoder can later place an address in the right
  neighborhood by polygon; until then the home rule decides.

## Moving it to production

1. Map the four tables in `neighborhoods.sql` onto the production schema (or keep them as they are), then run it.
2. Point the tailor's neighborhood picker at `service_neighborhoods` (grouped by borough, ordered by `sort`) and the
   customer's ZIP check at `service_zips`.
3. Tailors who saved a neighborhood that left the list (East Williamsburg, Fort Greene, Jackson Heights, Ridgewood,
   Forest Hills, and all of the Bronx and Staten Island) need their picks reviewed before the commented-out cleanup at
   the end of the SQL is run. Ids that stayed keep their id (`tribeca` is now named "TriBeCa").

## Changing the list

Edit `NEIGHBORHOODS` / `SHARED_ZIP_HOME` in `js/data.js`, then run `node scripts/v5/export-neighborhoods.mjs` to rewrite
these three files. The script refuses a shared ZIP without a home. Decisions: PL-09, PL-10, PL-11 in `docs/v5/POST-LAUNCH.md`.
