import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

const MS_GRAPH_API = 'https://graph.microsoft.com/v1.0';

@Injectable()
export class OutlookService {
  // In production, store tokens in DB per user/admin
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  // Step 1: Generate OAuth2 URL for user to connect their account
  getAuthUrl(redirectUri: string) {
    const clientId = process.env.MS_CLIENT_ID;
    const tenant = process.env.MS_TENANT_ID || 'common';
    const scopes = encodeURIComponent('offline_access Mail.Send Mail.Read');
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${scopes}`;
  }

  // Step 2: Exchange code for tokens
  async exchangeCodeForToken(code: string, redirectUri: string) {
    const clientId = process.env.MS_CLIENT_ID;
    const clientSecret = process.env.MS_CLIENT_SECRET;
    const tenant = process.env.MS_TENANT_ID || 'common';
    const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId!);
    params.append('scope', 'offline_access Mail.Send Mail.Read');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');
    params.append('client_secret', clientSecret!);
    const res = await axios.post(url, params);
    this.accessToken = res.data.access_token;
    this.refreshToken = res.data.refresh_token;
    return res.data;
  }

  // Step 3: Use access token to send email
  async sendMail(to: string, subject: string, text: string) {
    if (!this.accessToken) throw new UnauthorizedException('Outlook not connected');
    const res = await axios.post(
      `${MS_GRAPH_API}/me/sendMail`,
      {
        message: {
          subject,
          body: { contentType: 'Text', content: text },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: 'true',
      },
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );
    return res.data;
  }

  // Step 4: Refresh token if needed (not shown: implement token expiry check)
  async refreshAccessToken(redirectUri: string) {
    const clientId = process.env.MS_CLIENT_ID;
    const clientSecret = process.env.MS_CLIENT_SECRET;
    const tenant = process.env.MS_TENANT_ID || 'common';
    const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId!);
    params.append('scope', 'offline_access Mail.Send Mail.Read');
    params.append('refresh_token', this.refreshToken!);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'refresh_token');
    params.append('client_secret', clientSecret!);
    const res = await axios.post(url, params);
    this.accessToken = res.data.access_token;
    this.refreshToken = res.data.refresh_token;
    return res.data;
  }

  // Step 5: Get connection status
  isConnected() {
    return !!this.accessToken;
  }
}
