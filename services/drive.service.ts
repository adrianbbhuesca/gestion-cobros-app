import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

/**
 * Inicializa Firebase Functions
 * Usa la app ya creada en firebase.ts
 */
const functions = getFunctions(app);

/**
 * Referencia a la Cloud Function
 * IMPORTANTE: el nombre DEBE coincidir con el export del backend
 */
const createDriveStructure = httpsCallable<
  { tipo: "cobro" | "ingreso"; recordId: string },
  { carpetaId: string }
>(functions, "createDriveStructureFn");

/**
 * Inicializa la estructura de Google Drive para un registro
 * - Crea carpeta raíz si no existe
 * - Crea subcarpeta cobro/ingreso
 * - Crea carpeta del registro
 */
export async function initDriveForRecord(
  tipo: "cobro" | "ingreso",
  recordId: string
): Promise<{ carpetaId: string }> {
  try {
    const res = await createDriveStructure({ tipo, recordId });
    return res.data;
  } catch (error) {
    console.error("Error creando estructura en Drive", error);
    throw new Error("No se pudo inicializar Drive");
  }
}
