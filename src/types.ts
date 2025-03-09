export interface ProcessResult {
  success: boolean;
  error?: string;
  status?: string;
}

export interface TeamsUploadResponse {
  id: string;
}

export interface TeamsMetadataResponse {
  success: boolean;
}

export interface FileDetails {
  name: string;
  size: number;
  type: string;
  base64: string;
}
