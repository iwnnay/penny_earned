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
        color: #7eb8f7;
    }

    .subtitle {
        margin: 0;
        color: #888;
        font-size: 0.875rem;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        max-width: 360px;
        background: #1a1a2e;
        padding: 2rem;
        border-radius: 8px;
        border: 1px solid #333;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.875rem;
        color: #aaa;
    }

    input {
        padding: 0.5rem 0.75rem;
        background: #0f0f1a;
        border: 1px solid #444;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 1rem;
    }

    input:focus {
        outline: none;
        border-color: #7eb8f7;
    }

    button {
        padding: 0.6rem;
        background: #7eb8f7;
        color: #0f0f1a;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
    }

    button:hover {
        background: #9ecbff;
    }

    .error {
        color: #f87171;
        margin: 0;
        font-size: 0.875rem;
    }
</style>
