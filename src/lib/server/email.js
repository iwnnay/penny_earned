import { dev } from '$app/environment';

/**
 * Low-level send. Replace this implementation with your email provider.
 * Recommended providers: Resend (resend.com), SendGrid, AWS SES, Postmark.
 *
 * Example with Resend:
 *   import { Resend } from 'resend';
 *   const resend = new Resend(process.env.RESEND_API_KEY);
 *   await resend.emails.send({ from: 'noreply@yourdomain.com', to, subject, html });
 */
async function send({ to, subject, text, html }) {
	if (dev) {
		console.log(`\n[EMAIL] To: ${to}`);
		console.log(`[EMAIL] Subject: ${subject}`);
		console.log(`[EMAIL] ${text ?? html}\n`);
		return;
	}

	// TODO: plug in your email provider here before going to production
	throw new Error(
		'Email sending is not configured. Add your provider in src/lib/server/email.js'
	);
}

export async function sendPasswordResetEmail(to, resetUrl) {
	await send({
		to,
		subject: 'Reset your Penny Earned password',
		text: `Click the link below to reset your password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
		html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`
	});
}
