import MsTeamsClient from "../msTeams";
import { FileDetails } from "../types";

// Mock fetch
window.fetch = jest.fn();

describe("MsTeamsClient", () => {
  let client: MsTeamsClient;
  const mockIc3Token = "mock-ic3-token";
  const mockChatToken = "mock-chat-token";
  const mockPermissionsId = "mock-permissions-id";

  beforeEach(() => {
    client = new MsTeamsClient(mockIc3Token, mockChatToken, mockPermissionsId);
    (fetch as jest.Mock).mockClear();
  });

  describe("createObject", () => {
    it("should create an object and return its ID", async () => {
      const mockResponse = {
        id: "mock-document-id",
        headers: {
          get: jest.fn().mockReturnValue("mock-cv"),
        },
        ok: true,
        json: async () => ({ id: "mock-document-id" }),
      };
      (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      // @ts-ignore - accessing private method for testing
      const result = await client.createObject();

      expect(result).toEqual({
        id: "mock-document-id",
        msCv: "mock-cv",
      });
      expect(fetch).toHaveBeenCalledWith(
        "https://as-prod.asyncgw.teams.microsoft.com/v1/objects/",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            authorization: `Bearer ${mockIc3Token}`,
          }),
          body: expect.any(String),
        }),
      );
    });

    it("should throw an error if the request fails", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
      });

      // @ts-ignore - accessing private method for testing
      await expect(client.createObject()).rejects.toThrow(
        "Failed to create object: Unauthorized",
      );
    });
  });

  describe("uploadFileContent", () => {
    it("should upload file content successfully", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      const mockFile: FileDetails = {
        name: "test.png",
        size: 1024,
        type: "image/png",
        base64: "dGVzdA==", // test in base64
      };

      // @ts-ignore - accessing private method for testing
      await expect(
        client.uploadFileContent("mock-document-id", "mock-cv", mockFile),
      ).resolves.not.toThrow();

      expect(fetch).toHaveBeenCalledWith(
        "https://as-prod.asyncgw.teams.microsoft.com/v1/objects/mock-document-id/content/imgpsh",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            authorization: `Bearer ${mockIc3Token}`,
          }),
        }),
      );
    });

    it("should throw an error if the upload fails", async () => {
      const mockResponse = {
        ok: false,
        statusText: "Bad Request",
        text: async () => "Invalid file format",
      };
      (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const mockFile: FileDetails = {
        name: "test.png",
        size: 1024,
        type: "image/png",
        base64: "dGVzdA==", // test in base64
      };

      // @ts-ignore - accessing private method for testing
      await expect(
        client.uploadFileContent("mock-document-id", "mock-cv", mockFile),
      ).rejects.toThrow(
        "Failed to upload image: Bad Request - Invalid file format",
      );
    });
  });

  describe("sendMetadata", () => {
    it("should send metadata successfully", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ success: true }),
      };
      (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      // @ts-ignore - accessing private method for testing
      await expect(
        client.sendMetadata("mock-document-id", "mock-cv", ["test"]),
      ).resolves.not.toThrow();

      expect(fetch).toHaveBeenCalledWith(
        "https://teams.microsoft.com/api/csa/apac/api/v1/customemoji/metadata",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            authorization: `Bearer ${mockChatToken}`,
          }),
          body: JSON.stringify({
            shortcuts: ["test"],
            documentId: "mock-document-id",
          }),
        }),
      );
    });

    it("should throw an error if sending metadata fails", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
      });

      // @ts-ignore - accessing private method for testing
      await expect(
        client.sendMetadata("mock-document-id", "mock-cv", ["test"]),
      ).rejects.toThrow("Failed to create metadata: Bad Request");
    });
  });

  describe("uploadFile", () => {
    it("should upload a file successfully", async () => {
      // Mock the private methods
      const createObjectMock = jest
        .fn()
        .mockResolvedValue({ id: "mock-document-id", msCv: "mock-cv" });
      const uploadFileContentMock = jest.fn().mockResolvedValue(undefined);
      const sendMetadataMock = jest.fn().mockResolvedValue(undefined);

      // @ts-ignore - replacing private methods for testing
      client.createObject = createObjectMock;
      // @ts-ignore
      client.uploadFileContent = uploadFileContentMock;
      // @ts-ignore
      client.sendMetadata = sendMetadataMock;

      const mockFile: FileDetails = {
        name: "test.png",
        size: 1024,
        type: "image/png",
        base64: "dGVzdA==", // test in base64
      };

      await client.uploadFile(mockFile);

      expect(createObjectMock).toHaveBeenCalled();
      expect(uploadFileContentMock).toHaveBeenCalledWith(
        "mock-document-id",
        "mock-cv",
        mockFile,
      );
      expect(sendMetadataMock).toHaveBeenCalledWith(
        "mock-document-id",
        "mock-cv",
        ["test"],
      );
    });

    it("should handle errors during upload", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Upload failed");
      // Mock createObject to throw an error
      // @ts-ignore - replacing private method for testing
      client.createObject = jest.fn().mockRejectedValue(error);

      const mockFile: FileDetails = {
        name: "test.png",
        size: 1024,
        type: "image/png",
        base64: "dGVzdA==",
      };

      await client.uploadFile(mockFile);

      expect(consoleSpy).toHaveBeenCalledWith("Error uploading file:", error);
      consoleSpy.mockRestore();
    });
  });

  describe("uploadFiles", () => {
    it("should return an error if no files are provided", async () => {
      const result = await client.uploadFiles([]);
      expect(result).toEqual({
        success: false,
        error: "Please select files first",
      });
    });

    it("should upload multiple files successfully", async () => {
      const uploadFileSpy = jest
        .spyOn(client, "uploadFile")
        .mockResolvedValue();

      const mockFiles: FileDetails[] = [
        {
          name: "test1.png",
          size: 1024,
          type: "image/png",
          base64: "dGVzdA==",
        },
        {
          name: "test2.png",
          size: 2048,
          type: "image/png",
          base64: "dGVzdA==",
        },
      ];

      const result = await client.uploadFiles(mockFiles);

      expect(uploadFileSpy).toHaveBeenCalledTimes(2);
      expect(uploadFileSpy).toHaveBeenCalledWith(mockFiles[0]);
      expect(uploadFileSpy).toHaveBeenCalledWith(mockFiles[1]);
      expect(result).toEqual({
        success: true,
        status: "Your emojis have been uploaded",
      });

      uploadFileSpy.mockRestore();
    });
  });
});
