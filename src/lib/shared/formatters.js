/** @param {number} amount */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

/** @param {string} isoDate */
export function formatDate(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(
        new Date(year, month - 1, day)
    );
}

/** @param {number} rate */
export function formatPercent(rate) {
    return `${rate.toFixed(3)}%`;
}
