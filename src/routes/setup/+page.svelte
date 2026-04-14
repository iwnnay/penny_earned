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
        color: #4a82a8;
    }

    .subtitle {
        margin: 0;
        color: #7a9ab5;
        font-size: 0.875rem;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        max-width: 360px;
        background: #111f30;
        padding: 2rem;
        border-radius: 8px;
        border: 1px solid #1c3348;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.875rem;
        color: #7a9ab5;
    }

    input {
        padding: 0.5rem 0.75rem;
        background: #0d1824;
        border: 1px solid #274560;
        border-radius: 4px;
        color: #c5d8e8;
        font-size: 1rem;
    }

    input:focus {
        outline: none;
        border-color: #4a82a8;
    }

    button {
        padding: 0.6rem;
        background: #4a82a8;
        color: #0d1824;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
    }

    button:hover {
        background: #5e9ac0;
    }

    .error {
        color: #a85860;
        margin: 0;
        font-size: 0.875rem;
    }
</style>
