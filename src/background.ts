import MsTeamsClient from "./msTeams";
import { ProcessResult, FileDetails } from "./types";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "processFiles") {
    const files = JSON.parse(message.files) as FileDetails[];
    handleFileProcessing(files, message.tokens)
      .then(sendResponse)
      .catch((error) => {
        const errorMessage = formatErrorMessage(error);
        sendResponse({ success: false, error: errorMessage });
      });
    return true;
  }
});

export function formatErrorMessage(error: any): string {
  // If it's a standard error object
  if (error instanceof Error) {
    return error.message;
  }

  // If it's a string that might be JSON
  if (typeof error === "string") {
    try {
      const parsed = JSON.parse(error);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // Not JSON, return as is
      return error;
    }
  }

  // If it's already an object
  if (typeof error === "object") {
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return String(error);
    }
  }

  // Fallback
  return String(error);
}

export async function handleFileProcessing(
  files: FileDetails[],
  tokens: {
    chatsvcagg: string | null;
    ic3: string | null;
    permissionsId: string | null;
  },
): Promise<ProcessResult> {
  try {
    if (!tokens.chatsvcagg || !tokens.ic3 || !tokens.permissionsId) {
      throw new Error("Could not find required tokens");
    }
    const teams = new MsTeamsClient(
      tokens.ic3,
      tokens.chatsvcagg,
      tokens.permissionsId,
    );
    const result = await teams.uploadFiles(files);

    chrome.runtime.sendMessage({
      type: "processUpdate",
      success: result.success,
      status: result.status,
      error: result.error,
    });

    return result;
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    const errorResult = { success: false, error: errorMessage };

    chrome.runtime.sendMessage({
      type: "processUpdate",
      ...errorResult,
    });

    return errorResult;
  }
}
