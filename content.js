// Content script that runs on testudo.umd.edu pages
// This can be used for additional features or page monitoring

console.log('Testudo Schedule Exporter loaded!');

// Optional: Add a visual indicator that the extension is active
function addIndicator() {
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #dc143c;
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    cursor: pointer;
  `;
  indicator.textContent = '📅 Schedule Exporter Ready!';
  indicator.title = 'Click the extension icon to export your schedule';
  
  document.body.appendChild(indicator);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    indicator.style.opacity = '0';
    indicator.style.transition = 'opacity 0.5s';
    setTimeout(() => indicator.remove(), 500);
  }, 3000);
}

// Only add indicator if we're on a schedule page
if (window.location.href.includes('schedule') || 
    document.querySelector('table.schedule-table, .course-table')) {
  setTimeout(addIndicator, 1000);
}
