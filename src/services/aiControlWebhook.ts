type AiControlWebhookPayload = {
  source: 'website';
  type: string;
  sender_name?: string;
  sender_handle?: string;
  subject?: string;
  body?: string;
  metadata?: Record<string, unknown>;
};

let warnedMissingConfig = false;

export async function sendToAiControlCenter(payload: AiControlWebhookPayload): Promise<void> {
  const baseUrl = import.meta.env.VITE_AI_CONTROL_CENTER_URL;
  const connectorSecret = import.meta.env.VITE_WEBSITE_CONNECTOR_SECRET;

  if (!baseUrl || !connectorSecret) {
    if (!warnedMissingConfig) {
      console.warn('AI Control Center webhook skipped: missing connector configuration.');
      warnedMissingConfig = true;
    }
    return;
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/connectors/website`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-connector-secret': connectorSecret,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`AI Control Center webhook failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.warn('AI Control Center webhook failed:', error);
  }
}
