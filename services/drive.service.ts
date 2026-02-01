const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = "https://www.googleapis.com/auth/drive.file";

let accessToken: string | null = null;

export const initGoogleDrive = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject("Google API no cargada");
      return;
    }

    window.google.accounts.oauth2
      .initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          accessToken = tokenResponse.access_token;
          gapi.load("client", async () => {
            await gapi.client.init({
              discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
              ],
            });
            gapi.client.setToken({ access_token: accessToken });
            resolve();
          });
        },
      })
      .requestAccessToken();
  });
};

export const createFolder = async (name: string, parentId?: string) => {
  const res = await gapi.client.drive.files.create({
    resource: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : [],
    },
    fields: "id",
  });

  return res.result.id!;
};

export const uploadFile = async (
  file: File,
  parentId: string
): Promise<string> => {
  const metadata = {
    name: file.name,
    parents: [parentId],
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  const data = await res.json();
  return data.id;
};
