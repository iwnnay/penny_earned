<script>
    import favicon from '$lib/assets/favicon.svg';

    /** @type {{ data: import('./$types').LayoutData, children: import('svelte').Snippet }} */
    let { data, children } = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
    <nav>
        <a href="/accounts">Accounts</a>
        <span class="user">{data.user.email}</span>
        <form method="POST" action="/logout">
            <button type="submit">Logout</button>
        </form>
    </nav>
{/if}

{@render children()}

<style>
    nav {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1.5rem;
        background: #111f30;
        color: #c5d8e8;
        border-bottom: 1px solid #1c3348;
    }

    nav a {
        color: #4a82a8;
        text-decoration: none;
        font-weight: 500;
    }

    nav a:hover {
        text-decoration: underline;
    }

    .user {
        margin-left: auto;
        font-size: 0.875rem;
        color: #7a9ab5;
    }

    nav button {
        background: none;
        border: 1px solid #2e5270;
        color: #a0bcd0;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
    }

    nav button:hover {
        background: #1c3348;
    }

    :global(body) {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: #0d1824;
        color: #c5d8e8;
    }

    :global(*, *::before, *::after) {
        box-sizing: border-box;
    }
</style>
