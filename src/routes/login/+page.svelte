<script>
	/** @type {{ data: import('./$types').PageData, form: import('./$types').ActionData }} */
	let { data, form } = $props();
</script>

<div class="container">
	<div class="brand">
		<img src="/icon.svg" alt="" class="logo" />
		<h1>Penny Earned</h1>
	</div>
	<form method="POST">
		{#if data.passwordReset}
			<p class="success">Password reset successfully. Please sign in.</p>
		{/if}
		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}
		<label>
			Email
			<input type="email" name="email" required autocomplete="email" />
		</label>
		<label>
			Password
			<input type="password" name="password" required autocomplete="current-password" />
		</label>
		<button type="submit">Sign In</button>
		<a href="/forgot-password">Forgot password?</a>
	</form>
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

	.brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.logo {
		width: 96px;
		height: 96px;
		filter: drop-shadow(0 4px 12px rgba(22, 163, 74, 0.35));
	}

	h1 {
		margin: 0;
		font-size: 2rem;
		color: var(--primary);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		max-width: 360px;
		background: var(--bg-surface);
		padding: 2rem;
		border-radius: 8px;
		border: 1px solid var(--border-main);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.875rem;
		color: var(--text-muted);
	}

	input {
		padding: 0.5rem 0.75rem;
		background: var(--bg-input);
		border: 1px solid var(--border-input);
		border-radius: 4px;
		color: var(--text-main);
		font-size: 1rem;
	}

	input:focus {
		outline: none;
		border-color: var(--primary);
	}

	button {
		padding: 0.6rem;
		background: var(--primary);
		color: var(--text-inverse);
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
	}

	button:hover {
		background: var(--primary-hover);
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

	.success {
		color: var(--text-main);
		margin: 0;
		font-size: 0.875rem;
	}
</style>
