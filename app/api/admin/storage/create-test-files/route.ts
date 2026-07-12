import { NextRequest, NextResponse } from 'next/server'

// Create test files for storage providers
export async function POST(request: NextRequest) {
  try {
    const { config, testData } = await request.json()
    
    if (!config || !config.provider) {
      return NextResponse.json({
        success: false,
        error: 'Invalid configuration data'
      }, { status: 400 })
    }
    
    let createResult
    
    switch (config.provider) {
      case 'local':
        createResult = await createLocalTestFiles(testData)
        break
      case 'google_drive':
        createResult = await createGoogleDriveTestFiles(config.google_drive, testData)
        break
      case 'ftp':
        createResult = await createFTPTestFiles(config.ftp, testData)
        break
      case 's3':
        createResult = await createS3TestFiles(config.s3, testData)
        break
      case 'supabase':
        createResult = await createSupabaseTestFiles(config.supabase, testData)
        break
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown storage provider'
        }, { status: 400 })
    }
    
    return NextResponse.json(createResult)
  } catch (error) {
    console.error('Error creating test files:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create test files'
    }, { status: 500 })
  }
}

// Create test files in local storage
async function createLocalTestFiles(testData: any) {
  try {
    const fs = await import('fs')
    const path = await import('path')
    const baseDir = path.default.join(process.cwd(), 'server', 'data')
    
    // Ensure directories exist
    const dirs = ['games', 'players', 'profiles', 'test']
    dirs.forEach(dir => {
      const dirPath = path.default.join(baseDir, dir)
      if (!fs.default.existsSync(dirPath)) {
        fs.default.mkdirSync(dirPath, { recursive: true })
      }
    })
    
    // Create test files
    const files = []
    
    // Game test file
    const gameFile = path.default.join(baseDir, 'games', 'test-game.json')
    fs.default.writeFileSync(gameFile, JSON.stringify(testData.files['test-game.json'], null, 2))
    files.push('games/test-game.json')
    
    // Player test file
    const playerFile = path.default.join(baseDir, 'players', 'test-player.json')
    fs.default.writeFileSync(playerFile, JSON.stringify(testData.files['test-player.json'], null, 2))
    files.push('players/test-player.json')
    
    // Profile test file
    const profileFile = path.default.join(baseDir, 'profiles', 'test-profile.json')
    fs.default.writeFileSync(profileFile, JSON.stringify(testData.files['test-profile.json'], null, 2))
    files.push('profiles/test-profile.json')
    
    // Connection test file
    const connectionFile = path.default.join(baseDir, 'test', 'connection-test.json')
    fs.default.writeFileSync(connectionFile, JSON.stringify({
      ...testData,
      created: new Date().toISOString(),
      provider: 'local'
    }, null, 2))
    files.push('test/connection-test.json')
    
    return {
      success: true,
      message: 'Local test files created successfully',
      files
    }
  } catch (error) {
    return {
      success: false,
      error: `Local storage error: ${(error as Error).message}`
    }
  }
}

// Create test files in Google Drive
async function createGoogleDriveTestFiles(config: any, testData: any) {
  try {
    const { google } = await import('googleapis')
    
    // Use service account authentication
    if (!config.service_account_key) {
      throw new Error('Service account key is required')
    }
    
    let serviceAccountCredentials
    try {
      serviceAccountCredentials = JSON.parse(config.service_account_key)
    } catch (error) {
      throw new Error('Invalid service account key format')
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    })
    
    const drive = google.drive({ version: 'v3', auth })
    const files = []
    
    // Create test files
    const testFiles = [
      { name: 'test-game.json', content: testData.files['test-game.json'], folder: 'games' },
      { name: 'test-player.json', content: testData.files['test-player.json'], folder: 'players' },
      { name: 'test-profile.json', content: testData.files['test-profile.json'], folder: 'profiles' },
      { name: 'connection-test.json', content: { ...testData, created: new Date().toISOString(), provider: 'google_drive' }, folder: 'test' }
    ]
    
    for (const file of testFiles) {
      const media = {
        mimeType: 'application/json',
        body: JSON.stringify(file.content, null, 2)
      }
      
      const result = await drive.files.create({
        requestBody: {
          name: `${file.folder}-${file.name}`,
          parents: config.folder_id ? [config.folder_id] : undefined
        },
        media: media
      })
      
      files.push(`${file.folder}/${file.name}`)
      console.log(`Created Google Drive file: ${file.folder}-${file.name} (ID: ${result.data.id})`)
    }
    
    return {
      success: true,
      message: 'Google Drive test files created successfully',
      files,
      location: config.folder_id ? `Folder ID: ${config.folder_id}` : 'Root folder'
    }
  } catch (error) {
    console.error('Google Drive test file creation error:', error)
    return {
      success: false,
      error: `Google Drive error: ${(error as Error).message}`
    }
  }
}

// Create test files via FTP
async function createFTPTestFiles(config: any, testData: any) {
  try {
    const ftp = await import('basic-ftp')
    const client = new ftp.default.Client()
    
    await client.access({
      host: config.host,
      user: config.username,
      password: config.password,
      port: config.port || 21,
      secure: config.secure || false
    })
    
    const files = []
    
    // Create directories and files
    const testFiles = [
      { path: 'games/test-game.json', content: testData.files['test-game.json'] },
      { path: 'players/test-player.json', content: testData.files['test-player.json'] },
      { path: 'profiles/test-profile.json', content: testData.files['test-profile.json'] },
      { path: 'test/connection-test.json', content: { ...testData, created: new Date().toISOString(), provider: 'ftp' } }
    ]
    
    for (const file of testFiles) {
      const remotePath = `${config.base_path}/${file.path}`
      const dir = remotePath.substring(0, remotePath.lastIndexOf('/'))
      
      // Ensure directory exists
      await client.ensureDir(dir)
      
      // Upload file
      const content = JSON.stringify(file.content, null, 2)
      await client.uploadFrom(content, remotePath)
      
      files.push(file.path)
    }
    
    client.close()
    
    return {
      success: true,
      message: 'FTP test files created successfully',
      files
    }
  } catch (error) {
    return {
      success: false,
      error: `FTP error: ${(error as Error).message}`
    }
  }
}

// Create test files in Amazon S3
async function createS3TestFiles(config: any, testData: any) {
  try {
    const AWS = await import('aws-sdk')
    
    const s3Config: any = {
      accessKeyId: config.access_key,
      secretAccessKey: config.secret_key,
      region: config.region || 'us-east-1'
    }
    
    // Add custom endpoint if provided (for Supabase S3 compatibility)
    if (config.endpoint) {
      s3Config.endpoint = config.endpoint
      s3Config.s3ForcePathStyle = true
    }
    
    const s3 = new AWS.default.S3(s3Config)
    
    const files = []
    
    // Create test files
    const testFiles = [
      { key: 'games/test-game.json', content: testData.files['test-game.json'] },
      { key: 'players/test-player.json', content: testData.files['test-player.json'] },
      { key: 'profiles/test-profile.json', content: testData.files['test-profile.json'] },
      { key: 'test/connection-test.json', content: { ...testData, created: new Date().toISOString(), provider: 's3' } }
    ]
    
    for (const file of testFiles) {
      const params = {
        Bucket: config.bucket,
        Key: file.key,
        Body: JSON.stringify(file.content, null, 2),
        ContentType: 'application/json'
      }
      
      await s3.upload(params).promise()
      files.push(file.key)
    }
    
    return {
      success: true,
      message: 'S3 test files created successfully',
      files
    }
  } catch (error) {
    return {
      success: false,
      error: `S3 error: ${(error as Error).message}`
    }
  }
}

// Create test files in Supabase Storage
async function createSupabaseTestFiles(config: any, testData: any) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    if (!config.url || !config.anon_key) {
      throw new Error('Supabase URL and anon key are required')
    }
    
    const supabase = createClient(config.url, config.anon_key)
    const bucketName = config.bucket_name || 'score'
    
    const files = []
    
    // Create test files in storage bucket
    const testFiles = [
      { name: 'games/test-game.json', content: testData.files['test-game.json'] },
      { name: 'players/test-player.json', content: testData.files['test-player.json'] },
      { name: 'profiles/test-profile.json', content: testData.files['test-profile.json'] },
      { name: 'test/connection-test.json', content: { ...testData, created: new Date().toISOString(), provider: 'supabase' } }
    ]
    
    for (const file of testFiles) {
      const content = JSON.stringify(file.content, null, 2)
      const buffer = Buffer.from(content)
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(file.name, buffer, {
          contentType: 'application/json',
          upsert: true
        })
      
      if (error) {
        console.error(`Supabase upload error for ${file.name}:`, error)
        throw new Error(`Failed to upload ${file.name}: ${error.message}`)
      }
      
      files.push(file.name)
      console.log(`Created Supabase file: ${file.name}`)
    }
    
    return {
      success: true,
      message: 'Supabase test files created successfully',
      files,
      bucket: bucketName
    }
  } catch (error) {
    console.error('Supabase test file creation error:', error)
    return {
      success: false,
      error: `Supabase error: ${(error as Error).message}`
    }
  }
} 