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
        background: #1a1a2e;
        color: #eee;
        border-bottom: 1px solid #333;
    }

    nav a {
        color: #7eb8f7;
        text-decoration: none;
        font-weight: 500;
    }

    nav a:hover {
        text-decoration: underline;
    }

    .user {
        margin-left: auto;
        font-size: 0.875rem;
        color: #aaa;
    }

    nav button {
        background: none;
        border: 1px solid #555;
        color: #ccc;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
    }

    nav button:hover {
        background: #333;
    }

    :global(body) {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: #0f0f1a;
        color: #e0e0e0;
    }

    :global(*, *::before, *::after) {
        box-sizing: border-box;
    }
</style>
