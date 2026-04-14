<script>
    /** @type {{ 
     *    mainCategories: {name: string, account_id: number | null}[], 
     *    subcategories: {name: string, account_id: number}[],
     *    value?: string[]
     * }} */
    let { mainCategories, subcategories, value = [] } = $props();

    let tags = $state([...value]);
    let inputValue = $state('');
    let suggestions = $derived(getSuggestions(inputValue, tags));
    let highlightedIndex = $state(0);
    let showSuggestions = $state(false);
    let error = $state('');

    const allMainNames = mainCategories.map(c => c.name);

    function getSuggestions(query, currentTags) {
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();
        const allPossible = [...mainCategories.map(c => c.name), ...subcategories.map(c => c.name)];
        // Filter unique and matching
        const uniquePossible = Array.from(new Set(allPossible));
        return uniquePossible
            .filter(name => 
                name.toLowerCase().includes(lowerQuery) && 
                !currentTags.some(t => t.toLowerCase() === name.toLowerCase())
            )
            .slice(0, 5);
    }

    function addTag(tag) {
        const trimmed = tag.trim();
        if (!trimmed) return;
        
        // Check if already exists (case-insensitive)
        if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
            inputValue = '';
            showSuggestions = false;
            return;
        }

        // Limit to 4 categories total
        if (tags.length >= 4) {
            return;
        }

        tags.push(trimmed);
        inputValue = '';
        showSuggestions = false;
        highlightedIndex = 0;
        error = '';
    }

    function removeTag(index) {
        tags.splice(index, 1);
    }

    function handleKeydown(e) {
        if (e.key === 'Enter' || (e.key === ',' && inputValue.trim())) {
            e.preventDefault();
            if (showSuggestions && suggestions.length > 0) {
                addTag(suggestions[highlightedIndex]);
            } else {
                addTag(inputValue);
            }
        } else if (e.key === 'Tab' && showSuggestions && suggestions.length > 0) {
            e.preventDefault();
            addTag(suggestions[0]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!showSuggestions) {
                showSuggestions = true;
            } else {
                highlightedIndex = (highlightedIndex + 1) % suggestions.length;
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = (highlightedIndex - 1 + suggestions.length) % suggestions.length;
        } else if (e.key === 'Escape') {
            showSuggestions = false;
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    }

    function handleBlur() {
        // Delay blur to allow clicking suggestions
        setTimeout(() => {
            showSuggestions = false;
            const hasMain = tags.some(t => allMainNames.some(m => m.toLowerCase() === t.toLowerCase()));
            if (!hasMain) {
                error = 'Main category is required';
            } else {
                error = '';
            }
        }, 200);
    }

    function isMainCategory(name) {
        return allMainNames.some(m => m.toLowerCase() === name.toLowerCase());
    }
</script>

<div class="category-input-container">
    <div class="tags-input" class:has-error={!!error}>
        {#each tags as tag, i}
            <span class="tag" class:tag-main={isMainCategory(tag)}>
                {tag}
                <button type="button" onclick={() => removeTag(i)} aria-label="Remove tag">✕</button>
                <input type="hidden" name="categories" value={tag} />
            </span>
        {/each}
        <input
            type="text"
            placeholder={tags.length === 0 ? "Add category..." : ""}
            bind:value={inputValue}
            onkeydown={handleKeydown}
            onfocus={() => (showSuggestions = true)}
            onblur={handleBlur}
            autocomplete="off"
        />
    </div>

    {#if error}
        <span class="error-text">{error}</span>
    {/if}

    {#if showSuggestions && suggestions.length > 0}
        <ul class="suggestions">
            {#each suggestions as suggestion, i}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <li 
                    class:highlighted={i === highlightedIndex}
                    class:suggestion-main={isMainCategory(suggestion)}
                    onclick={() => addTag(suggestion)}
                >
                    {suggestion}
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .category-input-container {
        position: relative;
        width: 100%;
    }

    .tags-input {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.4rem;
        background: var(--bg-input);
        border: 1px solid var(--border-input);
        border-radius: 4px;
        min-height: 2.5rem;
        align-items: center;
    }

    .tags-input:focus-within {
        border-color: var(--primary);
        outline: none;
    }

    .tags-input.has-error {
        border-color: var(--danger);
    }

    .tag {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.2rem 0.5rem;
        background: var(--bg-surface-alt);
        color: var(--text-main);
        border-radius: 3px;
        font-size: 0.85rem;
    }

    .tag-main {
        font-weight: bold;
        background: var(--primary);
        color: var(--text-inverse);
    }

    .tag button {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 0;
        font-size: 0.75rem;
        opacity: 0.7;
    }

    .tag button:hover {
        opacity: 1;
    }

    input[type="text"] {
        flex: 1;
        min-width: 120px;
        border: none !important;
        background: transparent !important;
        padding: 0.2rem !important;
        color: var(--text-main);
        font-size: 0.95rem;
    }

    input[type="text"]:focus {
        outline: none;
    }

    .error-text {
        display: block;
        color: var(--danger);
        font-size: 0.75rem;
        margin-top: 0.25rem;
    }

    .suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 100;
        background: var(--bg-surface);
        border: 1px solid var(--border-input);
        border-radius: 4px;
        margin: 0.25rem 0 0;
        padding: 0;
        list-style: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        max-height: 200px;
        overflow-y: auto;
    }

    .suggestions li {
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        font-size: 0.9rem;
        color: var(--text-main);
    }

    .suggestions li.highlighted {
        background: var(--bg-surface-alt);
        color: var(--primary-alt);
    }

    .suggestion-main {
        font-weight: bold;
        color: var(--primary-alt);
    }
</style>
