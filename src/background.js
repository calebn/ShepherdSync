// Main listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "createEvent") {
    try {
      // Verify sender is from active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || sender.tab.id !== tabs[0].id) {
          throw new Error("Calendar event must be created from active tab");
        }

        const { title, startDate, endDate, location, notes, appointmentId } =
          request.eventData;

        validateEventData(startDate, endDate);

        const icsContent = generateICS(
          title || "Vet Appointment",
          startDate,
          endDate,
          location,
          notes,
          appointmentId
        );

        const base64Data = btoa(
          encodeURIComponent(icsContent).replace(
            /%([0-9A-F]{2})/g,
            (match, p1) => String.fromCharCode("0x" + p1)
          )
        );

        const dataUrl = `data:text/calendar;charset=utf-8;base64,${base64Data}`;

        chrome.downloads.download(
          {
            url: dataUrl,
            filename: `${title || "vet-appointment"}.ics`,
            saveAs: true,
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              console.error("Download failed:", chrome.runtime.lastError);
              sendResponse({
                status: "error",
                message: chrome.runtime.lastError.message,
              });
            } else {
              sendResponse({ status: "success" });
            }
          }
        );
      });
    } catch (error) {
      console.error("Error creating calendar event:", error);
      sendResponse({ status: "error", message: error.toString() });
    }
  }
  return true;
});

// Validate function
function validateEventData(startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error("Missing required date information");
  }
}

// ICS generator
function generateICS(
  title,
  startDate,
  endDate,
  location = "",
  notes = "",
  appointmentId = null
) {
  try {
    const escapedLocation = (location || "")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
    const escapedNotes = (notes || "")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,");

    const icsFields = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT"];

    if (appointmentId) {
      icsFields.push(`UID:${appointmentId}@shepherd.vet`);
    }

    icsFields.push(
      `SUMMARY:${title}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `LOCATION:${escapedLocation}`,
      `DESCRIPTION:${escapedNotes}`,
      "END:VEVENT",
      "END:VCALENDAR"
    );
    return icsFields.join("\r\n");
  } catch (error) {
    console.error("Error generating ICS:", error);
    throw error;
  }
}

function formatDate(date) {
  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error("Invalid date");
    }
    return parsedDate.toISOString().replace(/-|:|\.\d{3}/g, "");
  } catch (error) {
    console.error("Error formatting date:", error);
    throw error;
  }
}

// Encode string to data URL
function encodeICSToDataUrl(icsString) {
  const base64Data = btoa(
    encodeURIComponent(icsString).replace(/%([0-9A-F]{2})/g, (match, p1) =>
      String.fromCharCode("0x" + p1)
    )
  );
  return `data:text/calendar;charset=utf-8;base64,${base64Data}`;
}

// Trigger the download
function downloadICSFile(dataUrl, fileName, callback) {
  chrome.downloads.download(
    {
      url: dataUrl,
      filename: `${fileName}.ics`,
      saveAs: true,
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        return callback(chrome.runtime.lastError);
      }
      return callback(null);
    }
  );
}
