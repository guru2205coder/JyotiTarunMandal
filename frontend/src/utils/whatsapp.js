/**
 * WhatsApp Helper Utilities for Jyoti Tarun Mandal Vargani System
 * Formats Indian phone numbers and reliably dispatches WhatsApp messages.
 */

/**
 * Formats Indian phone numbers for WhatsApp API.
 * Ensures single country code 91 prefix without duplicates or formatting characters.
 * @param {string|number} phone 
 * @returns {string} 12-digit number (e.g. 919175344556) or empty string
 */
export const cleanWhatsAppPhone = (phone) => {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';

  // Remove leading 0 if present (e.g. 09175344556)
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // If already 12 digits starting with 91, keep as-is
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  // Standard 10-digit Indian mobile number
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // If longer than 10 digits and doesn't start with 91, return raw digits
  return digits;
};

/**
 * Builds standard WhatsApp API URL.
 * If phone is provided, opens chat with that number directly.
 * If phone is empty/null, opens WhatsApp with prefilled message to select contact.
 * @param {string} phone
 * @param {string} text
 * @returns {string}
 */
export const getWhatsAppUrl = (phone, text) => {
  const encoded = encodeURIComponent(text || '');
  const cleaned = cleanWhatsAppPhone(phone);
  if (cleaned && cleaned.length >= 10) {
    return `https://api.whatsapp.com/send?phone=${cleaned}&text=${encoded}`;
  }
  return `https://api.whatsapp.com/send?text=${encoded}`;
};

/**
 * Safely opens WhatsApp in a new tab or triggers fallback anchor link
 * to prevent being blocked by popup blockers.
 * @param {string} phone
 * @param {string} text
 * @returns {string} The launched URL
 */
export const openWhatsApp = (phone, text) => {
  const url = getWhatsAppUrl(phone, text);
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      // Fallback for browsers with strict popup blockers
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (err) {
    console.warn('window.open blocked, falling back to location.href:', err);
    window.location.href = url;
  }
  return url;
};
