import { DriveConfig } from '../types';

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const SHEET_MIME = 'application/vnd.google-apps.spreadsheet';

interface DriveFileBody {
    name: string;
    mimeType: string;
    parents?: string[];
}

export const initializeDriveStructure = async (accessToken: string): Promise<DriveConfig> => {
  try {
    // 1. Root: sistema-gestion-cobros
    let rootId = await findFile(accessToken, `name = 'sistema-gestion-cobros' and mimeType = '${FOLDER_MIME}' and trashed = false`);
    if (!rootId) rootId = await createFile(accessToken, 'sistema-gestion-cobros', FOLDER_MIME);

    // 2. Subfolders
    let cobrosId = await findFile(accessToken, `name = 'cobros' and '${rootId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`);
    if (!cobrosId) cobrosId = await createFile(accessToken, 'cobros', FOLDER_MIME, [rootId]);

    let ingresosId = await findFile(accessToken, `name = 'ingresos' and '${rootId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`);
    if (!ingresosId) ingresosId = await createFile(accessToken, 'ingresos', FOLDER_MIME, [rootId]);

    // 3. Sheet Global
    let sheetId = await findFile(accessToken, `name = 'registro-general-cobros' and '${rootId}' in parents and mimeType = '${SHEET_MIME}' and trashed = false`);
    if (!sheetId) {
      sheetId = await createFile(accessToken, 'registro-general-cobros', SHEET_MIME, [rootId]);
      await initializeSheetFormat(accessToken, sheetId);
    }

    return { rootId, cobrosId, ingresosId, sheetId };
  } catch (error) {
    console.error('FATAL: Drive Initialization Failed', error);
    throw new Error('No se pudo inicializar la estructura de Google Drive. Verifique permisos.');
  }
};

export const uploadFileToDrive = async (token: string, file: File, folderId: string): Promise<{ id: string, link: string }> => {
  // Sanitize filename to avoid weird character issues
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const metadata = { name: `${Date.now()}_${safeName}`, parents: [folderId] };
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  try {
    // 1. Upload - CRITICAL FIX: Request thumbnailLink for direct image access
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Drive Upload Failed: ${err.error?.message || res.statusText}`);
    }
    
    const data = await res.json();
    const fileId = data.id;

    // 2. SET PERMISSIONS
    try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
          })
        });
    } catch (permError) {
        console.warn("Permission Warning: Could not set public permission on file.", permError);
    }

    // GOLD FIX: Use thumbnailLink modified to high-res (=s1024) for direct image rendering.
    // webViewLink is an HTML page (not safe for <img src>).
    // If thumbnailLink is missing (non-image files), fallback to webViewLink.
    let finalLink = data.webViewLink;
    if (data.thumbnailLink) {
        // Replace default size (=s220) with high res (=s2048)
        finalLink = data.thumbnailLink.replace(/=s\d+$/, '=s2048');
    }

    return { id: fileId, link: finalLink };
  } catch (error) {
      console.error("Upload Error:", error);
      throw error;
  }
};

// Helpers
async function findFile(token: string, q: string): Promise<string | null> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

async function createFile(token: string, name: string, mimeType: string, parents?: string[]): Promise<string> {
  const body: DriveFileBody = { name, mimeType };
  if (parents) body.parents = parents;
  
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Create file failed');
  const data = await res.json();
  return data.id;
}

async function initializeSheetFormat(token: string, sheetId: string) {
  const requests = [
    {
      updateCells: {
        rows: [
          {
            values: [
                { userEnteredValue: { stringValue: "Fecha" } },
                { userEnteredValue: { stringValue: "ID Usuario" } },
                { userEnteredValue: { stringValue: "Nombre Usuario" } },
                { userEnteredValue: { stringValue: "Tipo" } },
                { userEnteredValue: { stringValue: "Cobrado" } },
                { userEnteredValue: { stringValue: "Ingresado" } },
                { userEnteredValue: { stringValue: "Diferencia" } },
                { userEnteredValue: { stringValue: "Evidencia (Link)" } },
                { userEnteredValue: { stringValue: "Observaciones" } }
            ]
          },
          {
             values: [
                { userEnteredValue: { stringValue: "TOTALES ->" } },
                {}, {}, {},
                { userEnteredValue: { formulaValue: "=SUM(E3:E)" } },
                { userEnteredValue: { formulaValue: "=SUM(F3:F)" } },
                { userEnteredValue: { formulaValue: "=SUM(G3:G)" } },
                {}, {}
             ]
          }
        ],
        fields: "userEnteredValue",
        start: { sheetId: 0, rowIndex: 0, columnIndex: 0 }
      }
    },
    {
        updateSheetProperties: {
            properties: {
                sheetId: 0,
                gridProperties: { frozenRowCount: 2 }
            },
            fields: "gridProperties.frozenRowCount"
        }
    },
    {
        repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 2 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold"
        }
    }
  ];
  
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests })
  });
}