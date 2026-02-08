/**
 * Netlify Function: sendCampaign
 * Sends a WhatsApp Cloud API text message to each contact.
 *
 * SECURITY NOTE:
 * This function currently accepts the access token and phone number id from the client.
 * For production, store secrets in Netlify environment variables and DO NOT send them from the browser.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const accessToken = body.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = body.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const messageText = String(body.messageText || '');
    const contacts = Array.isArray(body.contacts) ? body.contacts : [];

    if (!accessToken) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing accessToken' }) };
    }
    if (!phoneNumberId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing phoneNumberId' }) };
    }
    if (!messageText.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing messageText' }) };
    }
    if (contacts.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No contacts to send' }) };
    }

    const endpoint = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    let sentCount = 0;
    let failedCount = 0;
    const failures = [];

    for (const ct of contacts) {
      const to = String(ct?.phone || '').trim();
      if (!to) {
        failedCount++;
        failures.push({ phone: '', error: 'Missing phone' });
        continue;
      }

      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: messageText },
          }),
        });

        const respText = await resp.text();
        if (!resp.ok) {
          failedCount++;
          failures.push({ phone: to, status: resp.status, body: respText.slice(0, 300) });
        } else {
          sentCount++;
        }
      } catch (err) {
        failedCount++;
        failures.push({ phone: to, error: String(err) });
      }

      await sleep(200);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ sentCount, failedCount, failures }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
