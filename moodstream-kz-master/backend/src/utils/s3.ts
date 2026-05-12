import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3ClientConfig } from "@aws-sdk/client-s3";

export function createS3Client(): S3Client {
  const endpoint = process.env["S3_ENDPOINT"];
  const config: S3ClientConfig = {
    region: process.env["S3_REGION"] ?? "us-east-1",
    credentials: {
      accessKeyId: process.env["S3_ACCESS_KEY_ID"] ?? "",
      secretAccessKey: process.env["S3_SECRET_ACCESS_KEY"] ?? "",
    },
    forcePathStyle: true,
  };
  if (endpoint != null) config.endpoint = endpoint;
  return new S3Client(config);
}

export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType = "audio/mpeg",
): Promise<void> {
  const s3 = createS3Client();
  const bucket = process.env["S3_BUCKET"] ?? "moodstream-audio";
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

export async function getPresignedGetUrl(
  key: string,
  expiresIn = 31536000, // 1 year
): Promise<string> {
  const s3 = createS3Client();
  const bucket = process.env["S3_BUCKET"] ?? "moodstream-audio";
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}
