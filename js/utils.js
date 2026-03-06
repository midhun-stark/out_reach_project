// utils.js — Helper utilities

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitWords(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
}

function threeDigitWords(n) {
    if (n >= 100) {
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigitWords(n % 100) : '');
    }
    return twoDigitWords(n);
}

/**
 * Convert a number to Indian system words (up to 99,99,999)
 * e.g. 12500 → "Twelve Thousand Five Hundred Only"
 */
function numberToWords(amount) {
    const num = Math.floor(amount);
    if (num === 0) return 'Zero Only';

    let result = '';

    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;

    if (crore > 0) result += threeDigitWords(crore) + ' Crore ';
    if (lakh > 0) result += threeDigitWords(lakh) + ' Lakh ';
    if (thousand > 0) result += threeDigitWords(thousand) + ' Thousand ';
    if (remainder > 0) result += threeDigitWords(remainder);

    return result.trim() + ' Only';
}

/**
 * Format a date as DD/MM/YYYY
 */
function formatDate(date = new Date()) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Format date for input type="date" value (YYYY-MM-DD)
 */
function toInputDate(date = new Date()) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

/**
 * Parse YYYY-MM-DD input back to display format
 */
function inputToDisplay(inputVal) {
    if (!inputVal) return '';
    const [y, m, dd] = inputVal.split('-');
    return `${dd}/${m}/${y}`;
}

/**
 * Generate zero-padded bill number string
 */
function generateBillNumber(lastNum = 0) {
    return String(lastNum + 1).padStart(4, '0');
}

/**
 * Debounce a function
 */
function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('toast--visible'), 10);
    setTimeout(() => {
        toast.classList.remove('toast--visible');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
