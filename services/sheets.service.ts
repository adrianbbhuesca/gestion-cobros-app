import { RecordData } from '../types';

export const appendRowToSheet = async (token: string, sheetId: string, data: RecordData) => {
  // PROD FIX: Enviamos la URL cruda en lugar de una fórmula =HYPERLINK().
  // Razón: Las fórmulas dependen de la configuración regional (ES usa ';', US usa ',').
  // Al enviar la URL cruda, Sheets detecta automáticamente el enlace y funciona en TODOS los países sin romper la celda.
  const evidenciaValue = data.imageUrl ? data.imageUrl : "SIN EVIDENCIA";

  const values = [[
    data.fecha,
    data.userId,
    data.userName,
    data.type.toUpperCase(),
    data.cobrado,
    data.ingresado,
    data.diferencia,
    evidenciaValue,
    data.observaciones
  ]];

  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values })
    });

    if (!res.ok) {
        const errData = await res.json();
        console.error('Google Sheets API Error:', errData);
        
        // Mapeo de errores comunes para feedback al usuario
        const msg = errData.error?.message || res.statusText;
        if (msg.includes('insufficient permissions') || res.status === 403) {
            throw new Error('Permisos insuficientes en Sheets. Contacta al administrador.');
        }
        if (res.status === 404) {
             throw new Error('Hoja de cálculo no encontrada. Revisa tu configuración de Drive.');
        }
        
        throw new Error(`Error Sheets (${res.status}): ${msg}`);
    }
  } catch (error) {
    // Log técnico crítico, re-lanzamos para que el UI muestre el Toast
    console.error('Critical Error appending to Sheet:', error);
    throw error;
  }
};

export const getExportUrl = (sheetId: string) => 
  `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;