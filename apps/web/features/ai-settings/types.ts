export interface AiSettings {
  systemPrompt: string | null;
}

export interface UpdateAiSettingsData {
  systemPrompt: string | null;
}

export interface AiSettingsResponse {
  message: string;
  settings: AiSettings;
}

export interface AiSettingsFormValues {
  systemPrompt: string;
}
