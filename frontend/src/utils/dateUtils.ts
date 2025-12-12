/**
 * Format date to dd/mm/yyyy format
 * @param date - Date string, Date object, null, or undefined
 * @returns Formatted date string in dd/mm/yyyy format or '-' if invalid
 */
export const formatDateDDMMYYYY = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
};

/**
 * Convert date input value (YYYY-MM-DD) to dd/mm/yyyy format for display
 * @param dateString - Date string in YYYY-MM-DD format (from HTML date input)
 * @returns Formatted date string in dd/mm/yyyy format or empty string
 */
export const formatDateInputToDDMMYYYY = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return '';
  } catch {
    return '';
  }
};



