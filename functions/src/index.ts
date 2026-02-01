import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";

initializeApp();
const db = getFirestore();

/**
 * CONFIGURACIÓN
 * ------------------
 * Define estos valores como variables de entorno:
 *
 * firebase functions:config:set drive.root_folder_id="XXXX"
 *
 * O usa process.env directamente si lo prefieres
 */
const DRIVE_ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID;

// ---------- Google Drive Client ----------
function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({
    version: "v3",
    auth,
  });
}

// ---------- Helper: crear carpeta ----------
async function createFolder(
  drive: any,
  name: string,
  parentId: string
): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  if (!res.data.id) {
    throw new Error("No se pudo crear la carpeta en Drive");
  }

  return res.data.id;
}

// ---------- Cloud Function ----------
export const createDriveFoldersForRecord = onCall(
  { region: "us-central1" },
  async (request) => {
    const auth = request.auth;
    const { recordId } = request.data;

    if (!auth) {
      throw new HttpsError("unauthenticated", "Usuario no autenticado");
    }

    if (!recordId) {
      throw new HttpsError("invalid-argument", "recordId es requerido");
    }

    if (!DRIVE_ROOT_FOLDER_ID) {
      throw new HttpsError(
        "failed-precondition",
        "DRIVE_ROOT_FOLDER_ID no configurado"
      );
    }

    const recordRef = db.collection("records").doc(recordId);
    const recordSnap = await recordRef.get();

    if (!recordSnap.exists) {
      throw new HttpsError("not-found", "El record no existe");
    }

    const record = recordSnap.data();

    if (record?.userId !== auth.uid) {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    // Idempotencia: si ya existe carpeta, no hacemos nada
    if (record?.driveFolderId) {
      return {
        driveFolderId: record.driveFolderId,
        alreadyExists: true,
      };
    }

    const tipo: "cobro" | "ingreso" = record.tipo;
    if (!tipo || !["cobro", "ingreso"].includes(tipo)) {
      throw new HttpsError(
        "invalid-argument",
        "Tipo de record inválido"
      );
    }

    const drive = getDriveClient();

    try {
      // 1️⃣ carpeta cobros / ingresos
      const tipoFolderId = await createFolder(
        drive,
        tipo === "cobro" ? "cobros" : "ingresos",
        DRIVE_ROOT_FOLDER_ID
      );

      // 2️⃣ carpeta del record
      const recordFolderId = await createFolder(
        drive,
        recordId,
        tipoFolderId
      );

      // 3️⃣ actualizar Firestore
      await recordRef.update({
        driveFolderId: recordFolderId,
        driveStatus: "ready",
        driveCreatedAt: new Date(),
      });

      return {
        driveFolderId: recordFolderId,
        alreadyExists: false,
      };
    } catch (error: any) {
      await recordRef.update({
        driveStatus: "error",
        driveError: error.message ?? "Error desconocido",
      });

      throw new HttpsError(
        "internal",
        "Error creando carpetas en Drive"
      );
    }
  }
);
