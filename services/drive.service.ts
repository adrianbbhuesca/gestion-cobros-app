// services/drive.service.ts
import { getAuth } from "firebase/auth";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

/**
 * Obtiene el accessToken OAuth de Google del usuario autenticado
 */
async function getGoogleAccessToken(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  const tokenResult = await user.getIdTokenResult();
  const providerData = user.providerData.find(
    (p) => p.providerId === "google.com"
  );

  if (!providerData) {
    throw new Error("El usuario no inició sesión con Google");
  }

  // @ts-expect-error Firebase expone accessToken internamente
  const accessToken = auth.currentUser?.stsTokenManager?.accessToken;

  if (!accessToken) {
    throw new Error("No se pudo obtener accessToken de Google");
  }

  return accessToken;
}

/**
 * Busca una carpeta por nombre dentro de un parent
 */
async function findFolder(
  name: string,
  parentId: string | null,
  accessToken: string
): Promise<string | null> {
  const qParts = [
    `mimeType='application/vnd.google-apps.folder'`,
    `name='${name.replace("'", "\\'")}'`,
    "trashed=false",
  ];

  if (parentId) {
    qParts.push(`'${parentId}' in parents`);
  }

  const q = qParts.join(" and ");

  const res = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

/**
 * Crea una carpeta en Drive
 */
async function createFolder(
  name: string,
  parentId: string | null,
  accessToken: string
): Promise<string> {
  const res = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });

  const data = await res.json();
  return data.id;
}

/**
 * Obtiene o crea la estructura:
 * /Sistema-de-Cobros/{Cobros|Ingresos}
 */
export async function getOrCreateDriveFolder(
  tipo: "cobro" | "ingreso"
): Promise<string> {
  const accessToken = await getGoogleAccessToken();

  // Carpeta raíz
  let rootId = await findFolder("Sistema-de-Cobros", null, accessToken);
  if (!rootId) {
    rootId = await createFolder("Sistema-de-Cobros", null, accessToken);
  }

  const childName = tipo === "cobro" ? "Cobros" : "Ingresos";

  let childId = await findFolder(childName, rootId, accessToken);
  if (!childId) {
    childId = await createFolder(childName, rootId, accessToken);
  }

  return childId;
}

/**
 * Sube un archivo a Drive y devuelve id + url
 */
export async function uploadFileToDrive(
  file: File,
  folderId: string
): Promise<{ fileId: string; fileUrl: string }> {
  const accessToken = await getGoogleAccessToken();

  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);

  const res = await fetch(`${UPLOAD_API}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  const data = await res.json();

  const fileId = data.id;
  const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

  return { fileId, fileUrl };
}
