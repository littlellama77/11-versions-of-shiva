# 11 Versions of Shiva 📖 ♡
### A Keepsake Digital Letter-Book for Shiva's 18th Birthday

> *“11 people. 11 memories. One very loved idiot.”*

---

## 🌟 Overview

**“11 Versions of Shiva”** is a private, bespoke digital keepsake book created for Shiva's 18th birthday. Inspired by physical coffee-table memory scrapbooks, it frames 11 letters from her closest friends and family.

Every letter is preserved **100% verbatim**—every typo, emoji, Hinglish nuance, inside joke, and exclamation is kept completely intact.

---

## 🚀 How to Open and View the Book

The website is **entirely self-contained and local**. It does not require any server, backend, Node.js, Python, or database.

1. Navigate to the project folder:
   ```
   C:\Users\garim\.gemini\antigravity-ide\scratch\11-versions-of-shiva
   ```
2. **Double-click `index.html`** to open it in your favorite browser (Microsoft Edge, Google Chrome, Safari, Firefox, Brave, etc.).
3. Click **“OPEN THE BOOK →”** or press the **Right Arrow (`→`)** key to turn the pages.

---

## 📸 How to Add and Replace Photos

We have designed the book so that it looks stunning with **bespoke placeholder frames** right out of the box, and makes adding real photos effortless:

### Method 1: Directly in the Browser (Easiest & Fastest!)
1. Open the website in your browser.
2. Click the **“📷 Photos”** button in the top navigation bar, OR click directly on any polaroid frame on the left page.
3. Click **“Choose Photo”** to pick a photo from your computer or phone.
4. The photo will instantly load into that polaroid frame and will be saved in your browser's local memory!
5. You can replace or remove photos at any time.

### Method 2: Permanent Image Files
1. Place your photo files into the `assets/images/` folder.
2. Open [`letters-data.js`](file:///C:/Users/garim/.gemini/antigravity-ide/scratch/11-versions-of-shiva/letters-data.js) in any text editor.
3. In each chapter, set the `src` attribute of the photo object, for example:
   ```javascript
   {
     id: "siddhi-photo-1",
     label: "SIDDHI PHOTO 1",
     caption: "rainy momo quest (complete drenching)",
     src: "assets/images/siddhi-momos.jpg"
   }
   ```
4. Save the file and refresh your browser.

---

## 📖 Navigation Controls

- **Flip Pages**: Click the **`← PREVIOUS`** and **`NEXT →`** buttons, or use the **Left (`←`)** and **Right (`→`)** keyboard arrow keys.
- **Jump to Any Chapter**: Click the persistent **`☰ CONTENTS`** button in the header at any time, or click on the chapter dots at the bottom.
- **Mobile Friendly**:
  - Two convenient tabs appear at the top of each chapter on mobile: `[📸 Scrapbook]` and `[💌 Letter]`.
  - Swipe left to advance, swipe right to go back.
- **Gentle Page Sound**: Click the **`🔇 Sound Off` / `🔊 Sound On`** toggle in the header to enable a whisper-soft, realistic paper-turn rustle (synthesized dynamically using the Web Audio API—no audio files to download).
- **Physical Printing**: If you ever want to print physical pages as a souvenir, simply press `Ctrl + P` / `Cmd + P`—print stylesheets format each chapter onto individual pages cleanly.

---

## 📚 Book Contents & Chapters

| # | Author | Subtitle | Custom Scrapbook Details |
|---|--------|----------|--------------------------|
| **00** | Front Cover | *A little book of letters for your 18th birthday ♡* | Hardcover foil title & ribbon bookmark |
| **01** | **Siddhi** | *Momos in the rain* | Momo steam badge, rainy rain clouds, 6 ice creams note |
| **02** | **Parakh** | *8 years of bakchodi* | Scooter doodle, CCTV handkerchief incident, 8 years badge |
| **03** | **Amogh** | *The sunshine* | Radiant sunshine sketch, stars, real-life gem note |
| **04** | **Atulya** | *Stay whimsy, stay dumb* | Basketball hoop doodle, Founders tradition, UNC status stamp |
| **05** | **Vibu** | *Cake murderer* | Authentic mini Case File document: "Case: Cake Murder, Suspect: Akku, Status: GUILTY" |
| **06** | **Agrima Kothiyal** | *Gulab jamun* | Gulab jamun sketch, Sam & Dean thirst club badge, emotional ink note |
| **07** | **Chitleen** | *Rassgulle* | Playful "18th Birthday Maintenance Fee" itemized invoice |
| **08** | **Rishita** | *Us against the world* | ₹5 Curls + Sting treasure badge, Third Lane sign, sisterhood seal |
| **09** | **Ridhima** | *Future crorepatni* | Playful "Crorepatni Wealth Meter: Bapu Se Bhi Zyada (100% on track)" |
| **10** | **Mahima** | *From the very beginning* | Nostalgic childhood album corners, arm-bite incident, chin fatt era |
| **11** | **Garima (Gorzumo)** | *Weren't you just smol?* | 7 feet Khali height marker, five rooms floorplan sketch, Dehradun hills, future co-owner sticky note |
| **12** | Epilogue | *The End ♡ Except not really.* | Final group photo frame & "Read Again ↺" button |

---

## 🎨 Design Philosophy

- **Warm Ivory / Cream Paper**: Styled with realistic deckled edges, inner spine shadow, and subtle paper grain.
- **Charcoal Typography**: High readability serif typography (`Playfair Display`, `Cormorant Garamond`, `Lora`) paired with organic handwritten accents (`Caveat`, `Patrick Hand`).
- **Authentic Scrapbook Feel**: Realistic drop shadows, taped washi strips, angled polaroid cards, and sticky notes.
- **Zero Templates**: Built specifically with love for Shiva and Garima.
