<script>
	/** @type {{ form: import('./$types').ActionData }} */
	let { form } = $props();
</script>

<div class="container">
	<h1>Penny Earned</h1>

	<div class="card">
		<h2>Two-factor authentication</h2>

		<p class="notice">
			Multi-factor authentication support is coming soon. The following methods will be available:
		</p>

		<ul class="methods">
			<li>
				<span class="method-icon">🔐</span>
				<div>
					<strong>Authenticator app</strong>
					<span>Google Authenticator, Authy, 1Password, etc.</span>
				</div>
			</li>
			<li>
				<span class="method-icon">📱</span>
				<div>
					<strong>SMS verification</strong>
					<span>One-time code sent to your phone number</span>
				</div>
			</li>
		</ul>

		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}

		<a href="/login">Back to sign in</a>
	</div>
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		gap: 1.5rem;
	}

	h1 {
		margin: 0;
		font-size: 2rem;
		color: var(--primary);
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 100%;
		max-width: 360px;
		background: var(--bg-surface);
		padding: 2rem;
		border-radius: 8px;
		border: 1px solid var(--border-main);
	}

	h2 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--text-main);
	}

	.notice {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-muted);
		line-height: 1.5;
	}

	.methods {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.methods li {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg-input);
		border-radius: 6px;
		border: 1px solid var(--border-input);
	}

	.method-icon {
		font-size: 1.25rem;
		line-height: 1.4;
	}

	.methods div {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.methods strong {
		font-size: 0.875rem;
		color: var(--text-main);
	}

	.methods span {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	a {
		font-size: 0.875rem;
		color: var(--text-muted);
		text-align: center;
		text-decoration: none;
	}

	a:hover {
		color: var(--primary);
	}

	.error {
		color: var(--danger);
		margin: 0;
		font-size: 0.875rem;
	}
</style>
