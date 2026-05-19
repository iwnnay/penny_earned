<script>
    /** @type {{ form: import('./$types').ActionData }} */
    let { form } = $props();
</script>

<div class="container">
    <h1>Create Account</h1>
    <p class="subtitle">First-time setup — create your login credentials.</p>
    <form method="POST">
        {#if form?.error}
            <p class="error">{form.error}</p>
        {/if}
        <label>
            Email
            <input type="email" name="email" required autocomplete="email" />
        </label>
        <label>
            Password
            <input type="password" name="password" required autocomplete="new-password" />
        </label>
        <label>
            Confirm Password
            <input type="password" name="confirm" required autocomplete="new-password" />
        </label>
        <button type="submit">Create Account</button>
    </form>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        gap: 0.75rem;
    }

    h1 {
        margin: 0;
        font-size: 2rem;
        color: var(--primary);
    }

    .subtitle {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.875rem;
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

    .error {
        color: var(--danger);
        margin: 0;
        font-size: 0.875rem;
    }
</style>
