# JFLIPS: notes for the lawyer

**Date:** 13 October 2026

These are things noticed while checking how the app works. They sit beside the main report (the form text, how JFLIPS works and the questions). Nothing here was changed. Each item is for the owner and the lawyer to decide.

### Personal information and outside services
1. **Google Fonts.** Every visitor's address goes to Google when a page loads, because the app asks Google for its font. This is the one Google service besides phone alerts.
2. **Child names in alerts.** The privacy notice says alerts to the owner's phone can include a child's name. Taking names out of the alert text would let that sentence go.
3. **Adult wording.** For adults the alert sentence reads "These alerts can include your name."

### Records and signed forms
4. **Version labels were reused.** The privacy notice label "1.0-draft" was used for three different wordings before it was bumped. A record stamped 1.0-draft cannot be tied to one wording. The app keeps the last of the three. Every wording change from now on gets a new version.
5. **Older Terms records.** Records signed under Terms 2.0-draft and 3.0-draft are re-printed by the owner with only the original short declaration, not the clauses the parent saw on screen. It is not a faithful copy. The PDF the parent downloaded at the time is.
6. **Trial athletes are deleted, not archived.** They have signed nothing, so nothing is kept. If a trial athlete's parent gave a phone number, it is gone at once.
7. **Archive and shared families.** The privacy and photo records move to the archive only when they belong to that child alone (their key is the child's id). A record shared by several children stays where it is.
8. **Team (cheer) athletes** also go to the Old athletes archive when removed. They have no signed forms, so only the 12-month details date applies.
9. **Photo choice changes.** When a family asks to change photo choices they message the owner on WhatsApp, which the app cannot see, so the 7-day promise depends on the owner acting.

### Access
10. **Cheer team athletes.** Coaches can read this table directly (team_athletes_coach_read), outside the function that hides private fields. The privacy notice sentence about coaches is about tumbling clients.
11. **Public sign-up rules.** The sign-up pages work because the database lets anyone with the public key add a row (tumbling_students_public_signup_insert, cheer_registrations_public_insert, notifications_public_signup_insert). No limits on how often were seen. This is by design.
12. **Privacy tick lock** applies to the sign-up page only. The personal consent link page (for existing families) does not lock the privacy tick.
13. **Personal consent links** use a long random code. Anyone holding the link can open that family's consent page. This is by design.

### The cheer sign-up form
14. The cheer form (SignupCheer.tsx) does not use the Terms, privacy notice or photo consent. It has no signature and no indemnity. It asks for the athlete's name, date of birth, medical conditions, emergency contact, and the parents' names, phone numbers and email. It has three tick boxes: "I confirm the information supplied is correct", "I understand that this registration is an expression of interest only and does not guarantee placement on a team", and "I consent to JFLIPS storing my information for athlete management purposes". It saves to the cheer_registrations table, which only the owner can read. Anyone with the public key can add a row. It sends an alert containing the athlete's name.
