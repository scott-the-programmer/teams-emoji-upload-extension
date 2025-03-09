import TokenStore from "../tokenStore";

// Define a global type for the test environment
declare global {
  namespace NodeJS {
    interface Global {
      chrome: any;
      localStorage: Storage;
    }
  }
}

describe("TokenStore", () => {
  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
  });

  describe("collectTokensFromStorage", () => {
    it("should collect tokens from Chrome storage", async () => {
      // Mock chrome.storage.local.get
      const mockItems = {
        "chatsvcagg-key": { secret: "chat-token" },
        "ic3.teams.office-key": {
          secret: "ic3-token",
          realm: "permissions-id",
        },
      };

      // Use window.chrome instead of global.chrome
      window.chrome = {
        storage: {
          local: {
            get: jest.fn().mockImplementation((_, callback) => {
              if (callback) {
                callback(mockItems);
              }
              return Promise.resolve(mockItems);
            }),
          },
        },
      } as any;

      const tokens = await TokenStore.collectTokensFromStorage();

      expect(chrome.storage.local.get).toHaveBeenCalled();
      expect(tokens.chatsvcagg).toBe("chat-token");
      expect(tokens.ic3).toBe("ic3-token");
      expect(tokens.permissionsId).toBe("permissions-id");
    });

    it("should handle errors when collecting tokens", async () => {
      // Mock chrome.storage.local.get to throw an error
      window.chrome = {
        storage: {
          local: {
            get: jest.fn().mockRejectedValue(new Error("Storage error")),
          },
        },
      } as any;

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const tokens = await TokenStore.collectTokensFromStorage();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get tokens from storage:",
        expect.any(Error),
      );
      expect(tokens.chatsvcagg).toBeNull();
      expect(tokens.ic3).toBeNull();
      expect(tokens.permissionsId).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe("collectTokensFromLocalStorage", () => {
    let originalLocalStorage: Storage;

    beforeEach(() => {
      // Save original localStorage
      originalLocalStorage = window.localStorage;

      // Create mock storage data
      const mockStorage: { [key: string]: string } = {
        "chatsvcagg-key": JSON.stringify({ secret: "chat-token" }),
        "ic3.teams.office-key": JSON.stringify({
          secret: "ic3-token",
          realm: "permissions-id",
        }),
      };

      // Mock localStorage
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: jest.fn((key: string) => mockStorage[key] || null),
          setItem: jest.fn((key: string, value: string) => {
            mockStorage[key] = value;
          }),
          removeItem: jest.fn((key: string) => {
            delete mockStorage[key];
          }),
          clear: jest.fn(() => {
            Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
          }),
          key: jest.fn(
            (index: number) => Object.keys(mockStorage)[index] || null,
          ),
          get length() {
            return Object.keys(mockStorage).length;
          },
        },
        writable: true,
      });
    });

    afterEach(() => {
      // Restore original localStorage
      Object.defineProperty(window, "localStorage", {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it("should collect tokens from localStorage", () => {
      const tokens = TokenStore.collectTokensFromLocalStorage();

      expect(tokens.chatsvcagg).toBe("chat-token");
      expect(tokens.ic3).toBe("ic3-token");
      expect(tokens.permissionsId).toBe("permissions-id");
    });

    it("should handle errors when accessing localStorage", () => {
      // Make localStorage throw an error
      Object.defineProperty(window, "localStorage", {
        get: () => {
          throw new Error("localStorage error");
        },
        configurable: true,
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const tokens = TokenStore.collectTokensFromLocalStorage();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error accessing localStorage:",
        expect.any(Error),
      );
      expect(tokens.chatsvcagg).toBeNull();
      expect(tokens.ic3).toBeNull();
      expect(tokens.permissionsId).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe("captureAndStoreTokens", () => {
    it("should capture tokens and store them in Chrome storage", () => {
      // Mock collectTokensFromLocalStorage
      const mockTokens = new TokenStore();
      mockTokens.chatsvcagg = "chat-token";
      mockTokens.ic3 = "ic3-token";
      mockTokens.permissionsId = "permissions-id";

      jest
        .spyOn(TokenStore, "collectTokensFromLocalStorage")
        .mockReturnValue(mockTokens);

      // Mock chrome.storage.local.set
      window.chrome = {
        storage: {
          local: {
            set: jest.fn().mockImplementation((items, callback) => {
              if (callback) callback();
              return Promise.resolve();
            }),
          },
        },
      } as any;

      TokenStore.captureAndStoreTokens();

      expect(TokenStore.collectTokensFromLocalStorage).toHaveBeenCalled();
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        {
          teams_chatsvcagg: { secret: "chat-token" },
          teams_ic3: { secret: "ic3-token", realm: "permissions-id" },
        },
        expect.any(Function),
      );
    });

    it("should handle errors during token capture and storage", () => {
      // Mock collectTokensFromLocalStorage to throw an error
      jest
        .spyOn(TokenStore, "collectTokensFromLocalStorage")
        .mockImplementation(() => {
          throw new Error("Collection error");
        });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      TokenStore.captureAndStoreTokens();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to capture and store tokens:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });
});
