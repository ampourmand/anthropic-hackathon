# 🧪 Testing Guide

## Quick Test (5 minutes)

### 1. Load Extension
- Chrome: `chrome://extensions/` → Load unpacked
- Firefox: `about:debugging` → Load temporary add-on

### 2. Test on Testudo
1. Go to https://testudo.umd.edu
2. Log in to your account
3. Navigate to your schedule page
4. Click the extension icon
5. Click "Export to Calendar (.ics)"

### 3. Verify ICS File
- File should download automatically
- Open with text editor to verify format
- Import into Google Calendar to test

## Debugging Tips

### If scraping fails:
1. Open browser console (F12)
2. Check for errors in popup.js
3. Inspect the Testudo page structure
4. Update CSS selectors in `scrapeSchedule()` function

### Common selector patterns to try:
```javascript
// Try these in the browser console on the schedule page:
document.querySelectorAll('table tr')
document.querySelectorAll('.course-row')
document.querySelectorAll('[class*="schedule"]')
```

### Test ICS format:
```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20240828T100000
DTEND:20240828T105000
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR
SUMMARY:CMSC131
LOCATION:IRB 0318
END:VEVENT
END:VCALENDAR
```

## Quick Fixes

### Problem: Wrong time format
**Fix**: Update time parsing regex in `popup.js` line ~140

### Problem: Wrong course data
**Fix**: Update `scrapeSchedule()` selectors to match actual HTML

### Problem: Icons missing
**Fix**: Not critical for functionality, but see `create-icons.sh`

## Sample Test Data

If you don't have access to Testudo, create a test HTML:

```html
<!DOCTYPE html>
<html>
<body>
  <table>
    <tr class="schedule-row">
      <td>CMSC131</td>
      <td>0101</td>
      <td>Introduction to Computer Science</td>
      <td>MWF</td>
      <td>10:00am-10:50am</td>
      <td>IRB 0318</td>
    </tr>
    <tr class="schedule-row">
      <td>MATH140</td>
      <td>0201</td>
      <td>Calculus I</td>
      <td>TuTh</td>
      <td>2:00pm-3:15pm</td>
      <td>MTH 0201</td>
    </tr>
  </table>
</body>
</html>
```

Save as `test-schedule.html` and open in browser to test scraping logic.

## Performance Benchmarks

- Scraping: < 1 second
- ICS generation: < 1 second
- File download: instant
- Total time: ~2 seconds

## Browser Compatibility

✅ Chrome 88+
✅ Edge 88+
✅ Firefox 89+
✅ Opera 74+
❌ Safari (needs Manifest V2 conversion)

## Hackathon Checklist

- [ ] Extension loads without errors
- [ ] Can access testudo.umd.edu
- [ ] Scrapes at least 1 course correctly
- [ ] Generates valid ICS format
- [ ] File downloads successfully
- [ ] ICS imports into calendar app
- [ ] UI looks presentable
- [ ] README is clear

## Emergency Fallbacks

If time runs out and scraping doesn't work perfectly:

1. **Manual input**: Add a text area for users to paste schedule
2. **CSV upload**: Accept CSV file instead of scraping
3. **Demo mode**: Hardcode sample data to show ICS generation works

## Time-Saving Tips

- Don't worry about perfect CSS
- Icons can be placeholder squares
- Focus on core functionality first
- Test with YOUR actual schedule
- Use browser dev tools extensively
- Keep error messages simple

Good luck! 🚀
