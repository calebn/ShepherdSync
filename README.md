# ShepherdSync

A Chrome extension that adds calendar event download functionality to Shepherd.vet appointment pages.

## Features

- Adds "Download" button to appointment edit modals
- Creates calendar events with:
  - Provider initials and client name as title
  - Appointment date and duration
  - Client contact information
  - Visit reason and notes
  - Patient details
- Compatible with any calendar application that supports .ics files

## Setup Instructions

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project directory

## Development Mode

The extension supports local development:

- Works on `localhost` and `127.0.0.1`
- Monitors DOM changes for appointment modals
- Provides detailed console logging

## Production Mode

When installed from Chrome Web Store:

- Only activates on `app.shepherd.vet` domain
- Uses MutationObserver for efficient DOM monitoring
- Minimal console output

## Debugging

1. **Development**:

   - Open Chrome DevTools on your local development page
   - Check console for detailed logging
   - Monitor network requests for calendar downloads

2. **Production**:
   - Navigate to `chrome://extensions`
   - Find "ShepherdSync" and click "background page"
   - Monitor extension activity in DevTools

## Calendar Event Format

Generated .ics files include:

- Title: `[Provider Initials] - [Client Name]`
- Date and Time: From appointment schedule
- Location: Client's address
- Description:
  - Provider information
  - Client contact details
  - Reason for visit
  - Appointment notes
  - Patient information (detailed for ≤3 patients)

## Support

For issues or feature requests, please open a GitHub issue.
