import TokenStore from "./tokenStore";
import { ProcessResult, FileDetails } from "./types";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check for existing processing state
    const state = await chrome.storage.local.get<{
      processingState?: { status: string; type: string };
    }>("processingState");
    if (state.processingState) {
      updateStatus(
        state.processingState.status,
        state.processingState.type as
          | "ready"
          | "success"
          | "error"
          | "processing",
      );
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (tab.id) {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const items: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
              key &&
              (key.includes("chatsvcagg") || key.includes("ic3.teams.office"))
            ) {
              items[key] = localStorage.getItem(key) || "";
            }
          }
          return items;
        },
      });

      if (result && result[0].result) {
        for (const [key, value] of Object.entries(result[0].result)) {
          try {
            const parsedValue = JSON.parse(value as string);
            await chrome.storage.local.set({ [key]: parsedValue });
            console.log("Stored token:", key);
          } catch (e) {
            console.error("Failed to parse token:", key, e);
          }
        }
        console.log("Teams tokens captured from page");
      }
    }
  } catch (err) {
    console.error("Error capturing tokens:", err);
  }
});

function updateStatus(
  message: string,
  type: "ready" | "success" | "error" | "processing" = "ready",
) {
  const statusDiv = document.getElementById("status")!;
  const statusText = document.getElementById("statusText")!;
  const statusIcon = statusDiv.querySelector("i")!;

  statusDiv.className = "status"; // Reset class
  const statusClasses: { [key: string]: [string, string] } = {
    success: ["status-success", "fas fa-check-circle"],
    error: ["status-error", "fas fa-exclamation-circle"],
    processing: ["status-processing", "fas fa-spinner fa-spin"],
    ready: ["status-ready", "fas fa-circle-info"],
  };

  statusDiv.classList.add(statusClasses[type][0]);
  statusIcon.className = statusClasses[type][1];
  statusText.textContent = message;
}

async function handleFileProcessing() {
  try {
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    const files = await Promise.all(
      Array.from(fileInput.files || []).map(async (file) => {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          base64: base64,
        } as FileDetails;
      }),
    );
    if (files.length === 0) {
      updateStatus("Please select files first.", "error");
      return;
    }

    const filesJson = JSON.stringify(files);

    updateStatus("Processing...", "processing");

    const tokens = await TokenStore.collectTokensFromStorage();

    const result = await chrome.runtime.sendMessage({
      action: "processFiles",
      files: filesJson,
      tokens: tokens,
    });

    const { success, error, status } = result as ProcessResult;
    if (error) {
      updateStatus(error, "error");
    } else {
      updateStatus(status || "", success ? "success" : "processing");

      await chrome.browsingData.remove(
        {
          origins: ["https://teams.microsoft.com"],
        },
        {
          cacheStorage: true,
          cookies: true,
          localStorage: true,
          serviceWorkers: true,
          indexedDB: true,
          cache: true,
          appcache: true,
        },
      );

      await chrome.storage.local.clear();

      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];

      if (tab.id) {
        await chrome.tabs.reload(tab.id);
      }
    }
  } catch (error) {
    let errorMessage = "";

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      try {
        const parsed = JSON.parse(error);
        errorMessage = JSON.stringify(parsed, null, 2);
      } catch {
        errorMessage = error;
      }
    } else {
      errorMessage = String(error);
    }

    updateStatus(errorMessage, "error");
  }
}

function updateSelectedFiles() {
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;
  const selectedFilesDiv = document.getElementById("selectedFiles")!;
  if (fileInput.files && fileInput.files.length > 0) {
    const fileList = Array.from(fileInput.files)
      .map((file) => file.name)
      .join(", ");
    selectedFilesDiv.textContent = fileList;
  } else {
    selectedFilesDiv.textContent = "No files selected";
  }
}

document
  .getElementById("fileInput")
  ?.addEventListener("change", updateSelectedFiles);
document
  .getElementById("processButton")
  ?.addEventListener("click", () => handleFileProcessing());

async function refreshTeams() {
  try {
    updateStatus("Refreshing Teams...", "processing");

    await chrome.browsingData.remove(
      {
        origins: ["https://teams.microsoft.com"],
      },
      {
        cacheStorage: true,
        cookies: true,
        localStorage: true,
        serviceWorkers: true,
        indexedDB: true,
        cache: true,
        appcache: true,
      },
    );

    await chrome.storage.local.clear();

    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];

    if (tab.id) {
      await chrome.tabs.reload(tab.id);
      updateStatus("Teams refreshed successfully!", "success");
    }
  } catch (error) {
    updateStatus(`Refresh failed: ${error}`, "error");
  }
}

document.getElementById("resetButton")?.addEventListener("click", refreshTeams);

chrome.runtime.onMessage.addListener(
  (message: { type: string; error: any; status: any; success: any }) => {
    if (message.type === "processUpdate") {
      const status = message.error || message.status;
      const type = message.success
        ? "success"
        : message.error
          ? "error"
          : "processing";

      // Update the UI
      updateStatus(status, type as "success" | "error" | "processing");

      // Ensure we store the state in case it was sent directly from background.ts
      // Background should be storing the state, but this is a good fallback
      chrome.storage.local.set({
        processingState: {
          status: status,
          type: type,
        },
      });
    }
  },
);
