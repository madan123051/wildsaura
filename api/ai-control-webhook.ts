type AiControlWebhookPayload = {
  source?: string;
  type?: string;
  sender_name?: string;
  sender_handle?: string;
  subject?: string;
  body?: string;
  metadata?: Record<string, unknown>;
};

type VercelRequestLike = {
  method?: string;
  body?: unknown;
};

type VercelResponseLike = {
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function normalizePayload(body: unknown): AiControlWebhookPayload | undefined {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return typeof parsed === 'object' && parsed !== null ? parsed as AiControlWebhookPayload : undefined;
    } catch {
      return undefined;
    }
  }

  return typeof body === 'object' && body !== null ? body as AiControlWebhookPayload : undefined;
}

function textField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeMetadata(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default async function handler(request: VercelRequestLike, response: VercelResponseLike) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.status(405).json({ ok: false, error: 'Method not allowed.' });
    return;
  }

  const baseUrl = process.env.AI_CONTROL_CENTER_URL;
  const connectorSecret = process.env.WEBSITE_CONNECTOR_SECRET;
  const payload = normalizePayload(request.body);

  if (!payload || !textField(payload.body)) {
    response.status(400).json({ ok: false, error: 'body is required.' });
    return;
  }

  if (!baseUrl || !connectorSecret) {
    console.warn('AI Control Center webhook skipped: missing server configuration.');
    response.status(202).json({ ok: true, forwarded: false, reason: 'missing_configuration' });
    return;
  }

  try {
    const forwardResponse = await fetch(`${baseUrl.replace(/\/$/, '')}/api/connectors/website`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-connector-secret': connectorSecret,
      },
      body: JSON.stringify({
        source: 'website',
        type: textField(payload.type) || 'website_message',
        sender_name: textField(payload.sender_name) || 'Website visitor',
        sender_handle: textField(payload.sender_handle),
        subject: textField(payload.subject) || 'Website message',
        body: textField(payload.body),
        metadata: {
          ...safeMetadata(payload.metadata),
          forwarded_by: 'wildsaura_server_proxy',
        },
      }),
    });

    if (!forwardResponse.ok) {
      console.warn(`AI Control Center webhook failed: ${forwardResponse.status} ${forwardResponse.statusText}`);
      response.status(202).json({ ok: true, forwarded: false, status: forwardResponse.status });
      return;
    }

    response.status(200).json({ ok: true, forwarded: true });
  } catch (error) {
    console.warn('AI Control Center webhook failed:', error);
    response.status(202).json({ ok: true, forwarded: false, reason: 'forward_error' });
  }
}
