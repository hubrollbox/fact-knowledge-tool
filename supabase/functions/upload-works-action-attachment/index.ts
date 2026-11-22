import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "obras-acoes-anexos";
const MAX_SIZE = 25 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 5000;
const MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024;

type DetectedFile = { mime: string; extension: string };

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeStorageName(name: string): string {
  const normalized = name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return normalized || "ficheiro";
}

function hasBytes(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

async function readRequestBodyLimited(req: Request, maxBytes: number): Promise<Uint8Array> {
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("Request body exceeds upload limit");
        throw new RangeError("REQUEST_BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function zipEntries(bytes: Uint8Array): Set<string> | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minOffset = Math.max(0, bytes.length - 65_557);
  let endOffset = -1;

  for (let offset = bytes.length - 22; offset >= minOffset; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      const commentLength = view.getUint16(offset + 20, true);
      if (offset + 22 + commentLength === bytes.length) {
        endOffset = offset;
        break;
      }
    }
  }
  if (endOffset < 0) return null;

  const disk = view.getUint16(endOffset + 4, true);
  const centralDisk = view.getUint16(endOffset + 6, true);
  const entriesOnDisk = view.getUint16(endOffset + 8, true);
  const entryCount = view.getUint16(endOffset + 10, true);
  const centralSize = view.getUint32(endOffset + 12, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) return null;
  if (entryCount < 1 || entryCount > MAX_ZIP_ENTRIES) return null;
  if (centralOffset + centralSize > endOffset) return null;
  if (centralOffset === 0xffffffff || centralSize === 0xffffffff) return null;

  const names = new Set<string>();
  let cursor = centralOffset;
  let totalUncompressed = 0;

  for (let index = 0; index < entryCount; index++) {
    if (cursor + 46 > centralOffset + centralSize || view.getUint32(cursor, true) !== 0x02014b50) return null;
    const flags = view.getUint16(cursor + 8, true);
    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength;

    if ((flags & 0x0001) !== 0 || recordEnd > centralOffset + centralSize) return null;
    if (![0, 8].includes(compressionMethod)) return null;
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) return null;
    if (localOffset + 30 > centralOffset || view.getUint32(localOffset, true) !== 0x04034b50) return null;

    let name: string;
    try {
      name = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    } catch {
      return null;
    }
    if (!name || name.startsWith("/") || name.includes("\\\\") || name.split("/").includes("..") || names.has(name)) return null;

    const localFlags = view.getUint16(localOffset + 6, true);
    const localMethod = view.getUint16(localOffset + 8, true);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const localNameStart = localOffset + 30;
    const localDataStart = localNameStart + localNameLength + localExtraLength;
    let localName: string;
    try {
      localName = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(localNameStart, localNameStart + localNameLength));
    } catch {
      return null;
    }
    if (localFlags !== flags || localMethod !== compressionMethod || localName !== name) return null;
    if (localDataStart + compressedSize > centralOffset) return null;

    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) return null;
    if (compressedSize > 0 && uncompressedSize / compressedSize > 100) return null;

    names.add(name);
    cursor = recordEnd;
  }

  if (cursor !== centralOffset + centralSize) return null;
  return names;
}

function detectFile(bytes: Uint8Array, originalName: string): DetectedFile | null {
  const extension = originalName.toLowerCase().split(".").pop() ?? "";

  if (extension === "pdf" && hasBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    const tail = new TextDecoder().decode(bytes.subarray(Math.max(0, bytes.length - 2048)));
    return tail.includes("%%EOF") ? { mime: "application/pdf", extension: "pdf" } : null;
  }

  if (
    (extension === "jpg" || extension === "jpeg") &&
    bytes.length >= 4 &&
    hasBytes(bytes, [0xff, 0xd8, 0xff]) &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9
  ) {
    return { mime: "image/jpeg", extension: "jpg" };
  }

  if (extension === "png" && hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    if (bytes.length < 45) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(12, false) !== 0x49484452) return null;
    if (view.getUint32(bytes.length - 8, false) !== 0x49454e44) return null;
    if (view.getUint32(bytes.length - 12, false) !== 0) return null;
    return { mime: "image/png", extension: "png" };
  }

  if (["docx", "xlsx", "pptx"].includes(extension) && hasBytes(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    const entries = zipEntries(bytes);
    if (!entries || !entries.has("[Content_Types].xml")) return null;
    if ([...entries].some((name) => /(^|\/)vbaProject\.bin$/i.test(name))) return null;

    if (extension === "docx" && entries.has("word/document.xml")) {
      return { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension };
    }
    if (extension === "xlsx" && entries.has("xl/workbook.xml")) {
      return { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension };
    }
    if (extension === "pptx" && entries.has("ppt/presentation.xml")) {
      return { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", extension };
    }
    return null;
  }

  if (extension === "txt") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.includes("\u0000")) return null;
      return { mime: "text/plain", extension: "txt" };
    } catch {
      return null;
    }
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Método não permitido." }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return response({ error: "Sessão inválida." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Configuração Supabase incompleta.");

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const token = authorization.slice("Bearer ".length);
    const { data: userData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !userData.user) return response({ error: "Sessão inválida ou expirada." }, 401);
    const userId = userData.user.id;

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
      return response({ error: "O pedido tem de usar multipart/form-data." }, 415);
    }
    const contentEncoding = req.headers.get("content-encoding");
    if (contentEncoding && contentEncoding.toLowerCase() !== "identity") {
      return response({ error: "Pedidos com conteúdo comprimido não são aceites." }, 415);
    }

    const maxRequestBytes = MAX_SIZE + 256 * 1024;
    const contentLengthHeader = req.headers.get("content-length");
    if (contentLengthHeader !== null) {
      const contentLength = Number(contentLengthHeader);
      if (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > maxRequestBytes) {
        return response({ error: "O pedido excede o limite de 25 MB." }, 413);
      }
    }

    let requestBody: Uint8Array;
    try {
      requestBody = await readRequestBodyLimited(req, maxRequestBytes);
    } catch (error) {
      if (error instanceof RangeError && error.message === "REQUEST_BODY_TOO_LARGE") {
        return response({ error: "O pedido excede o limite de 25 MB." }, 413);
      }
      throw error;
    }

    const boundedRequest = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: requestBody,
    });
    const form = await boundedRequest.formData();
    const formEntries = [...form.entries()];
    if (
      formEntries.length !== 2 ||
      form.getAll("acao_id").length !== 1 ||
      form.getAll("file").length !== 1 ||
      formEntries.some(([key]) => key !== "acao_id" && key !== "file")
    ) {
      return response({ error: "O pedido contém campos inválidos." }, 400);
    }

    const actionId = form.get("acao_id");
    const file = form.get("file");
    if (typeof actionId !== "string" || !isUuid(actionId) || !(file instanceof File)) {
      return response({ error: "Pedido de anexo inválido." }, 400);
    }
    if (file.size < 1 || file.size > MAX_SIZE) return response({ error: "O ficheiro tem de ter conteúdo e não pode exceder 25 MB." }, 413);
    if (!file.name || file.name.length > 255) return response({ error: "Nome de ficheiro inválido." }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: action, error: actionError } = await admin
      .from("obras_acoes")
      .select("id, workspace_id, obra_id")
      .eq("id", actionId)
      .maybeSingle();
    if (actionError) throw actionError;
    if (!action) return response({ error: "Acção não encontrada." }, 404);

    const { data: ownedWorkspace, error: ownerError } = await admin
      .from("workspaces")
      .select("id")
      .eq("id", action.workspace_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (ownerError) throw ownerError;

    let canWrite = Boolean(ownedWorkspace);
    if (!canWrite) {
      const { data: membership, error: membershipError } = await admin
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", action.workspace_id)
        .eq("user_id", userId)
        .in("role", ["owner", "admin", "editor"])
        .maybeSingle();
      if (membershipError) throw membershipError;
      canWrite = Boolean(membership);
    }
    if (!canWrite) return response({ error: "Não tem permissões para anexar ficheiros a esta acção." }, 403);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectFile(bytes, file.name);
    if (!detected) return response({ error: "O conteúdo do ficheiro não corresponde a um formato permitido." }, 415);

    const documentId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const storagePath = `${action.workspace_id}/${action.obra_id}/${documentId}/${versionId}/${safeStorageName(file.name)}`;

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: detected.mime,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: attachmentId, error: rpcError } = await admin.rpc("create_obras_acao_anexo", {
      _acao_id: action.id,
      _documento_id: documentId,
      _versao_id: versionId,
      _storage_path: storagePath,
      _nome_ficheiro: file.name,
      _mime_type: detected.mime,
      _tamanho_bytes: bytes.byteLength,
      _actor_id: userId,
    });

    if (rpcError) {
      // A transport error can occur after Postgres committed. Never delete an
      // object if its version row already exists.
      const { data: persistedVersion, error: lookupError } = await admin
        .from("obras_documento_versoes")
        .select("id")
        .eq("storage_path", storagePath)
        .maybeSingle();

      if (lookupError) {
        console.error("Could not determine attachment persistence state", {
          storagePath,
          message: lookupError.message,
        });
      } else if (!persistedVersion) {
        const { error: cleanupError } = await admin.storage.from(BUCKET).remove([storagePath]);
        if (cleanupError) {
          console.error("Attachment cleanup failed", { storagePath, message: cleanupError.message });
        }
      } else {
        console.error("Attachment RPC returned an error after persistence; retained object", {
          storagePath,
          attachmentId: attachmentId ?? null,
        });
      }
      throw rpcError;
    }

    return response({ id: attachmentId });
  } catch (error) {
    console.error("upload-works-action-attachment failed", error);
    return response({ error: "Não foi possível anexar o ficheiro." }, 500);
  }
});
