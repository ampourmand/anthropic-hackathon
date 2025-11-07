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
  let semester = 'Fall 2025'; // Default
  const semesterElement = document.querySelector('.course-table-header, .semester-info, h1, [class*="semester"], [class*="term"]');
  if (semesterElement) {
    const text = semesterElement.textContent;
    const match = text.match(/(Spring|Summer|Fall|Winter)\s+\d{4}/i);
    if (match) semester = match[0];
  }

  console.log('=== Starting Schedule Scrape ===');
  console.log('Page URL:', window.location.href);
  console.log('Page title:', document.title);

  // Try multiple selectors to find course cards with detailed logging
  console.log('Trying selector: .course-card');
  let courseCards = document.querySelectorAll('.course-card');
  console.log(`  Found: ${courseCards.length}`);
  
  if (courseCards.length === 0) {
    console.log('Trying selector: [class*="course-card"]');
    courseCards = document.querySelectorAll('[class*="course-card"]');
    console.log(`  Found: ${courseCards.length}`);
  }
  
  if (courseCards.length === 0) {
    console.log('Trying selector: [class*="course"]');
    courseCards = document.querySelectorAll('[class*="course"]');
    console.log(`  Found: ${courseCards.length}`);
  }

  // If still nothing, try to find any element with course code pattern
  if (courseCards.length === 0) {
    console.log('Trying to find elements containing course codes...');
    const allElements = document.querySelectorAll('*');
    const candidateElements = [];
    allElements.forEach(el => {
      const text = el.textContent;
      if (text.match(/[A-Z]{4}\s*\d{3}\s*\(\d{4}\)/)) {
        candidateElements.push(el);
      }
    });
    console.log(`  Found ${candidateElements.length} elements with course code pattern`);
    
    // Use parent elements if we found text nodes
    if (candidateElements.length > 0) {
      courseCards = candidateElements.map(el => {
        // Go up a few levels to get the full course card
        let parent = el;
        for (let i = 0; i < 5; i++) {
          if (parent.parentElement) parent = parent.parentElement;
        }
        return parent;
      });
      // Remove duplicates
      courseCards = [...new Set(courseCards)];
      console.log(`  Using ${courseCards.length} parent elements`);
    }
  }
  
  console.log(`\n==> FINAL: Found ${courseCards.length} course card elements to process`);
  
  courseCards.forEach((card, cardIndex) => {
    try {
      // Find course code (e.g., INST346)
      const courseCodeEl = card.querySelector('.course-id, [class*="course-id"]');
      let courseCode = '';
      let section = '';
      
      if (courseCodeEl) {
        const codeText = courseCodeEl.textContent.trim();
        // Match patterns like "INST 346 (0303)" or "INST346 (0303)"
        const fullMatch = codeText.match(/([A-Z]{4}\s*\d{3}[A-Z]?)\s*\((\d{4})\)/);
        if (fullMatch) {
          courseCode = fullMatch[1].replace(/\s+/g, '');
          section = fullMatch[2];
        } else {
          // Try simpler match
          const simpleMatch = codeText.match(/([A-Z]{4}\s*\d{3}[A-Z]?)/);
          if (simpleMatch) courseCode = simpleMatch[1].replace(/\s+/g, '');
        }
      }
      
      if (!courseCode || courseCode.length < 5) {
        console.log(`Card ${cardIndex}: No valid course code found`);
        return;
      }

      console.log(`\n--- Card ${cardIndex}: ${courseCode} (${section}) ---`);

      // Find course title
      const titleEl = card.querySelector('.course-title, [class*="course-title"]');
      const title = titleEl ? titleEl.textContent.trim() : courseCode;

      // Find ALL time elements (each represents a meeting: Lec, Dis, Lab, etc.)
      // Use a broader search to catch all time entries
      const timeElements = card.querySelectorAll('[class*="time"]');
      
      console.log(`  Found ${timeElements.length} time elements`);
      
      let meetingCount = 0;
      
      timeElements.forEach((timeEl, timeIndex) => {
        const timeText = timeEl.textContent.trim();
        
        console.log(`  Time ${timeIndex}: "${timeText}"`);
        
        // Skip if no actual time or if it's TBA
        if (timeText.includes('TBA') || !timeText.match(/\d{1,2}:\d{2}/)) {
          console.log(`    -> Skipped (TBA or no time)`);
          return;
        }
        
        // Parse format like "MW 10:00am - 10:50am EST"
        const timeMatch = timeText.match(/([MTWRFSu]+|Tu|Th)\s+(\d{1,2}:\d{2}[ap]m)\s*-\s*(\d{1,2}:\d{2}[ap]m)/i);
        
        if (timeMatch) {
          const days = timeMatch[1].trim();
          const startTime = timeMatch[2];
          const endTime = timeMatch[3];
          const time = `${startTime}-${endTime}`;
          
          // Try to find activity type (Lec, Dis, etc.) by looking at siblings or parents
          let activityType = '';
          let currentEl = timeEl.parentElement;
          let searchDepth = 0;
          
          // Search up the DOM tree for activity type
          while (currentEl && searchDepth < 5) {
            const text = currentEl.textContent;
            // Look for activity type indicators
            if (text.includes('Lec') && !activityType) activityType = 'Lec';
            if (text.includes('Dis') && !activityType) activityType = 'Dis';
            if (text.includes('Lab') && !activityType) activityType = 'Lab';
            if (activityType) break;
            currentEl = currentEl.parentElement;
            searchDepth++;
          }
          
          // Find location - search siblings and parent elements
          let location = 'TBA';
          const locationEl = timeEl.parentElement?.querySelector('[class*="location"]');
          if (locationEl) {
            location = locationEl.textContent.trim();
          } else {
            // Try to find location in the same container
            const container = timeEl.closest('.course-card-activity, [class*="activity"]');
            if (container) {
              const locEl = container.querySelector('[class*="location"]');
              if (locEl) location = locEl.textContent.trim();
            }
          }

          // Create descriptive title
          const fullTitle = activityType ? `${courseCode} ${activityType}` : courseCode;

          console.log(`    ✓ ADDED: ${courseCode} ${activityType} ${days} ${time} @ ${location}`);

          courses.push({
            courseCode,
            section,
            title: fullTitle,
            days,
            time,
            location,
            activityType
          });
          
          meetingCount++;
        } else {
          console.log(`    -> Could not parse time format`);
        }
      });
      
      console.log(`  Total meetings added for ${courseCode}: ${meetingCount}`);

    } catch (e) {
      console.error(`Error parsing card ${cardIndex}:`, e);
    }
  });

  // FALLBACK: If no courses found, try parsing the entire page text
  if (courses.length === 0) {
    console.log('\n!!! No courses found with DOM selectors, trying text-based parsing !!!');
    const pageText = document.body.innerText;
    const lines = pageText.split('\n');
    
    let currentCourse = null;
    let currentActivity = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for course code pattern: INST 335 (0301)
      const courseMatch = line.match(/^([A-Z]{4})\s+(\d{3}[A-Z]?)\s+\((\d{4})\)/);
      if (courseMatch) {
        currentCourse = {
          code: courseMatch[1] + courseMatch[2],
          section: courseMatch[3]
        };
        console.log(`Found course: ${currentCourse.code} (${currentCourse.section})`);
        continue;
      }
      
      // Look for activity type
      if (line.match(/^(Lec|Dis|Lab|Sem)$/)) {
        currentActivity = line;
        continue;
      }
      
      // Look for time pattern: MW 9:00am - 9:50am EST
      const timeMatch = line.match(/^([MTWRFSu]+|Tu|Th)\s+(\d{1,2}:\d{2}[ap]m)\s*-\s*(\d{1,2}:\d{2}[ap]m)/i);
      if (timeMatch && currentCourse) {
        const days = timeMatch[1];
        const startTime = timeMatch[2];
        const endTime = timeMatch[3];
        const time = `${startTime}-${endTime}`;
        
        // Next line might be location
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : 'TBA';
        const location = nextLine.match(/^[A-Z]/) ? nextLine : 'TBA';
        
        console.log(`  Adding: ${currentCourse.code} ${currentActivity} ${days} ${time} @ ${location}`);
        
        courses.push({
          courseCode: currentCourse.code,
          section: currentCourse.section,
          title: `${currentCourse.code} ${currentActivity || ''}`,
          days,
          time,
          location,
          activityType: currentActivity || ''
        });
      }
    }
    
    console.log(`Fallback parsing found ${courses.length} meetings`);
  }

  console.log(`\n=== FINAL: Scraped ${courses.length} total meetings ===`);
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
