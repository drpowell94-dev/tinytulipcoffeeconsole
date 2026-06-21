/**
 * Input validation utilities for security
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function isValidISODate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.includes("T");
  } catch {
    return false;
  }
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

export function isValidLocation(location: string): boolean {
  return location.length > 0 && location.length <= 500;
}

export function isValidZipCode(zip: string): boolean {
  const zipRegex = /^\d{5}(?:-\d{4})?$/;
  return zipRegex.test(zip);
}

export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input.substring(0, maxLength).trim();
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidPositiveNumber(num: any): boolean {
  return typeof num === "number" && num > 0 && isFinite(num);
}
