<script>
	/** @type {{ data: import('./$types').PageData, form: import('./$types').ActionData }} */
	let { data, form } = $props();
</script>

<div class="container">
	<h1>Penny Earned</h1>

	{#if data.invalid}
		<div class="card">
			<p class="error-msg">This reset link is invalid or has expired.</p>
			<a href="/forgot-password">Request a new link</a>
		</div>
	{:else}
		<form method="POST" class="card">
			<h2>Choose a new password</h2>
			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}
			<label>
				New password
				<input type="password" name="password" required autocomplete="new-password" minlength="8" />
			</label>
			<label>
				Confirm new password
				<input type="password" name="confirm" required autocomplete="new-password" minlength="8" />
			</label>
			<button type="submit">Reset password</button>
		</form>
	{/if}
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
		gap: 1rem;
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

	.error-msg {
		color: var(--text-muted);
		margin: 0;
		font-size: 0.875rem;
	}
</style>
