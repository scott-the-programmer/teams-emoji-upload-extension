// Set up chrome mock before importing modules
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

Object.defineProperty(global, "chrome", {
  value: mockChrome,
  writable: true,
  configurable: true,
});

// Now import the modules
import { ProcessResult, FileDetails } from "../types";
import { formatErrorMessage, handleFileProcessing } from "../background";

// Mock MsTeamsClient
jest.mock("../msTeams", () => {
  return jest.fn().mockImplementation(() => ({
    uploadFiles: jest.fn(),
  }));
});

describe("Background Script", () => {
  let MsTeamsClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    MsTeamsClient = require("../msTeams");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("formatErrorMessage", () => {
    it("should format Error objects", () => {
      const error = new Error("Test error");
      expect(formatErrorMessage(error)).toBe("Test error");
    });

    it("should format JSON strings", () => {
      const jsonString = JSON.stringify({ message: "JSON error" });
      expect(formatErrorMessage(jsonString)).toBe(
        JSON.stringify({ message: "JSON error" }, null, 2),
      );
    });

    it("should handle non-JSON strings", () => {
      const plainString = "Plain error message";
      expect(formatErrorMessage(plainString)).toBe("Plain error message");
    });

    it("should format objects", () => {
      const errorObject = { code: 404, message: "Not found" };
      expect(formatErrorMessage(errorObject)).toBe(
        JSON.stringify(errorObject, null, 2),
      );
    });
  });

  describe("handleFileProcessing", () => {
    it("should process files successfully", async () => {
      // Setup mock implementation
      const mockUploadFiles = jest.fn().mockResolvedValue({
        success: true,
        status:
          "Your emojis have been uploaded - please allow 20 minutes for Teams to sync",
      });

      MsTeamsClient.mockImplementation(() => ({
        uploadFiles: mockUploadFiles,
      }));

      // Test data
      const mockFiles: FileDetails[] = [
        {
          name: "test.png",
          size: 1024,
          type: "image/png",
          base64: "dGVzdA==", // test in base64
        },
      ];

      const mockTokens = {
        chatsvcagg: "chat-token",
        ic3: "ic3-token",
        permissionsId: "permissions-id",
      };

      // Call the function
      const result = await handleFileProcessing(mockFiles, mockTokens);

      // Assertions
      expect(MsTeamsClient).toHaveBeenCalledWith(
        "ic3-token",
        "chat-token",
        "permissions-id",
      );
      expect(mockUploadFiles).toHaveBeenCalledWith(expect.any(Array));
      expect(result).toEqual({
        success: true,
        status:
          "Your emojis have been uploaded - please allow 20 minutes for Teams to sync",
      });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "processUpdate",
        success: true,
        status:
          "Your emojis have been uploaded - please allow 20 minutes for Teams to sync",
        error: undefined,
      });
      // Verify storage state was saved correctly
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        processingState: {
          status:
            "Your emojis have been uploaded - please allow 20 minutes for Teams to sync",
          type: "success",
        },
      });
    });

    it("should handle missing tokens", async () => {
      // Test data with missing tokens
      const mockFiles: FileDetails[] = [
        {
          name: "test.png",
          size: 1024,
          type: "image/png",
          base64: "dGVzdA==", // test in base64
        },
      ];

      const mockTokens = {
        chatsvcagg: null,
        ic3: null,
        permissionsId: null,
      };

      // Call the function
      const result = await handleFileProcessing(mockFiles, mockTokens);

      // Assertions
      expect(result).toEqual({
        success: false,
        error: "Could not find required tokens",
      });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "processUpdate",
        success: false,
        error: "Could not find required tokens",
      });
      // Verify storage state was saved correctly
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        processingState: {
          status: "Could not find required tokens",
          type: "error",
        },
      });
    });

    it("should handle upload errors", async () => {
      // Setup mock implementation to throw an error
      const mockUploadFiles = jest
        .fn()
        .mockRejectedValue(new Error("Upload failed"));

      MsTeamsClient.mockImplementation(() => ({
        uploadFiles: mockUploadFiles,
      }));

      // Test data
      const mockFiles: FileDetails[] = [
        {
          name: "test.png",
          size: 1024,
          type: "image/png",
          base64: "dGVzdA==", // test in base64
        },
      ];

      const mockTokens = {
        chatsvcagg: "chat-token",
        ic3: "ic3-token",
        permissionsId: "permissions-id",
      };

      // Call the function
      const result = await handleFileProcessing(mockFiles, mockTokens);

      // Assertions
      expect(result).toEqual({
        success: false,
        error: "Upload failed",
      });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "processUpdate",
        success: false,
        error: "Upload failed",
      });
      // Verify storage state was saved correctly
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        processingState: {
          status: "Upload failed",
          type: "error",
        },
      });
    });

    // Test that setting initial processing state works
    it("should set initial processing state on file processing", async () => {
      // Reset the mocks
      jest.clearAllMocks();

      // Create test data
      const mockFiles: FileDetails[] = [
        {
          name: "test.png",
          size: 1024,
          type: "image/png",
          base64: "dGVzdA==", // test in base64
        },
      ];

      const mockTokens = {
        chatsvcagg: "chat-token",
        ic3: "ic3-token",
        permissionsId: "permissions-id",
      };

      // Setup a mock for uploadFiles
      const mockUploadFiles = jest.fn().mockResolvedValue({
        success: true,
        status: "Test status",
      });

      MsTeamsClient.mockImplementation(() => ({
        uploadFiles: mockUploadFiles,
      }));

      // Call handleFileProcessing
      await handleFileProcessing(mockFiles, mockTokens);

      // Check if chrome.storage.local.set was called with the initial state
      // This verifies our state storage logic works properly
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          processingState: expect.objectContaining({
            status: expect.any(String),
            type: expect.any(String),
          }),
        }),
      );
    });
  });
});
