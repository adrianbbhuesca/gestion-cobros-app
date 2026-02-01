export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR', // Ajustable a la moneda local
  }).format(amount);
};

export const getCurrentDateTime = (): string => {
  return new Date().toISOString();
};

// CRITICO: Genera fecha YYYY-MM-DD basada en la hora LOCAL del usuario, no UTC.
// Esto evita que "Hoy" (20:00 PM) se convierta en "Mañana" (01:00 AM UTC).
export const getLocalISODate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};