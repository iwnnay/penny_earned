<script>
    import '../app.css';
    import favicon from '$lib/assets/favicon.svg';
    import { page } from '$app/state';

    /** @type {{ data: import('./$types').LayoutData, children: import('svelte').Snippet }} */
    let { data, children } = $props();

    let showBackgroundLogo = $derived(page.url.pathname !== '/login');
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

{#if showBackgroundLogo}
    <img src="/icon.svg" alt="" aria-hidden="true" class="bg-logo" />
{/if}

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
        background: var(--bg-surface);
        color: var(--text-main);
        border-bottom: 1px solid var(--border-main);
    }

    nav a {
        color: var(--primary);
        text-decoration: none;
        font-weight: 500;
    }

    nav a:hover {
        text-decoration: underline;
    }

    .user {
        margin-left: auto;
        font-size: 0.875rem;
        color: var(--text-muted);
    }

    nav button {
        background: none;
        border: 1px solid var(--border-button);
        color: var(--text-main);
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
    }

    nav button:hover {
        background: var(--border-main);
    }

    :global(body) {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: var(--bg-main);
        color: var(--text-main);
    }

    :global(*, *::before, *::after) {
        box-sizing: border-box;
    }

    .bg-logo {
        position: fixed;
        top: -50vmax;
        left: -50vmax;
        width: 150vmax;
        height: 150vmax;
        opacity: 0.04;
        pointer-events: none;
        user-select: none;
        z-index: -1;
    }
</style>
