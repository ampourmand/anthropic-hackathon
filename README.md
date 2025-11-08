# 📅 TestudoSync

A Chrome/Firefox browser extension to export your UMD Testudo schedule directly to ICS calendar format.

**Anthropic x UMD Hackathon Nov. 7**

## 🚀 Quick Start (Hackathon Speed Run!)

### Installation (2 minutes)

#### Chrome/Edge:
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this project folder
5. Done! Extension icon should appear in toolbar

#### Firefox:
1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from this folder
4. Done!

### Usage (30 seconds)
1. Navigate to your schedule on **testudo.umd.edu**
2. Click the extension icon in your browser toolbar
3. Click "Export to Calendar (.ics)"
4. Save the file
5. Import into Google Calendar, Apple Calendar, Outlook, etc.

## 📁 Project Structure

```
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup UI
├── popup.js           # Main logic: scraping + ICS generation
├── content.js         # Content script for page interaction
└── icon*.png          # Extension icons (add these!)
```

## 🛠️ Technical Details

- **Language**: Pure JavaScript (no build step needed!)
- **Format**: ICS (iCalendar) - universal calendar format
- **Scraping**: DOM manipulation via Content Scripts
- **Download**: Chrome Downloads API + Blob

## 📝 Features

✅ Scrapes course information from Testudo
✅ Extracts: Course code, title, days, times, locations
✅ Generates recurring calendar events
✅ Handles multiple time formats
✅ Auto-detects semester dates
✅ One-click download
✅ Works with Google Calendar, Apple Calendar, Outlook

## 🎨 Icons

For the hackathon, create simple 16x16, 48x48, and 128x128 PNG icons or use placeholders:
- Use any calendar emoji 📅 as a quick icon
- Convert online at: https://favicon.io/

## 🐛 Troubleshooting

**"No schedule data found"**
- Make sure you're on your actual schedule page in Testudo
- The page should show a table with your courses

**Download doesn't start**
- Check if browser blocked the download (look for icon in address bar)
- Grant download permissions if prompted

## 🚧 Known Limitations (Time Constraints)

- May need selector adjustments based on current Testudo HTML structure
- Semester dates use defaults (can be updated with actual calendar)
- Icons are placeholders (add real ones if time permits)

## 🔄 Customization for Actual Testudo

If the selectors don't match perfectly, update the `scrapeSchedule()` function in `popup.js`:

1. Inspect the Testudo schedule page (F12)
2. Find the table/row selectors for courses
3. Update CSS selectors in the function
4. Test with your actual schedule

## ⏱️ Development Time Breakdown

- Setup: 5 min
- Core scraping logic: 15 min
- ICS generation: 10 min
- UI/UX: 5 min
- Testing & fixes: 10 min
- **Total: ~45 minutes**

## 📦 Deployment

For distribution after hackathon:
1. Chrome Web Store submission
2. Firefox Add-ons submission
3. Or share as unpacked extension

## 🎓 UMD Specific Notes

- Built for testudo.umd.edu
- Supports Fall/Spring/Summer semesters
- Uses America/New_York timezone
- Course code format: CMSC131, MATH140, etc.

## 📄 License

MIT - Built for UMD Hackathon

---

**Good luck with your hackathon! 🚀**
