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
  try {
    const response = await fetch('/api/ai-control-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (!warnedMissingConfig) {
        console.warn(`AI Control Center webhook failed: ${response.status} ${response.statusText}`);
        warnedMissingConfig = true;
      }
    }
  } catch (error) {
    if (!warnedMissingConfig) {
      console.warn('AI Control Center webhook failed:', error);
      warnedMissingConfig = true;
    }
  }
}
