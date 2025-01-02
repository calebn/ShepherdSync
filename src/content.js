const isDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const isShepherdVet = window.location.hostname === "app.shepherd.vet";

function debugLog(message, data = null) {
  console.log(`[ShepherdSync] ${message}`, data || "");
}

// DOM Helpers
function safeQuerySelector(parent, selector, defaultValue = "") {
  try {
    const element = parent.querySelector(selector);
    return element ? element.textContent.trim() : defaultValue;
  } catch (error) {
    console.error(`Error querying selector ${selector}:`, error);
    return defaultValue;
  }
}

function normalizeText(text) {
  return text
    .replace(/[ \t]+/g, " ") // collapse multiple spaces/tabs
    .replace(/\n\s+/g, "\n") // remove spaces after newlines
    .replace(/\s+\n/g, "\n") // remove spaces before newlines
    .trim();
}

// UI Components
function createCalendarButton() {
  try {
    const calendarButton = document.createElement("button");
    calendarButton.className =
      "btn btn--base btn--ghost btn--with-icon u-mar--right--sml";
    calendarButton.title = "Download Calendar Event";
    calendarButton.innerHTML = `
      <span tabindex="0" class="f f--align--items--center">
        <span class="u-icon u-icon--sml u-icon--schedule--text"></span>
        Download
      </span>
    `;
    return calendarButton;
  } catch (error) {
    console.error("Error creating calendar button:", error);
    return null;
  }
}

// Data Extraction
function getAppointmentBasics(modal) {
  return {
    dateInput: modal.querySelector(
      '[data-test-id="appointment-form-date-input"]'
    )?.value,
    durationInput: modal.querySelector(
      '[data-test-id="appointment-form-duration-input"]'
    )?.value,
  };
}

function getProviderName(modal) {
  try {
    const providerElement = modal.querySelector(
      '[data-test-id="appointment-form-provider-control"] .react-select__single-value'
    );
    return providerElement
      ? providerElement.textContent.trim()
      : "Unknown Provider";
  } catch (error) {
    console.error("Error getting provider name:", error);
    return "Unknown Provider";
  }
}

function getClientInfo(modal) {
  return {
    name: safeQuerySelector(
      modal,
      '[data-test-id="appointment-form-clientName"]'
    ),
    phone: safeQuerySelector(modal, 'a[href^="tel:"]'),
    email: safeQuerySelector(modal, 'a[href^="mailto:"]'),
    address: {
      street: safeQuerySelector(modal, '[data-test-id="client-page-adress-1"]'),
      details: safeQuerySelector(
        modal,
        '[data-test-id="client-page-adress-details"]'
      ),
    },
  };
}

function getAllPatients(modal) {
  try {
    const patientCards = modal.querySelectorAll(
      '[data-test-id^="appointment-form-patient-card-"]'
    );
    return Array.from(patientCards).map((card) => ({
      name: safeQuerySelector(
        card,
        '[data-test-id="appointment-form-patientLink"]',
        "Pet"
      ),
      details: normalizeText(
        safeQuerySelector(card, ".card__body--sml .col-sml-12")
      ),
    }));
  } catch (error) {
    console.error("Error getting patients:", error);
    return [];
  }
}

// Formatters
function getProviderInitials(providerName) {
  try {
    const nameWithoutPrefix = providerName.replace(/^Dr\.\s+/, "").trim();
    const nameParts = nameWithoutPrefix.split(/[\s-]+/);
    return nameParts
      .map((part) => part.replace(/[^a-zA-Z]/g, "")[0] || "")
      .join("")
      .toUpperCase();
  } catch (error) {
    console.error("Error getting provider initials:", error);
    return "";
  }
}

function generateTitle(providerName, clientName) {
  try {
    const initials = getProviderInitials(providerName);
    return `${initials} - ${clientName}`;
  } catch (error) {
    console.error("Error generating title:", error);
    return "Vet Appointment";
  }
}

function getNotes(modal) {
  try {
    const noteContainers = modal.querySelectorAll(
      '[data-test-groupid="undefined-note-item"]'
    );
    return Array.from(noteContainers)
      .map((container) => {
        const content = normalizeText(
          container.querySelector('[data-test-id="note-content"] p')
            ?.textContent || ""
        );
        const userInfo = container
          .querySelector(".notes__user-info")
          ?.textContent.trim();
        return { content, userInfo };
      })
      .filter((note) => note.content);
  } catch (error) {
    console.error("Error getting notes:", error);
    return [];
  }
}

function formatNotesSection(notes) {
  if (!notes.length) return "";

  const noteText = notes
    .map((note) => `Note: ${note.content}\n${note.userInfo}`)
    .join("\n\n");

  return `\n\nNotes:\n---------------\n${noteText}\n`;
}

function formatPatientSection(patients) {
  if (!patients.length) return "";

  if (patients.length > 3) {
    return `\n\nPatients: ${patients.length} patients in this appointment`;
  }

  const patientDetails = patients
    .map((patient) => `Patient: ${patient.name}\nDetails: ${patient.details}`)
    .join("\n\n");

  return `\n\nPatient Information:\n------------------\n${patientDetails}`;
}

function formatDescription(data) {
  return `Provider: ${data.provider}

Owner Information:
--------------------
Name: ${data.clientName}
Phone: ${data.clientPhone}
Email: ${data.clientEmail}

Reason for Visit:
---------------
${data.reason}${formatNotesSection(data.notes)}${formatPatientSection(
    data.patients
  )}`;
}

// Main Data Processing
function extractAppointmentData(modal) {
  try {
    const { dateInput, durationInput } = getAppointmentBasics(modal);
    if (!dateInput) throw new Error("Missing required date input");

    const provider = getProviderName(modal);
    const clientInfo = getClientInfo(modal);
    const patients = getAllPatients(modal);
    const notes = getNotes(modal);
    const reason =
      modal.querySelector(
        '[data-test-id="appointment-form-reasonForVisit-txtbox"]'
      )?.value || "";
    const reasonText = normalizeText(reason.replace(/@Location:.*(\n)?/, ""));

    const startDate = new Date(dateInput);
    if (isNaN(startDate.getTime())) throw new Error("Invalid date input");

    const durationMinutes = parseInt(durationInput, 10) || 30;
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    const fullAddress =
      clientInfo.address.street && clientInfo.address.details
        ? `${clientInfo.address.street}, ${clientInfo.address.details}`
        : "";

    return {
      title: generateTitle(provider, clientInfo.name),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      location: fullAddress,
      notes: formatDescription({
        provider,
        clientName: clientInfo.name,
        clientPhone: clientInfo.phone,
        clientEmail: clientInfo.email,
        reason: reasonText,
        notes,
        patients,
      }),
    };
  } catch (error) {
    console.error("Error extracting appointment data:", error);
    throw error;
  }
}

function handleCalendarButtonClick(modal) {
  if (!chrome?.runtime?.sendMessage) {
    console.error("Chrome APIs not available");
    return;
  }

  try {
    const appointmentData = extractAppointmentData(modal);
    // Send message directly without tabs query
    chrome.runtime.sendMessage(
      {
        action: "createEvent",
        eventData: appointmentData,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Message error:", chrome.runtime.lastError);
          return;
        }
        console.log("Calendar event created:", response);
      }
    );
  } catch (error) {
    console.error("Error handling calendar button click:", error);
  }
}

// Event Handlers
function handleModal(modal) {
  if (!modal) return;

  try {
    const footerSection = modal.querySelector(".section--appointment-footer");
    if (!footerSection) return;

    const cancelButton = footerSection.querySelector(
      '[data-test-id="edit-modal-uncancel-btn"]'
    );
    if (!cancelButton) return;

    const existingButton = footerSection.querySelector(
      '[title="Download Calendar Event"]'
    );
    if (existingButton) return;

    const calendarButton = createCalendarButton();
    if (!calendarButton) return;

    calendarButton.addEventListener("click", () =>
      handleCalendarButtonClick(modal)
    );

    footerSection.insertBefore(calendarButton, cancelButton);
  } catch (error) {
    console.error("Error handling modal:", error);
  }
}

// Initialization
if (isDevelopment) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      const editModal = document.querySelector(
        ".ReactModal__Content--after-open"
      );
      if (editModal && editModal.querySelector(".is-schedule")) {
        handleModal(editModal);
      }
    });
  } else {
    const editModal = document.querySelector(
      ".ReactModal__Content--after-open"
    );
    if (editModal && editModal.querySelector(".is-schedule")) {
      handleModal(editModal);
    }
  }
} else if (isShepherdVet) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        // Look for .is-schedule first
        const scheduleSection = node.classList?.contains("is-schedule")
          ? node
          : node.querySelector(".is-schedule");

        if (scheduleSection) {
          // Find parent modal
          const modalContent = scheduleSection.closest(".ReactModal__Content");
          if (modalContent) {
            handleModal(modalContent);
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
  });
}
