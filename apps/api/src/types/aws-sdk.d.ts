declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config: {
      endpoint?: string;
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
      forcePathStyle?: boolean;
    });
  }
  export class PutObjectCommand {
    constructor(input: { Bucket: string; Key: string; ContentType?: string });
  }
  export class GetObjectCommand {
    constructor(input: { Bucket: string; Key: string });
  }
}

declare module '@aws-sdk/s3-request-presigner' {
  import type { S3Client } from '@aws-sdk/client-s3';
  export function getSignedUrl(
    client: S3Client,
    command: any,
    options?: { expiresIn?: number },
  ): Promise<string>;
}
