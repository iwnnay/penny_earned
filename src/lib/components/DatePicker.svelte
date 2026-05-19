<script>
    import flatpickr from 'flatpickr';
    import 'flatpickr/dist/flatpickr.min.css';

    /**
     * @type {{
     *   name: string,
     *   value?: string,
     *   required?: boolean,
     *   placeholder?: string
     * }}
     */
    let { name, value = '', required = false, placeholder = 'mm/dd/yyyy' } = $props();

    /** @type {HTMLInputElement} */
    let hiddenInput;
    /** @type {HTMLInputElement} */
    let displayInput;
    /** @type {ReturnType<typeof flatpickr> | null} */
    let fp = null;

    $effect(() => {
        // Parse YYYY-MM-DD to a Date object so flatpickr never tries to
        // interpret the ISO string against the display dateFormat (m/d/Y).
        // The T00:00:00 suffix prevents UTC-midnight becoming the previous day.
        const defaultDate = value ? new Date(value + 'T00:00:00') : undefined;

        fp = flatpickr(displayInput, {
            dateFormat: 'm/d/Y',
            allowInput: true,
            defaultDate,
            onChange([date]) {
                if (date) {
                    // Store as YYYY-MM-DD for the server
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    hiddenInput.value = `${y}-${m}-${d}`;
                } else {
                    hiddenInput.value = '';
                }
            },
        });

        return () => {
            fp?.destroy();
        };
    });
</script>

<!-- Hidden input carries the YYYY-MM-DD value submitted with the form -->
<input type="hidden" bind:this={hiddenInput} {name} value={value} {required} />

<!-- Visible flatpickr-enhanced input -->
<input
    type="text"
    bind:this={displayInput}
    class="date-input"
    {placeholder}
    aria-label={name}
/>

<style>
    .date-input {
        cursor: text;
    }

    /* Override flatpickr calendar to match the dark theme */
    :global(.flatpickr-calendar) {
        background: var(--bg-surface);
        border: 1px solid var(--border-main);
        border-radius: 6px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        color: var(--text-main);
    }

    :global(.flatpickr-months) {
        background: var(--bg-surface-alt);
        border-radius: 6px 6px 0 0;
        padding: 0.25rem 0;
    }

    :global(.flatpickr-month) {
        color: var(--text-main);
        fill: var(--text-main);
    }

    :global(.flatpickr-current-month input.cur-year),
    :global(.flatpickr-current-month .numInputWrapper),
    :global(.flatpickr-current-month .flatpickr-monthDropdown-months) {
        color: var(--text-main);
        background: transparent;
    }

    :global(.flatpickr-current-month .flatpickr-monthDropdown-months option) {
        background: var(--bg-surface);
        color: var(--text-main);
    }

    :global(.flatpickr-prev-month svg),
    :global(.flatpickr-next-month svg) {
        fill: var(--text-muted);
    }

    :global(.flatpickr-prev-month:hover svg),
    :global(.flatpickr-next-month:hover svg) {
        fill: var(--primary);
    }

    :global(.flatpickr-weekdays) {
        background: var(--bg-surface-alt);
    }

    :global(span.flatpickr-weekday) {
        background: var(--bg-surface-alt);
        color: var(--text-muted);
        font-weight: 500;
    }

    :global(.flatpickr-days) {
        border-color: var(--border-main);
    }

    :global(.flatpickr-day) {
        color: var(--text-main);
        border-radius: 4px;
    }

    :global(.flatpickr-day:hover) {
        background: var(--bg-surface-alt);
        border-color: var(--bg-surface-alt);
    }

    :global(.flatpickr-day.selected),
    :global(.flatpickr-day.selected:hover) {
        background: var(--primary);
        border-color: var(--primary);
        color: var(--text-inverse);
        font-weight: 600;
    }

    :global(.flatpickr-day.today) {
        border-color: var(--primary);
        color: var(--primary);
    }

    :global(.flatpickr-day.today:hover) {
        background: var(--bg-surface-alt);
        color: var(--primary);
    }

    :global(.flatpickr-day.flatpickr-disabled),
    :global(.flatpickr-day.prevMonthDay),
    :global(.flatpickr-day.nextMonthDay) {
        color: var(--border-input); /* Using border-input as a "deemphasized" color */
    }

    :global(.numInputWrapper:hover) {
        background: var(--bg-surface-alt);
    }

    :global(.numInputWrapper span) {
        border-color: var(--border-main);
    }

    :global(.numInputWrapper span svg path) {
        fill: var(--text-muted);
    }
</style>
