import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { consumeMfaChallenge, MFA_COOKIE } from '$lib/server/mfa.js';
import { createSession, COOKIE_NAME } from '$lib/server/session.js';

export function load({ cookies, locals }) {
	if (locals.user) redirect(302, '/accounts');
	// If there's no pending MFA challenge the user didn't come from a password check
	if (!cookies.get(MFA_COOKIE)) redirect(302, '/login');
	return {};
}

export const actions = {
	default: async ({ cookies }) => {
		const challengeId = cookies.get(MFA_COOKIE);
		if (!challengeId) return fail(400, { error: 'Session expired. Please sign in again.' });

		// TODO: verify the MFA code (TOTP or SMS) before calling consumeMfaChallenge.
		// Until a provider is configured this step is intentionally blocked.
		const _userId = consumeMfaChallenge(challengeId);
		cookies.delete(MFA_COOKIE, { path: '/login/mfa' });

		return fail(501, {
			error: 'Multi-factor authentication is not yet available. Contact the administrator.'
		});

		// When MFA is implemented, replace the block above with:
		// if (!_userId) return fail(400, { error: 'Session expired. Please sign in again.' });
		// const token = createSession(_userId);
		// cookies.set(COOKIE_NAME, token, { path: '/', httpOnly: true, sameSite: 'strict', secure: !dev, maxAge: 30 * 24 * 60 * 60 });
		// redirect(302, '/accounts');
	}
};
