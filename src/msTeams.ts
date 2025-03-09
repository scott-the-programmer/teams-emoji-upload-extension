import {
  TeamsUploadResponse,
  TeamsMetadataResponse,
  FileDetails,
} from "./types";

class MsTeamsClient {
  private _ic3Token: string;
  private _chatToken: string;
  private _permissionsId: string;

  constructor(ic3Token: string, chatToken: string, permissionsId: string) {
    this._ic3Token = ic3Token;
    this._chatToken = chatToken;
    this._permissionsId = permissionsId;
  }

  public async createObject(): Promise<{ id: string; msCv: string }> {
    const response = await fetch(
      "https://as-prod.asyncgw.teams.microsoft.com/v1/objects/",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this._ic3Token}`,
          "content-type": "application/json",
          accept: "application/json",
          "x-ms-client-version": "1415/25021400912",
          origin: "https://teams.microsoft.com",
          referer: "https://teams.microsoft.com/",
        },
        mode: "cors",
        body: JSON.stringify({
          type: "pish/image",
          permissions: {
            ["*:tid:" + this._permissionsId]: ["read"],
          },
          sharingMode: "Unknown",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create object: ${response.statusText}`);
    }

    const msCv = response.headers.get("ms-cv") || "";
    const data = (await response.json()) as TeamsUploadResponse;
    return { id: data.id, msCv };
  }

  public async uploadFileContent(
    documentId: string,
    msCv: string,
    file: FileDetails,
  ): Promise<void> {
    console.log("Uploading file content", file);
    var buf = Buffer.from(file.base64, "base64");
    console.log("Buffer", buf);
    const response = await fetch(
      `https://as-prod.asyncgw.teams.microsoft.com/v1/objects/${documentId}/content/imgpsh`,
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${this._ic3Token}`,
          "content-type": "application/octet-stream",
          "x-ms-client-version": "1415/25021400912",
          DNT: "1",
          origin: "https://teams.microsoft.com",
          referer: "https://teams.microsoft.com/",
          "x-ms-migration": "True",
          "x-ms-test-user": "False",
          "ms-cv": msCv,
        },
        body: buf,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to upload image: ${response.statusText} - ${errorText}`,
      );
    }
  }

  public async sendMetadata(
    documentId: string,
    msCv: string,
    shortcuts: string[],
  ): Promise<void> {
    const response = await fetch(
      "https://teams.microsoft.com/api/csa/apac/api/v1/customemoji/metadata",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this._chatToken}`,
          "content-type": "application/json",
          accept: "application/json",
          "x-ms-client-version": "1415/25021400912",
          "x-ms-client-type": "web",
          "ms-cv": msCv,
        },
        body: JSON.stringify({
          shortcuts: shortcuts,
          documentId: documentId,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create metadata: ${response.statusText}`);
    }

    const metadataData = (await response.json()) as TeamsMetadataResponse;
    console.log("Metadata:", metadataData);
  }

  public async uploadFile(file: FileDetails): Promise<void> {
    try {
      const shortcut = `${file.name.split(".")[0]}`;
      const { id: documentId, msCv } = await this.createObject();
      console.log("Document ID:", documentId);
      await this.uploadFileContent(documentId, msCv, file);
      await this.sendMetadata(documentId, msCv, [shortcut]);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }

  public async uploadFiles(
    files: FileDetails[],
  ): Promise<{ success: boolean; error?: string; status?: string }> {
    if (files.length === 0) {
      return { success: false, error: "Please select files first" };
    }

    for (const file of files) {
      await this.uploadFile(file);
    }

    return { success: true, status: "Your emojis have been uploaded" };
  }
}

export default MsTeamsClient;
