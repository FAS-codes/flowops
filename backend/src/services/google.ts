import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';

export function googleClient(): OAuth2Client {
  return new OAuth2Client({
    clientId: env.google.clientId,
    clientSecret: env.google.clientSecret,
    redirectUri: env.google.callbackUrl,
  });
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

/** Builds the Google consent screen URL, carrying a signed `state` for CSRF. */
export function buildConsentUrl(state: string): string {
  return googleClient().generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });
}

/** Exchanges the authorization code for the verified Google profile. */
export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const client = googleClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) throw new Error('No id_token returned by Google');

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.google.clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) throw new Error('Incomplete Google profile');

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? payload.email.split('@')[0],
    picture: payload.picture,
  };
}
