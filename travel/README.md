# Travel & Expenses — browser edition

Hosted by GitHub Pages. This app has no Python server, paid API, or cloud database. Trip data and uploaded receipts are stored in IndexedDB in the current browser, never uploaded to GitHub. The public site contains application code, libraries, and blank form templates only. Anyone can open the app; each browser has its own records.

## Using the app

Create a trip, enter your details and approved rates, then save the draft. Generate the travel request before travel; add actual expense lines and receipt details for the voucher after travel. Account allocations must equal gross expenses. The travel advance reduces the amount due. Enter each cost once: either as a daily expense or as an other-expense detail. Confirm rates and meal eligibility before generating the voucher.

“Backup with receipts” downloads a ZIP containing the saved trip record and its receipts. “Import record or backup” restores it as a new trip in the current browser. Store these backups privately. Browser storage can be cleared by browser settings, private browsing, or device cleanup; it does not automatically synchronize between devices.

Form templates are the versions stored in flyandteach/panology on October 7, 2026. The request PDF is Form 700-006 (six pages, including supplemental sections). The voucher is Form 133-103. Optional exception and supplemental PDF sections remain blank for manual completion when required. Funding is selected explicitly in the interface. Signatures and approval dates remain blank. Verify current form versions and rates before routing. The printed mileage legend is part of the supplied template; the app uses the rate entered on each expense line.

The supplied voucher supports 45 daily lines, five account allocations, and six receipt details. Overflow is rejected rather than omitted. Formula cells retain their formulas and receive updated cached values, including the net amount after other-expense details and travel advance. Other workbook parts are preserved.

No OCR, AI extraction, automatic rate lookup, approval routing, or automatic cloud synchronization is included. Generation runs when requested. No hosting subscription, custom domain, or API key is required.

## Development and verification

Serve this folder with `python -m http.server`. Browser form generation uses bundled pdf-lib 1.17.1 and JSZip 3.10.1 (licenses in vendor). Static assets and templates are requested from the same site. All draft saves, receipt operations, calculations, and generated downloads happen locally.

Verified in Chromium at desktop and 390-pixel phone widths: no JavaScript errors or horizontal overflow; saved drafts and receipts survive reload; backup restoration includes receipts; edited-draft conflicts are rejected; PDF text and rail checkbox values match entries; voucher cached totals and rate precision match independent checks; allocation and capacity errors block generation. Test entries were synthetic and are not published. Browser traffic contained GET requests for static assets only, with no outgoing trip-data POSTs. Excel native recalculation and Safari-specific behavior have not been separately verified.
