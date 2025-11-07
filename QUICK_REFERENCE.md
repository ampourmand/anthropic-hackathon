# ⚡ Quick Reference Card

## 🎯 Project Summary
**Goal**: Scrape Testudo schedule → Generate ICS file → Download
**Time**: 45 minutes
**Tech**: JavaScript browser extension (Chrome/Firefox)

## 📂 File Overview

| File | Purpose | Lines | Critical? |
|------|---------|-------|-----------|
| `manifest.json` | Extension config | 30 | ✅ YES |
| `popup.html` | UI interface | 50 | ✅ YES |
| `popup.js` | Main logic | 250 | ✅ YES |
| `content.js` | Page indicator | 30 | ⚠️ Optional |
| `standalone.html` | Backup tool | 200 | 💡 Fallback |

## 🔧 Key Functions

### In `popup.js`:

```javascript
scrapeSchedule()           // Extracts data from Testudo DOM
generateICS()              // Converts to ICS format
createRecurringEvents()    // Makes weekly repeating events
getSemesterDates()         // Determines semester start/end
findFirstDayOfWeek()       // Finds first class day
```

## 🎨 Quick CSS Selectors to Try

```javascript
// If default selectors don't work, try these:
document.querySelectorAll('table.schedule-table tr')
document.querySelectorAll('.course-row')
document.querySelectorAll('[data-course]')
document.querySelectorAll('tr[id*="course"]')
```

## 🚀 Installation Commands

### Chrome:
```
1. chrome://extensions/
2. Toggle "Developer mode"
3. "Load unpacked" → select folder
```

### Firefox:
```
1. about:debugging#/runtime/this-firefox
2. "Load Temporary Add-on"
3. Select manifest.json
```

## 🐛 Debug Commands

```javascript
// In browser console on Testudo page:

// Test selector
document.querySelectorAll('YOUR_SELECTOR')

// Check course data
[...document.querySelectorAll('tr')].map(r => r.textContent)

// Test time parsing
"10:00am-10:50am".match(/(\d{1,2}):(\d{2})\s*(am|pm)?-(\d{1,2}):(\d{2})\s*(am|pm)?/i)
```

## 📋 Testing Checklist

- [ ] Load extension (no errors)
- [ ] Navigate to testudo.umd.edu/schedule
- [ ] Click extension icon
- [ ] See popup UI
- [ ] Click "Export" button
- [ ] File downloads
- [ ] Open ICS in text editor (valid format?)
- [ ] Import to Google Calendar (works?)

## 🔥 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "No data found" | Wrong page - go to schedule view |
| Selectors fail | Inspect page, update CSS selectors |
| Time parsing error | Check time format, adjust regex |
| Download blocked | Check browser permissions |
| Icons missing | Not critical, skip for now |

## 💡 Emergency Pivots

If extension fails (< 10 min left):

1. **Use standalone.html** - Manual paste version
2. **Simplify scraping** - Just grab course codes
3. **Mock data demo** - Show it works with fake data

## ⏱️ Time Allocation

- **0-10 min**: Load & test extension
- **10-20 min**: Fix selectors for actual Testudo
- **20-30 min**: Test ICS generation & download
- **30-40 min**: Polish UI, add error handling
- **40-45 min**: Final testing & demo prep

## 🎓 UMD Specific Data

**Semester Dates** (approximate):
- Fall: Aug 28 - Dec 13
- Spring: Jan 22 - May 10
- Summer: Jun 3 - Aug 9

**Course Format**: `CMSC131`, `MATH140`, `ENGL101`
**Days Format**: `MWF`, `TuTh`, `M`, etc.
**Time Format**: `10:00am-10:50am`, `2:00pm-3:15pm`

## 📦 Demo Script

1. "This extension scrapes your Testudo schedule"
2. "Converts it to universal ICS calendar format"
3. "One-click download"
4. "Import anywhere - Google, Apple, Outlook"
5. [Show live demo on actual schedule]
6. [Show imported calendar with recurring events]

## 🏆 Judging Points

- ✅ **Solves real problem** (UMD students need this!)
- ✅ **Fast & easy to use** (one click)
- ✅ **Works immediately** (no setup)
- ✅ **Universal format** (works with any calendar)
- ✅ **Clean code** (well documented)

## 🎬 Final Checklist

- [ ] Extension loads without errors
- [ ] Works on actual Testudo page
- [ ] Generates valid ICS file
- [ ] Downloads automatically
- [ ] README is clear
- [ ] Code is commented
- [ ] Demo is prepared
- [ ] Backup plan ready (standalone.html)

---

**You got this! 🚀 45 minutes is plenty of time!**
