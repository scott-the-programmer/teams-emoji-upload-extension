class TokenStore {
  chatsvcagg: string | null = null;
  ic3: string | null = null;
  permissionsId: string | null = null;

  static async collectTokensFromStorage(): Promise<TokenStore> {
    const tokens = new TokenStore();

    try {
      const items = await chrome.storage.local.get(null); // Get all items
      console.log("Items from chrome.storage:", items);

      for (const [key, value] of Object.entries(items)) {
        try {
          const obj = typeof value === "string" ? JSON.parse(value) : value;

          if (key.includes("chatsvcagg")) {
            tokens.chatsvcagg = obj.secret;
          }
          if (key.includes("ic3.teams.office")) {
            tokens.ic3 = obj.secret;
            tokens.permissionsId = obj.realm;
          }
          if (tokens.chatsvcagg && tokens.ic3) {
            break;
          }
        } catch (e) {
          console.error(`Failed to parse storage item: ${key}`, e);
        }
      }
    } catch (e) {
      console.error("Failed to get tokens from storage:", e);
    }

    return tokens;
  }

  static collectTokensFromLocalStorage(): TokenStore {
    const tokens = new TokenStore();

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        try {
          const value = localStorage.getItem(key);
          if (!value) continue;

          const obj = JSON.parse(value);
          if (key.includes("chatsvcagg")) {
            tokens.chatsvcagg = obj.secret;
          }
          if (key.includes("ic3.teams.office")) {
            tokens.ic3 = obj.secret;
            tokens.permissionsId = obj.realm;
          }
          if (tokens.chatsvcagg && tokens.ic3) {
            break;
          }
        } catch (e) {
          console.error(`Failed to parse localStorage item: ${key}`, e);
        }
      }
    } catch (e) {
      console.error("Error accessing localStorage:", e);
    }

    return tokens;
  }

  static captureAndStoreTokens(): void {
    try {
      const tokens = TokenStore.collectTokensFromLocalStorage();
      if (tokens.chatsvcagg && tokens.ic3) {
        // Store the tokens in Chrome storage for later use
        chrome.storage.local.set(
          {
            teams_chatsvcagg: { secret: tokens.chatsvcagg },
            teams_ic3: { secret: tokens.ic3, realm: tokens.permissionsId },
          },
          () => {
            console.log("Teams tokens saved to Chrome storage");
          },
        );
      }
    } catch (e) {
      console.error("Failed to capture and store tokens:", e);
    }
  }
}

export default TokenStore;
