import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const endpoint = process.env.STORAGE_ENDPOINT;
const bucket = process.env.STORAGE_BUCKET;
const accessKeyId = process.env.STORAGE_ACCESS_KEY;
const secretAccessKey = process.env.STORAGE_SECRET_KEY;

function getConfig() {
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Configuration Cloudflare R2 incomplète : vérifiez STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY et STORAGE_SECRET_KEY."
    );
  }
  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

let client: S3Client | undefined;

export function getR2Client() {
  const config = getConfig();
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }
  return client;
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "file";
}

export function createObjectKey(folder: string, originalName: string) {
  const safeFolder = safeSegment(folder);
  const extension = originalName.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0]?.toLowerCase() ?? "";
  return `${safeFolder}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
}

export async function uploadPrivateObject(input: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  contentLength: number;
}) {
  const config = getConfig();
  await getR2Client().send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
    ServerSideEncryption: "AES256"
  }));
  return { key: input.key };
}

export async function downloadPrivateObject(key: string): Promise<Buffer> {
  const config = getConfig();
  const response = await getR2Client().send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
  if (!response.Body) throw new Error("Objet privé introuvable ou vide.");
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function createPrivateDownloadUrl(key: string, expiresInSeconds = 120, downloadFilename?: string) {
  const config = getConfig();
  const filename = (downloadFilename ?? key.split("/").pop() ?? "document.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`
  });
  return getSignedUrl(getR2Client(), command, {
    expiresIn: Math.min(Math.max(expiresInSeconds, 30), 600)
  });
}

export async function deletePrivateObject(key: string) {
  const config = getConfig();
  await getR2Client().send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key
  }));
}

export async function testR2Connection() {
  const config = getConfig();
  await getR2Client().send(new HeadBucketCommand({ Bucket: config.bucket }));
  return { connected: true, bucket: config.bucket };
}
