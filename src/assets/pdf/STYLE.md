# JFLIPS PDF style sheet

For the signed registration PDFs. Look at the pictures in `reference/` first. They show the finished letterhead and a finished consent form in this style. The `.docx` files there were made for Word, so use them as a visual reference only. Recreate the look in the PDF code.

## Colours
| Use | Colour |
|---|---|
| Headings, main rule, table header fill | Navy `#0A296D` |
| Tagline, accents | Blue `#1E63D6` |
| Body text | Ink `#222222` |
| Label cells and panels | Sky `#EAF1FB` |
| Hairlines, light rules | Rule `#C3D2EC` |
| Field and table borders | `#9FB4D6` |
| Footer and small notes | Grey `#595959` |

## Page (A4)
- Left and right margins 22 mm. Bottom margin about 30 mm to leave room for the footer.
- **First page header** (about 44 mm tall):
  - Logo at the left, about 29 mm wide, from `assets/jflips-logo.png`.
  - At the right, in two lines and right-aligned: "WHERE PASSION" / "MEETS PERFORMANCE". Bold capitals, 15 pt, Blue, slightly letter-spaced.
  - Under both, a Navy rule, 1.5 pt, full width.
- **Later pages**: a small logo (about 13 mm wide) at the left, "jflips.co.za" at the right in Grey 9 pt, and a thin Rule-coloured line under them.
- **Footer on every page**: a thin Rule-coloured line, then the monogram (`assets/jflips-monogram.png`, about 14 mm wide) followed by one centred line:
  "Krugersdorp, Gauteng | WhatsApp 069 040 3387 | jflipsinc@gmail.com | jflips.co.za" in Grey 8.5 pt.
  Keep the existing footer that shows the three document version numbers, and add "Page X of Y". Put these on a second small line or on the right.

## Type
- Body 10.5 pt, Ink. Headings are bold and Navy.
- Document title 15 pt. Section headings 13 pt with a thin Rule-coloured line under them.
- Fonts: the reference uses Calibri, which cannot be embedded for free. Use Helvetica (built in) for body text. If you embed a font, use Barlow (open licence), bundled with the app and not loaded from a CDN. Barlow Condensed Bold is the heading font on the brochure.
- All text must stay real, selectable text, not images.

## Tables
- **Detail rows** (child, parent, emergency contact, health): two columns. The label cell is Sky with bold Navy 10 pt text. The value cell is white. Borders are `#9FB4D6`, 0.5 pt.
- **Photo and video choices**: a header row filled Navy with white bold text ("Use", "Yes", "No"). Under it, one row per use. Show the chosen answer as a drawn square with a tick, and the other as an empty square. Draw them as shapes, not font characters.
- **Signature block**: a bordered box with the signature image, and below it the full name, date and time on a Sky label row.
- **Document versions**: a small table at the end: document, version, date signed.

## Layout rules
- Keep every heading with the paragraph under it. Never leave a heading alone at the bottom of a page.
- Keep the signature block together on one page.
- Keep each short table on one page where it fits.
- Leave breathing room: about 4 mm between paragraphs and 8 mm before a section heading.

## What must not change
- The wording of the Terms, privacy notice and photo consent. This is layout only.
- The data shown, the version numbers, and the dates and times.
