import { promises as fs } from 'fs';
import path from 'path';
import AWS from 'aws-sdk';
import { createClient } from '@supabase/supabase-js';
import { readEnv } from './env';

interface StorageConfig {
  provider: 'local' | 'google_drive' | 'ftp' | 's3' | 'supabase';
  google_drive?: {
    service_account_key: string;
    folder_id: string;
  };
  ftp?: {
    host: string;
    username: string;
    password: string;
    port: number;
    secure: boolean;
    base_path: string;
  };
  s3?: {
    access_key: string;
    secret_key: string;
    bucket: string;
    region: string;
    endpoint: string;
  };
  supabase?: {
    url: string;
    anon_key: string;
    bucket_name: string;
  };
}

interface StorageProvider {
  saveFile(key: string, data: unknown): Promise<boolean>;
  loadFile(key: string): Promise<unknown>;
  deleteFile(key: string): Promise<boolean>;
  listFiles(prefix?: string): Promise<string[]>;
  exists(key: string): Promise<boolean>;
  isConnected(): boolean;
}

export class StorageGateway {
  private config: StorageConfig;
  private provider: StorageProvider;

  constructor() {
    this.config = this.loadConfig();
    this.provider = this.initializeProvider();
  }

  private loadConfig(): StorageConfig {
    // Default configuration - using environment variables for production
    const defaultConfig: StorageConfig = {
      provider: (readEnv('STORAGE_PROVIDER', 's3') as StorageConfig['provider']) || 's3',
      s3: {
        access_key: readEnv('S3_ACCESS_KEY', 'ce239a424a0e994c2c564eff6a884742'),
        secret_key: readEnv('S3_SECRET_KEY', '61df8a58f3fa4e7b6a42492e67c55d7bfcd07401c2870d57e424eed1d389fa67'),
        bucket: readEnv('S3_BUCKET', 'score'),
        region: readEnv('S3_REGION', 'us-east-2'),
        endpoint: readEnv('S3_ENDPOINT', 'https://wiuthfkfxzytjrviyypw.supabase.co/storage/v1/s3'),
      },
      supabase: {
        url: readEnv('SUPABASE_URL'),
        anon_key: readEnv('SUPABASE_ANON_KEY'),
        bucket_name: readEnv('SUPABASE_BUCKET', 'score'),
      },
      ftp: {
        host: readEnv('FTP_HOST'),
        username: readEnv('FTP_USERNAME'),
        password: readEnv('FTP_PASSWORD'),
        port: parseInt(readEnv('FTP_PORT', '21'), 10),
        secure: readEnv('FTP_SECURE') === 'true',
        base_path: readEnv('FTP_BASE_PATH', '/spades_data'),
      },
    };

    return defaultConfig;
  }

  private initializeProvider(): StorageProvider {
    switch (this.config.provider) {
      case 's3':
        return new S3Provider(this.config.s3!);
      case 'supabase':
        return new SupabaseProvider(this.config.supabase!);
      default:
        return new LocalProvider();
    }
  }

  async saveFile(key: string, data: unknown): Promise<boolean> {
    return await this.provider.saveFile(key, data);
  }

  async loadFile(key: string): Promise<unknown> {
    return await this.provider.loadFile(key);
  }

  async deleteFile(key: string): Promise<boolean> {
    return await this.provider.deleteFile(key);
  }

  async listFiles(prefix = ''): Promise<string[]> {
    return await this.provider.listFiles(prefix);
  }

  async exists(key: string): Promise<boolean> {
    return await this.provider.exists(key);
  }

  getStatus() {
    return {
      provider: this.config.provider,
      connected: this.provider.isConnected(),
      config: this.getSafeConfig()
    };
  }

  private getSafeConfig() {
    const safeConfig = JSON.parse(JSON.stringify(this.config));
    
    // Remove sensitive information
    if (safeConfig.s3) {
      safeConfig.s3.secret_key = '***';
    }
    if (safeConfig.supabase) {
      safeConfig.supabase.anon_key = '***';
    }
    if (safeConfig.ftp) {
      safeConfig.ftp.password = '***';
    }
    
    return safeConfig;
  }
}

// Local Storage Provider (fallback)
class LocalProvider implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath = path.join(process.cwd(), 'data');
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists() {
    try {
      await fs.access(this.basePath);
    } catch {
      await fs.mkdir(this.basePath, { recursive: true });
    }
  }

  async saveFile(key: string, data: unknown): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, key);
      const dir = path.dirname(filePath);
      
      await fs.mkdir(dir, { recursive: true });
      
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, content);
      return true;
    } catch (error) {
      console.error('Local storage save error:', error);
      return false;
    }
  }

  async loadFile(key: string): Promise<unknown> {
    try {
      const filePath = path.join(this.basePath, key);
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, key);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async listFiles(prefix = ''): Promise<string[]> {
    try {
      const searchPath = path.join(this.basePath, prefix);
      const files = await this.getAllFiles(searchPath);
      return files.map(file => path.relative(this.basePath, file));
    } catch (error) {
      return [];
    }
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          files.push(...await this.getAllFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    return files;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  isConnected(): boolean {
    return true;
  }
}

// S3 Storage Provider
class S3Provider implements StorageProvider {
  private s3!: AWS.S3;
  private config: NonNullable<StorageConfig['s3']>;
  private connected: boolean = false;

  constructor(config: NonNullable<StorageConfig['s3']>) {
    this.config = config;
    this.initialize();
  }

  private async initialize() {
    try {
      this.s3 = new AWS.S3({
        accessKeyId: this.config.access_key,
        secretAccessKey: this.config.secret_key,
        region: this.config.region,
        endpoint: this.config.endpoint,
        s3ForcePathStyle: true,
        httpOptions: {
          timeout: 30000, // 30 seconds timeout
          connectTimeout: 10000 // 10 seconds connection timeout
        }
      });

      // Test connection
      await this.s3.headBucket({ Bucket: this.config.bucket }).promise();
      this.connected = true;
      console.log(`✅ Connected to S3 bucket: ${this.config.bucket}`);
    } catch (error) {
      console.error('S3 initialization error:', error);
      this.connected = false;
    }
  }

  async saveFile(key: string, data: unknown): Promise<boolean> {
    try {
      if (!this.connected) await this.initialize();
      
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      const params = {
        Bucket: this.config.bucket,
        Key: key,
        Body: content,
        ContentType: 'application/json'
      };

      // Add timeout to the upload operation
      const uploadPromise = this.s3.upload(params).promise();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), 30000)
      );

      await Promise.race([uploadPromise, timeoutPromise]);
      console.log(`✅ Saved to S3: ${key}`);
      return true;
    } catch (error) {
      console.error('S3 save error:', error);
      return false;
    }
  }

  async loadFile(key: string): Promise<unknown> {
    try {
      if (!this.connected) await this.initialize();
      
      const params = {
        Bucket: this.config.bucket,
        Key: key
      };

      // Add timeout to the getObject operation
      const getObjectPromise = this.s3.getObject(params).promise();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Download timeout')), 30000)
      );

      const result = await Promise.race([getObjectPromise, timeoutPromise]) as AWS.S3.GetObjectOutput;
      const content = result.Body?.toString();
      if (!content) return null;
      return JSON.parse(content);
    } catch (error: any) {
      if (error.statusCode === 404 || error.code === 'NoSuchKey') {
        return null;
      }
      console.error('S3 load error:', error);
      return null;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      if (!this.connected) await this.initialize();
      
      const params = {
        Bucket: this.config.bucket,
        Key: key
      };

      await this.s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      console.error('S3 delete error:', error);
      return false;
    }
  }

  async listFiles(prefix = ''): Promise<string[]> {
    try {
      if (!this.connected) await this.initialize();
      
      const params = {
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: 1000
      };

      const result = await this.s3.listObjectsV2(params).promise();
      return result.Contents
        ?.filter(obj => obj.Key && !obj.Key.endsWith('/'))
        .map(obj => obj.Key!) || [];
    } catch (error) {
      console.error('S3 list error:', error);
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.connected) await this.initialize();
      
      const params = {
        Bucket: this.config.bucket,
        Key: key
      };

      await this.s3.headObject(params).promise();
      return true;
    } catch {
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Supabase Storage Provider
class SupabaseProvider implements StorageProvider {
  private supabase!: ReturnType<typeof createClient>;
  private config: NonNullable<StorageConfig['supabase']>;
  private connected: boolean = false;

  constructor(config: NonNullable<StorageConfig['supabase']>) {
    this.config = config;
    this.initialize();
  }

  private async initialize() {
    try {
      if (!this.config.url || !this.config.anon_key) {
        throw new Error('Supabase URL and anon key are required');
      }

      this.supabase = createClient(this.config.url, this.config.anon_key);
      this.connected = true;
      
      // Test connection
      try {
        await this.supabase.storage.from(this.config.bucket_name).list('', { limit: 1 });
        console.log(`✅ Connected to Supabase bucket: ${this.config.bucket_name}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`⚠️ Supabase connection established but bucket test failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Supabase initialization error:', error);
      this.connected = false;
    }
  }

  async saveFile(key: string, data: unknown): Promise<boolean> {
    try {
      if (!this.connected) await this.initialize();
      
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      const buffer = Buffer.from(content);
      
      const { error } = await this.supabase.storage
        .from(this.config.bucket_name)
        .upload(key, buffer, {
          contentType: 'application/json',
          upsert: true
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return false;
      }

      console.log(`✅ Saved to Supabase: ${key}`);
      return true;
    } catch (error) {
      console.error('Supabase save error:', error);
      return false;
    }
  }

  async loadFile(key: string): Promise<unknown> {
    try {
      if (!this.connected) await this.initialize();
      
      const { data, error } = await this.supabase.storage
        .from(this.config.bucket_name)
        .download(key);

      if (error) {
        if (error.message.includes('not found')) return null;
        console.error('Supabase download error:', error);
        return null;
      }

      const content = await data.text();
      return JSON.parse(content);
    } catch (error) {
      console.error('Supabase load error:', error);
      return null;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      if (!this.connected) await this.initialize();
      
      const { error } = await this.supabase.storage
        .from(this.config.bucket_name)
        .remove([key]);

      if (error) {
        console.error('Supabase delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Supabase delete error:', error);
      return false;
    }
  }

  async listFiles(prefix = ''): Promise<string[]> {
    try {
      if (!this.connected) await this.initialize();
      
      const { data, error } = await this.supabase.storage
        .from(this.config.bucket_name)
        .list(prefix, { limit: 1000 });

      if (error) {
        console.error('Supabase list error:', error);
        return [];
      }

      return data
        .filter((item: { name: string }) => item.name && !item.name.endsWith('/'))
        .map((item: { name: string }) => prefix ? `${prefix}/${item.name}` : item.name);
    } catch (error) {
      console.error('Supabase list error:', error);
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.connected) await this.initialize();
      
      const { data, error } = await this.supabase.storage
        .from(this.config.bucket_name)
        .download(key);

      return !error && data !== null;
    } catch {
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Export singleton instance
export const storage = new StorageGateway(); 