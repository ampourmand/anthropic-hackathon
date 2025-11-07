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
      function: scrapeSchedule
    });

    const scheduleData = results[0].result;
    
    if (!scheduleData || scheduleData.courses.length === 0) {
      throw new Error('No schedule data found. Make sure you\'re on your schedule page!');
    }

    // Generate ICS file
    const icsContent = generateICS(scheduleData);
    
    // Download the file
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const filename = `umd_schedule_${scheduleData.semester.replace(/\s+/g, '_')}.ics`;
    
    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });

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
  
  // Try to find semester info - Testudo Angular app
  let semester = 'Fall 2024'; // Default
  const semesterElement = document.querySelector('.course-table-header, .semester-info, h1, [class*="semester"], [class*="term"]');
  if (semesterElement) {
    const text = semesterElement.textContent;
    const match = text.match(/(Spring|Summer|Fall|Winter)\s+\d{4}/i);
    if (match) semester = match[0];
  }

  // Testudo uses Angular with classes like "course-card", "ng-binding", etc.
  // Look for course cards or activities
  const courseCards = document.querySelectorAll('.course-card, [class*="course-card"], .course-section, [class*="course"]');
  
  console.log(`Found ${courseCards.length} potential course elements`);
  
  courseCards.forEach((card, index) => {
    try {
      // Find course code (e.g., CMSC131)
      const courseCodeEl = card.querySelector('.course-id, [class*="course-id"], .course-code, [class*="course-code"]');
      let courseCode = courseCodeEl ? courseCodeEl.textContent.trim() : '';
      
      // Alternative: Look in text content
      if (!courseCode) {
        const allText = card.textContent;
        const codeMatch = allText.match(/([A-Z]{4}\s*\d{3}[A-Z]?)/);
        if (codeMatch) courseCode = codeMatch[1].replace(/\s+/g, '');
      }
      
      if (!courseCode || courseCode.length < 5) return;

      // Find section number
      const sectionEl = card.querySelector('.course-section-id, [class*="section"], .section-id');
      const section = sectionEl ? sectionEl.textContent.trim() : '';

      // Find course title
      const titleEl = card.querySelector('.course-title, [class*="course-title"], .course-name, [class*="course-name"]');
      const title = titleEl ? titleEl.textContent.trim() : courseCode;

      // Find time info - matching your HTML structure
      const timeElements = card.querySelectorAll('.course-card-activity--time, [class*="activity--time"], [class*="time"]');
      
      timeElements.forEach(timeEl => {
        const timeText = timeEl.textContent.trim();
        
        // Parse format like "T 9:30am - 10:45am EST" or "MWF 10:00am-10:50am"
        const timeMatch = timeText.match(/([MTWRF]+|Tu|Th|TuTh|MWF|MW|TuThF)\s+(\d{1,2}:\d{2}[ap]m)\s*-\s*(\d{1,2}:\d{2}[ap]m)/i);
        
        if (timeMatch) {
          const days = timeMatch[1].trim();
          const startTime = timeMatch[2];
          const endTime = timeMatch[3];
          const time = `${startTime}-${endTime}`;
          
          // Find location
          const locationEl = card.querySelector('.course-card-activity--location, [class*="activity--location"], [class*="location"], [class*="building"]');
          const location = locationEl ? locationEl.textContent.trim() : 'TBA';

          console.log(`Parsed: ${courseCode} ${days} ${time} ${location}`);

          courses.push({
            courseCode,
            section,
            title,
            days,
            time,
            location
          });
        }
      });

    } catch (e) {
      console.error('Error parsing course card:', e);
    }
  });

  console.log(`Scraped ${courses.length} courses total`);
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
  // Handle both single letters and combinations like "Tu", "Th", "TuTh", "MWF", etc.
  const dayMap = { 
    'M': 'MO', 
    'T': 'TU',  // Single T = Tuesday
    'W': 'WE', 
    'Th': 'TH', 
    'R': 'TH',  // R is often used for Thursday
    'F': 'FR',
    'Tu': 'TU', // Explicit Tuesday
    'Sa': 'SA',
    'Su': 'SU'
  };
  
  const rruleDays = [];
  
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

  // Find first occurrence
  const firstDay = findFirstDayOfWeek(semesterDates.start, rruleDays);
  
  const dtstart = `${firstDay}T${startHour.toString().padStart(2, '0')}${startMin}00`;
  const dtend = `${firstDay}T${endHour.toString().padStart(2, '0')}${endMin}00`;
  const until = semesterDates.end.replace(/-/g, '') + 'T235959';
  
  const summary = `${courseCode}${section ? ' (' + section + ')' : ''} - ${title}`;
  const uid = `${courseCode}-${section}-${Date.now()}@testudo.umd.edu`;

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
  
  // Default semester dates (adjust for actual UMD calendar)
  if (semester.includes('Fall')) {
    return { start: `${year}0828`, end: `${year}1213` };
  } else if (semester.includes('Spring')) {
    return { start: `${year}0122`, end: `${year}0510` };
  } else if (semester.includes('Summer')) {
    return { start: `${year}0603`, end: `${year}0809` };
  }
  
  // Default to current semester
  return { start: `${year}0828`, end: `${year}1213` };
}

function findFirstDayOfWeek(startDate, daysOfWeek) {
  // startDate format: YYYYMMDD
  const year = parseInt(startDate.substr(0, 4));
  const month = parseInt(startDate.substr(4, 2)) - 1;
  const day = parseInt(startDate.substr(6, 2));
  
  const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const targetDays = daysOfWeek.map(d => dayMap[d]).sort((a, b) => a - b);
  
  let date = new Date(year, month, day);
  const firstTargetDay = targetDays[0];
  
  // Find first occurrence of target day
  while (date.getDay() !== firstTargetDay) {
    date.setDate(date.getDate() + 1);
  }
  
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  
  return `${y}${m}${d}`;
}
