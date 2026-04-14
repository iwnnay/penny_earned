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
        background: #1a1a2e;
        border: 1px solid #444;
        border-radius: 6px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        color: #e0e0e0;
    }

    :global(.flatpickr-months) {
        background: #12122a;
        border-radius: 6px 6px 0 0;
        padding: 0.25rem 0;
    }

    :global(.flatpickr-month) {
        color: #e0e0e0;
        fill: #e0e0e0;
    }

    :global(.flatpickr-current-month input.cur-year),
    :global(.flatpickr-current-month .numInputWrapper),
    :global(.flatpickr-current-month .flatpickr-monthDropdown-months) {
        color: #e0e0e0;
        background: transparent;
    }

    :global(.flatpickr-current-month .flatpickr-monthDropdown-months option) {
        background: #1a1a2e;
        color: #e0e0e0;
    }

    :global(.flatpickr-prev-month svg),
    :global(.flatpickr-next-month svg) {
        fill: #aaa;
    }

    :global(.flatpickr-prev-month:hover svg),
    :global(.flatpickr-next-month:hover svg) {
        fill: #7eb8f7;
    }

    :global(.flatpickr-weekdays) {
        background: #12122a;
    }

    :global(span.flatpickr-weekday) {
        background: #12122a;
        color: #666;
        font-weight: 500;
    }

    :global(.flatpickr-days) {
        border-color: #333;
    }

    :global(.flatpickr-day) {
        color: #e0e0e0;
        border-radius: 4px;
    }

    :global(.flatpickr-day:hover) {
        background: #2a2a4a;
        border-color: #2a2a4a;
    }

    :global(.flatpickr-day.selected),
    :global(.flatpickr-day.selected:hover) {
        background: #7eb8f7;
        border-color: #7eb8f7;
        color: #0f0f1a;
        font-weight: 600;
    }

    :global(.flatpickr-day.today) {
        border-color: #7eb8f7;
        color: #7eb8f7;
    }

    :global(.flatpickr-day.today:hover) {
        background: #2a2a4a;
        color: #7eb8f7;
    }

    :global(.flatpickr-day.flatpickr-disabled),
    :global(.flatpickr-day.prevMonthDay),
    :global(.flatpickr-day.nextMonthDay) {
        color: #444;
    }

    :global(.numInputWrapper:hover) {
        background: #2a2a4a;
    }

    :global(.numInputWrapper span) {
        border-color: #444;
    }

    :global(.numInputWrapper span svg path) {
        fill: #aaa;
    }
</style>
