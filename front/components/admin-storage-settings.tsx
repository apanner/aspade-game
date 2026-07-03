"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  HardDrive,
  Cloud,
  Server,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  TestTube,
  Save,
  RotateCcw,
  ExternalLink,
  Folder,
  Key,
  Wifi,
  Lock,
  FileText,
  Upload,
  Download
} from "lucide-react"

interface StorageConfig {
  provider: string
  google_drive: {
    service_account_key: string
    folder_id: string
  }
  ftp: {
    host: string
    username: string
    password: string
    port: number
    secure: boolean
    base_path: string
  }
  s3: {
    access_key: string
    secret_key: string
    bucket: string
    region: string
    endpoint: string
  }
  supabase: {
    url: string
    anon_key: string
    bucket_name: string
  }
}

interface StorageStatus {
  provider: string
  connected: boolean
  config: StorageConfig
}

export function AdminStorageSettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [config, setConfig] = useState<StorageConfig>({
    provider: 's3',
    google_drive: {
      service_account_key: '',
      folder_id: ''
    },
    ftp: {
      host: '',
      username: '',
      password: '',
      port: 21,
      secure: false,
      base_path: '/spades_data'
    },
    s3: {
      access_key: '',
      secret_key: '',
      bucket: '',
      region: '',
      endpoint: ''
    },
    supabase: {
      url: '',
      anon_key: '',
      bucket_name: ''
    }
  })

  // Load current configuration
  useEffect(() => {
    loadStorageConfig()
  }, [])

  const loadStorageConfig = async () => {
    try {
      const response = await fetch('/api/admin/storage/config')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.status)
        setConfig(data.status.config)
      }
    } catch (error) {
      console.error('Error loading storage config:', error)
    }
  }

  const handleConfigChange = (section: string, field: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev }
      const sectionConfig = newConfig[section as keyof StorageConfig] as any
      if (sectionConfig && typeof sectionConfig === 'object') {
        newConfig[section as keyof StorageConfig] = {
          ...sectionConfig,
          [field]: value
        } as any
      }
      return newConfig
    })
  }

  const handleProviderChange = (provider: string) => {
    setConfig(prev => ({
      ...prev,
      provider
    }))
  }

  const testConnection = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/admin/storage/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "✅ Connection Test Successful",
          description: `${data.message}${data.details ? ` - ${data.details}` : ''}`,
        })
        
        // Create test files for successful connections
        await createTestFiles()
      } else {
        toast({
          title: "❌ Connection Test Failed",
          description: data.error || "Failed to connect to storage",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "🚨 Connection Test Error",
        description: "An error occurred while testing the connection",
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
  }

  const createTestFiles = async () => {
    try {
      const testData = {
        test: true,
        timestamp: Date.now(),
        provider: config.provider,
        message: `Test file created from ${config.provider} storage provider`,
        files: {
          'test-game.json': { gameId: 'TEST123', title: 'Test Game', status: 'completed' },
          'test-player.json': { playerId: 'PLAYER123', name: 'Test Player', score: 100 },
          'test-profile.json': { playerName: 'TestUser', gamesPlayed: 5, winRate: 0.8 }
        }
      }
      
      const response = await fetch('/api/admin/storage/create-test-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config, testData })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "📁 Test Files Created",
          description: `Created test files: ${result.files.join(', ')}`,
        })
      }
    } catch (error) {
      console.error('Error creating test files:', error)
    }
  }

  const saveConfiguration = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/storage/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.status)
        toast({
          title: "💾 Configuration Saved",
          description: "Storage configuration has been updated successfully",
        })
      } else {
        toast({
          title: "❌ Save Failed",
          description: data.error || "Failed to save configuration",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "🚨 Save Error",
        description: "An error occurred while saving the configuration",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetToDefaults = () => {
    setConfig({
      provider: 's3',
      google_drive: {
        service_account_key: '',
        folder_id: ''
      },
      ftp: {
        host: '',
        username: '',
        password: '',
        port: 21,
        secure: false,
        base_path: '/spades_data'
      },
      s3: {
        access_key: 'ce239a424a0e994c2c564eff6a884742',
        secret_key: '61df8a58f3fa4e7b6a42492e67c55d7bfcd07401c2870d57e424eed1d389fa67',
        bucket: 'score',
        region: 'us-east-2',
        endpoint: 'https://wiuthfkfxzytjrviyypw.supabase.co/storage/v1/s3'
      },
      supabase: {
        url: 'https://wiuthfkfxzytjrviyypw.supabase.co',
        anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdXRoZmtmeHp5dGpydml5eXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyODI1MTIsImV4cCI6MjA2Mjg1ODUxMn0.37uN7QTqSAuHuHWwaWvLHX4brUe4U42QT5ef3qqV1Aw',
        bucket_name: 'score'
      }
    })
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'local': return <HardDrive className="h-4 w-4" />
      case 'google_drive': return <Cloud className="h-4 w-4" />
      case 'ftp': return <Server className="h-4 w-4" />
      case 's3': return <Database className="h-4 w-4" />
      case 'supabase': return <Database className="h-4 w-4" />
      default: return <HardDrive className="h-4 w-4" />
    }
  }

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'local': return 'Local Storage'
      case 'google_drive': return 'Google Drive'
      case 'ftp': return 'FTP Server'
      case 's3': return 'Amazon S3'
      case 'supabase': return 'Supabase'
      default: return 'Unknown'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5 text-amber-400" />
                Storage Configuration
              </CardTitle>
              <CardDescription className="text-slate-400">
                Configure persistent storage for game data and player information
              </CardDescription>
            </div>
            
            {status && (
              <div className="flex items-center gap-2">
                {status.connected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <Badge variant={status.connected ? "default" : "destructive"}>
                  {getProviderName(status.provider)} - {status.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Storage Provider Selection */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Storage Provider</CardTitle>
          <CardDescription className="text-slate-400">Choose where your game data will be stored</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { value: 'local', name: 'Local Storage', icon: <HardDrive className="h-4 w-4" />, desc: 'Store files locally (ephemeral on Railway)' },
              { value: 'google_drive', name: 'Google Drive', icon: <Cloud className="h-4 w-4" />, desc: 'Store files in Google Drive' },
              { value: 'ftp', name: 'FTP Server', icon: <Server className="h-4 w-4" />, desc: 'Store files on FTP server' },
              { value: 's3', name: 'Amazon S3', icon: <Database className="h-4 w-4" />, desc: 'Store files in Amazon S3' },
              { value: 'supabase', name: 'Supabase', icon: <Database className="h-4 w-4" />, desc: 'Store data in Supabase database' }
            ].map((provider) => (
              <div
                key={provider.value}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  config.provider === provider.value
                    ? 'border-amber-500 bg-amber-500/5 text-white'
                    : 'border-slate-600 text-slate-300 hover:border-amber-500/50 hover:bg-slate-700/50'
                }`}
                onClick={() => handleProviderChange(provider.value)}
              >
                <div className="flex items-center gap-3">
                  {provider.icon}
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-xs text-slate-400">{provider.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={config.provider} onValueChange={handleProviderChange}>
        <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border-slate-700">
          <TabsTrigger value="local" className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            <HardDrive className="h-4 w-4" />
            Local
          </TabsTrigger>
          <TabsTrigger value="google_drive" className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            <Cloud className="h-4 w-4" />
            Google Drive
          </TabsTrigger>
          <TabsTrigger value="ftp" className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            <Server className="h-4 w-4" />
            FTP
          </TabsTrigger>
          <TabsTrigger value="s3" className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            <Database className="h-4 w-4" />
            S3
          </TabsTrigger>
          <TabsTrigger value="supabase" className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            <Database className="h-4 w-4" />
            Supabase
          </TabsTrigger>
        </TabsList>

        {/* Local Storage */}
        <TabsContent value="local">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Local Storage</CardTitle>
              <CardDescription className="text-slate-400">
                Files are stored locally on the server. Note: This is ephemeral on Railway.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="border-amber-500/30 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-200">
                  Local storage is not recommended for production deployment on Railway as files will be lost on restart.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Drive */}
        <TabsContent value="google_drive">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Google Drive Configuration</CardTitle>
              <CardDescription className="text-slate-400">
                Configure Google Drive API credentials for file storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gd-service-key" className="text-slate-300">Service Account Key (JSON)</Label>
                <Textarea
                  id="gd-service-key"
                  value={config.google_drive.service_account_key}
                  onChange={(e) => handleConfigChange('google_drive', 'service_account_key', e.target.value)}
                  placeholder="Paste your service account JSON key here..."
                  className="bg-slate-700/50 border-slate-600 text-white min-h-[120px] font-mono text-sm"
                  rows={6}
                />
                <p className="text-xs text-slate-400">
                  Download from Google Cloud Console → Service Accounts → Create Key → JSON
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gd-folder-id" className="text-slate-300">Google Drive Folder ID (Optional)</Label>
                <Input
                  id="gd-folder-id"
                  value={config.google_drive.folder_id}
                  onChange={(e) => handleConfigChange('google_drive', 'folder_id', e.target.value)}
                  placeholder="Leave empty to auto-create folder"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
                <p className="text-xs text-slate-400">
                  <span className="font-medium">Option 1:</span> Leave empty - system will auto-create a folder<br/>
                  <span className="font-medium">Option 2:</span> Enter existing folder ID from Google Drive URL<br/>
                  <span className="text-green-400">ℹ️ Service accounts have 15GB storage limit (plenty for game data)</span>
                </p>
              </div>
              
              <Alert className="border-blue-500/30 bg-blue-500/10">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200">
                  <div className="space-y-2">
                    <div className="font-medium">Super Simple 2-Step Setup:</div>
                    <div>1. Go to <Button variant="link" className="p-0 text-blue-300 hover:text-blue-100" asChild>
                      <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">
                        Google Cloud Console <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button></div>
                    <div>2. Create Service Account → Download JSON key</div>
                    <div className="text-xs text-slate-400 mt-1">✨ No folder setup needed - system auto-creates everything!</div>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FTP */}
        <TabsContent value="ftp">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">FTP Server Configuration</CardTitle>
              <CardDescription className="text-slate-400">
                Configure FTP server connection for file storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ftp-host" className="text-slate-300">Host</Label>
                  <Input
                    id="ftp-host"
                    value={config.ftp.host}
                    onChange={(e) => handleConfigChange('ftp', 'host', e.target.value)}
                    placeholder="ftp.example.com"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ftp-port" className="text-slate-300">Port</Label>
                  <Input
                    id="ftp-port"
                    type="number"
                    value={config.ftp.port}
                    onChange={(e) => handleConfigChange('ftp', 'port', parseInt(e.target.value))}
                    placeholder="21"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ftp-username" className="text-slate-300">Username</Label>
                  <Input
                    id="ftp-username"
                    value={config.ftp.username}
                    onChange={(e) => handleConfigChange('ftp', 'username', e.target.value)}
                    placeholder="FTP Username"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ftp-password" className="text-slate-300">Password</Label>
                  <Input
                    id="ftp-password"
                    type="password"
                    value={config.ftp.password}
                    onChange={(e) => handleConfigChange('ftp', 'password', e.target.value)}
                    placeholder="FTP Password"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ftp-base-path" className="text-slate-300">Base Path</Label>
                <Input
                  id="ftp-base-path"
                  value={config.ftp.base_path}
                  onChange={(e) => handleConfigChange('ftp', 'base_path', e.target.value)}
                  placeholder="/spades_data"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="ftp-secure"
                  checked={config.ftp.secure}
                  onCheckedChange={(checked) => handleConfigChange('ftp', 'secure', checked)}
                />
                <Label htmlFor="ftp-secure" className="text-slate-300">Use FTPS (Secure FTP)</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Amazon S3 */}
        <TabsContent value="s3">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Amazon S3 Configuration</CardTitle>
              <CardDescription className="text-slate-400">
                Configure AWS S3 credentials for file storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s3-access-key" className="text-slate-300">Access Key</Label>
                  <Input
                    id="s3-access-key"
                    value={config.s3.access_key}
                    onChange={(e) => handleConfigChange('s3', 'access_key', e.target.value)}
                    placeholder="AWS Access Key"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="s3-secret-key" className="text-slate-300">Secret Key</Label>
                  <Input
                    id="s3-secret-key"
                    type="password"
                    value={config.s3.secret_key}
                    onChange={(e) => handleConfigChange('s3', 'secret_key', e.target.value)}
                    placeholder="AWS Secret Key"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s3-bucket" className="text-slate-300">Bucket Name</Label>
                  <Input
                    id="s3-bucket"
                    value={config.s3.bucket}
                    onChange={(e) => handleConfigChange('s3', 'bucket', e.target.value)}
                    placeholder="your-bucket-name"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="s3-region" className="text-slate-300">Region</Label>
                  <Select value={config.s3.region} onValueChange={(value) => handleConfigChange('s3', 'region', value)}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                      <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                      <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                      <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                      <SelectItem value="eu-central-1">Europe (Frankfurt)</SelectItem>
                      <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="s3-endpoint" className="text-slate-300">Custom Endpoint (Optional)</Label>
                  <Input
                    id="s3-endpoint"
                    value={config.s3.endpoint}
                    onChange={(e) => handleConfigChange('s3', 'endpoint', e.target.value)}
                    placeholder="https://your-s3-compatible-endpoint.com"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-400">
                    Leave empty for AWS S3. Use for Supabase, MinIO, or other S3-compatible services.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supabase */}
        <TabsContent value="supabase">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Supabase Configuration</CardTitle>
              <CardDescription className="text-slate-400">
                Configure Supabase database for data storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supabase-url" className="text-slate-300">Project URL</Label>
                <Input
                  id="supabase-url"
                  value={config.supabase.url}
                  onChange={(e) => handleConfigChange('supabase', 'url', e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supabase-anon-key" className="text-slate-300">Anon Key</Label>
                <Input
                  id="supabase-anon-key"
                  type="password"
                  value={config.supabase.anon_key}
                  onChange={(e) => handleConfigChange('supabase', 'anon_key', e.target.value)}
                  placeholder="Your Supabase Anon Key"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supabase-bucket-name" className="text-slate-300">Bucket Name</Label>
                <Input
                  id="supabase-bucket-name"
                  value={config.supabase.bucket_name}
                  onChange={(e) => handleConfigChange('supabase', 'bucket_name', e.target.value)}
                  placeholder="score"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              
              <Alert className="border-blue-500/30 bg-blue-500/10">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200">
                  Create a Supabase project and get your credentials from the dashboard.
                  <Button variant="link" className="p-0 ml-1 text-blue-300 hover:text-blue-100" asChild>
                    <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                      Open Supabase Dashboard <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              className="flex items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-700/50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={testing}
                className="flex items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-700/50"
              >
                {testing ? (
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Test & Create Files
              </Button>
              
              <Button
                onClick={saveConfiguration}
                disabled={loading}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white"
              >
                {loading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Configuration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Structure Info */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5 text-amber-400" />
            Test File Structure
          </CardTitle>
          <CardDescription className="text-slate-400">
            Test creates these files to verify storage functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-amber-400" />
              <span className="font-mono">games/test-game.json</span>
              <span className="text-slate-400">- Sample game data</span>
            </div>
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-amber-400" />
              <span className="font-mono">players/test-player.json</span>
              <span className="text-slate-400">- Sample player data</span>
            </div>
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-amber-400" />
              <span className="font-mono">profiles/test-profile.json</span>
              <span className="text-slate-400">- Sample profile data</span>
            </div>
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-amber-400" />
              <span className="font-mono">test/connection-test.json</span>
              <span className="text-slate-400">- Connection verification</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 