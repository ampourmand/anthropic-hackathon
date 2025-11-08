document.getElementById('exportBtn').addEventListener('click', async () => {
  const button = document.getElementById('exportBtn');
  const status = document.getElementById('status');
  
  button.disabled = true;
  button.textContent = 'Exporting...';
  showStatus('Processing your schedule...', 'info');

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on testudo
    if (!tab.url.includes('testudo.umd.edu')) {
      throw new Error('Please navigate to your Testudo schedule page first!');
    }

    // Execute the scraping script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeSchedule
    });

    const scheduleData = results[0].result;
    
    if (!scheduleData || scheduleData.courses.length === 0) {
      throw new Error('No schedule data found. Make sure you\'re on your schedule page!');
    }

    // Generate ICS file
    const icsContent = generateICS(scheduleData);
    
    // Download the file - use data URI for better Firefox compatibility
    const filename = `umd_schedule_${scheduleData.semester.replace(/\s+/g, '_')}.ics`;
    
    // Create data URI
    const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent);
    
    try {
      await chrome.downloads.download({
        url: dataUri,
        filename: filename,
        saveAs: true
      });
    } catch (downloadError) {
      // Fallback for Firefox if downloads API fails
      console.error('Downloads API failed, using fallback:', downloadError);
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    showStatus(`✓ Successfully exported ${scheduleData.courses.length} courses!`, 'success');
    button.textContent = 'Export Complete!';
    
    setTimeout(() => {
      button.disabled = false;
      button.textContent = 'Export to Calendar (.ics)';
    }, 2000);

  } catch (error) {
    showStatus(`✗ Error: ${error.message}`, 'error');
    button.disabled = false;
    button.textContent = 'Export to Calendar (.ics)';
  }
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  status.style.display = 'block';
}

// This function will be injected into the page
function scrapeSchedule() {
  const courses = [];
  const seen = new Set(); // Track unique course entries to avoid duplicates
  
  console.log('Starting schedule scrape...');
  console.log('Current URL:', window.location.href);
  
  // Try to find semester info - Testudo Angular app
  let semester = 'Spring 2025'; // Default to current semester
  const semesterElement = document.querySelector('.course-table-header, .semester-info, h1, [class*="semester"], [class*="term"]');
  if (semesterElement) {
    const text = semesterElement.textContent;
    const match = text.match(/(Spring|Summer|Fall|Winter)\s+\d{4}/i);
    if (match) semester = match[0];
  }

  // Try multiple selector strategies
  let courseCards = document.querySelectorAll('.course-card');
  console.log(`Strategy 1 (.course-card): Found ${courseCards.length} elements`);
  
  if (courseCards.length === 0) {
    // Try alternative selectors for course containers (not nested elements)
    courseCards = document.querySelectorAll('.course-card-container');
    console.log(`Strategy 2 (.course-card-container): Found ${courseCards.length} elements`);
  }
  
  if (courseCards.length === 0) {
    // Try looking for divs that have course-card in class but not activity or other nested classes
    courseCards = document.querySelectorAll('div[class*="course-card-container"]');
    console.log(`Strategy 3 (div[class*="course-card-container"]): Found ${courseCards.length} elements`);
  }

  if (courseCards.length === 0) {
    console.error('No course cards found with any strategy');
    console.log('Available classes on page:', Array.from(document.querySelectorAll('[class]')).map(el => el.className).slice(0, 20));
  }
  
  courseCards.forEach((card, index) => {
    try {
      console.log(`Processing card ${index}:`, card.className);
      
      // Find course code (e.g., CMSC131) - try multiple strategies
      let courseCodeEl = card.querySelector('.course-id');
      let courseCode = courseCodeEl ? courseCodeEl.textContent.trim() : '';
      
      // Try alternative selectors
      if (!courseCode) {
        courseCodeEl = card.querySelector('[class*="course-id"], [class*="courseId"]');
        courseCode = courseCodeEl ? courseCodeEl.textContent.trim() : '';
      }
      
      // Last resort: Look in text content
      if (!courseCode) {
        const allText = card.textContent;
        const codeMatch = allText.match(/([A-Z]{4}\s*\d{3}[A-Z]?)/);
        if (codeMatch) courseCode = codeMatch[1].replace(/\s+/g, '');
      }
      
      if (!courseCode || courseCode.length < 5) {
        console.log(`Skipping card ${index}: no valid course code found`);
        return;
      }

      // Find section number
      let sectionEl = card.querySelector('.course-section-id');
      if (!sectionEl) sectionEl = card.querySelector('[class*="section"]');
      const section = sectionEl ? sectionEl.textContent.trim() : '';

      // Find course title
      let titleEl = card.querySelector('.course-title');
      if (!titleEl) titleEl = card.querySelector('[class*="course-title"], [class*="courseTitle"]');
      const title = titleEl ? titleEl.textContent.trim() : courseCode;

      // Find all activities within this course card - try multiple selectors
      let activities = card.querySelectorAll('.course-card-activity');
      if (activities.length === 0) {
        activities = card.querySelectorAll('[class*="activity"]');
      }
      
      console.log(`Course ${courseCode}: found ${activities.length} activities`);
      
      // If no activities found, try to parse the card directly
      if (activities.length === 0) {
        console.log(`No activities found, trying to parse card directly`);
        const cardText = card.textContent;
        const timeMatch = cardText.match(/(TTh|TuTh|MW|MWF|WF|TuThF|Tu|Th|M|T|W|R|F)\s+(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
        
        if (timeMatch) {
          let days = timeMatch[1].trim();
          const startTime = timeMatch[2].replace(/\s+/g, '');
          const endTime = timeMatch[3].replace(/\s+/g, '');
          
          // Normalize day abbreviations
          if (days === 'R') days = 'Th';
          
          const time = `${startTime}-${endTime}`;
          
          // Try to find location in card text
          const locationMatch = cardText.match(/([A-Z]{3,}\s+\d{4}[A-Z]?)/); // Building + room number
          const location = locationMatch ? locationMatch[1] : 'TBA';

          const uniqueKey = `${courseCode}-${section}-${days}-${time}-${location}`;
          
          if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            console.log(`Added (direct): ${courseCode} ${days} ${time} ${location}`);
            
            courses.push({
              courseCode,
              section,
              title,
              days,
              time,
              location
            });
          }
        }
        return;
      }
      
      activities.forEach(activity => {
        // Get time from this specific activity - try multiple selectors
        let timeEl = activity.querySelector('.course-card-activity--time');
        if (!timeEl) timeEl = activity.querySelector('[class*="time"]');
        if (!timeEl) return;
        
        const timeText = timeEl.textContent.trim();
        console.log(`  Checking activity time text: "${timeText}"`);
        
        // Parse format like "Tu 9:30am - 10:45am EST" or "MWF 10:00am-10:50am" or "TTh 3:30pm-4:45pm"
        // Match day patterns - order matters! Check longer patterns first (TTh, TuTh before single T)
        const timeMatch = timeText.match(/(TTh|TuTh|MW|MWF|WF|TuThF|Tu|Th|M|T|W|R|F)\s+(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
        
        if (timeMatch) {
          let days = timeMatch[1].trim();
          const startTime = timeMatch[2].replace(/\s+/g, '');
          const endTime = timeMatch[3].replace(/\s+/g, '');
          
          // Normalize day abbreviations
          // R is often used for Thursday in academic schedules
          if (days === 'R') days = 'Th';
          
          const time = `${startTime}-${endTime}`;
          
          // Get location from this specific activity
          let locationEl = activity.querySelector('.course-card-activity--location');
          if (!locationEl) locationEl = activity.querySelector('[class*="location"]');
          const location = locationEl ? locationEl.textContent.trim() : 'TBA';

          // Create unique key to detect duplicates
          const uniqueKey = `${courseCode}-${section}-${days}-${time}-${location}`;
          
          if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            console.log(`Added: ${courseCode} ${days} ${time} ${location}`);
            
            courses.push({
              courseCode,
              section,
              title,
              days,
              time,
              location
            });
          } else {
            console.log(`Skipped duplicate: ${uniqueKey}`);
          }
        }
      });

    } catch (e) {
      console.error('Error parsing course card:', e);
    }
  });

  console.log(`Scraped ${courses.length} unique courses total`);
  return { courses, semester };
}

function generateICS(scheduleData) {
  const { courses, semester } = scheduleData;
  
  // Determine semester dates (adjust as needed)
  const semesterDates = getSemesterDates(semester);
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UMD Testudo Exporter//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:UMD Schedule ' + semester,
    'X-WR-TIMEZONE:America/New_York'
  ].join('\r\n');

  courses.forEach(course => {
    const events = createRecurringEvents(course, semesterDates);
    icsContent += '\r\n' + events;
  });

  icsContent += '\r\nEND:VCALENDAR';
  return icsContent;
}

function createRecurringEvents(course, semesterDates) {
  const { courseCode, title, days, time, location, section } = course;
  
  // Parse time (e.g., "10:00am-10:50am")
  const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(am|pm)?-(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!timeMatch) return '';

  let startHour = parseInt(timeMatch[1]);
  const startMin = timeMatch[2];
  let endHour = parseInt(timeMatch[4]);
  const endMin = timeMatch[5];
  
  if (timeMatch[3] && timeMatch[3].toLowerCase() === 'pm' && startHour !== 12) startHour += 12;
  if (timeMatch[6] && timeMatch[6].toLowerCase() === 'pm' && endHour !== 12) endHour += 12;
  if (timeMatch[3] && timeMatch[3].toLowerCase() === 'am' && startHour === 12) startHour = 0;
  if (timeMatch[6] && timeMatch[6].toLowerCase() === 'am' && endHour === 12) endHour = 0;

  // Convert days to RRULE format
  // Handle both single letters and combinations like "Tu", "Th", "TTh", "TuTh", "MWF", etc.
  const dayMap = { 
    'M': 'MO', 
    'T': 'TU',  // Single T = Tuesday
    'W': 'WE', 
    'Th': 'TH', 
    'R': 'TH',  // R is often used for Thursday
    'F': 'FR',
    'Tu': 'TU', // Explicit Tuesday
    'TTh': 'TU,TH', // Tuesday and Thursday
    'TuTh': 'TU,TH', // Tuesday and Thursday
    'MW': 'MO,WE', // Monday and Wednesday
    'MWF': 'MO,WE,FR', // Monday, Wednesday, Friday
    'WF': 'WE,FR', // Wednesday and Friday
    'Sa': 'SA',
    'Su': 'SU'
  };
  
  let rruleDays = [];
  
  // First check for multi-day patterns (exact match)
  if (dayMap[days]) {
    rruleDays = dayMap[days].split(',');
  } else {
    // If not a predefined pattern, parse character by character
    let i = 0;
    while (i < days.length) {
      // Check for two-letter combinations first
      if (i < days.length - 1) {
        const twoChar = days.substr(i, 2);
        if (dayMap[twoChar]) {
          rruleDays.push(dayMap[twoChar]);
          i += 2;
          continue;
        }
      }
      // Then check single character
      const oneChar = days[i];
      if (dayMap[oneChar]) {
        rruleDays.push(dayMap[oneChar]);
      }
      i++;
    }
  }

  // Find first occurrence
  const firstDay = findFirstDayOfWeek(semesterDates.start, rruleDays);
  
  console.log(`Creating ICS for ${courseCode} - Days: ${days} -> RRule: ${rruleDays.join(',')} -> FirstDay: ${firstDay}`);
  
  const dtstart = `${firstDay}T${startHour.toString().padStart(2, '0')}${startMin}00`;
  const dtend = `${firstDay}T${endHour.toString().padStart(2, '0')}${endMin}00`;
  const until = semesterDates.end.replace(/-/g, '') + 'T235959';
  
  const summary = `${courseCode}${section ? ' (' + section + ')' : ''} - ${title}`;
  const uid = `${courseCode}-${section}-${Date.now()}-${Math.random()}@testudo.umd.edu`;

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;TZID=America/New_York:${dtstart}`,
    `DTEND;TZID=America/New_York:${dtend}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${rruleDays.join(',')};UNTIL=${until}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location || 'TBA'}`,
    `DESCRIPTION:${courseCode} - ${title}`,
    'END:VEVENT'
  ].join('\r\n');
}

function getSemesterDates(semester) {
  const year = semester.match(/\d{4}/)?.[0] || new Date().getFullYear();
  
  // UMD semester dates
  if (semester.includes('Fall')) {
    return { start: `${year}0828`, end: `${year}1213` };
  } else if (semester.includes('Spring')) {
    return { start: `${year}0122`, end: `${year}0515` };
  } else if (semester.includes('Summer')) {
    return { start: `${year}0603`, end: `${year}0809` };
  }
  
  // Default to current semester (Spring 2025)
  return { start: `20250122`, end: `20250515` };
}

function findFirstDayOfWeek(startDate, daysOfWeek) {
  // startDate format: YYYYMMDD
  const year = parseInt(startDate.substr(0, 4));
  const month = parseInt(startDate.substr(4, 2)) - 1;
  const day = parseInt(startDate.substr(6, 2));
  
  const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const targetDays = daysOfWeek.map(d => dayMap[d]).filter(d => d !== undefined).sort((a, b) => a - b);
  
  if (targetDays.length === 0) {
    console.error('No valid target days found:', daysOfWeek);
    return startDate; // Return start date as fallback
  }
  
  let date = new Date(year, month, day);
  const firstTargetDay = targetDays[0];
  
  console.log(`Finding first ${firstTargetDay} (${Object.keys(dayMap).find(k => dayMap[k] === firstTargetDay)}) from ${startDate}`);
  
  // Find first occurrence of target day
  while (date.getDay() !== firstTargetDay) {
    date.setDate(date.getDate() + 1);
  }
  
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  
  return `${y}${m}${d}`;
}
