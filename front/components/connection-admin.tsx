"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import apiService from "@/lib/api-service"
import { 
  Wifi, 
  WifiOff, 
  Server, 
  Globe, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  Settings
} from "lucide-react"

interface ConnectionTest {
  url: string
  status: 'testing' | 'success' | 'error'
  responseTime?: number
  error?: string
}

export function ConnectionAdmin() {
  const [testUrls, setTestUrls] = useState<string[]>([
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://backend:3001' // Docker network backend (NO RAILWAY)
  ])
  const [newUrl, setNewUrl] = useState('')
  const [testResults, setTestResults] = useState<ConnectionTest[]>([])
  const [testing, setTesting] = useState(false)
  const [loginTestResult, setLoginTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const { toast } = useToast()

  const testConnection = async (url: string): Promise<ConnectionTest> => {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000) // 8 second timeout
      })
      
      const responseTime = Date.now() - startTime
      
      if (response.ok) {
        return {
          url,
          status: 'success',
          responseTime
        }
      } else {
        return {
          url,
          status: 'error',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        url,
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const runConnectionTests = async () => {
    setTesting(true)
    setTestResults([])
    
    const results: ConnectionTest[] = []
    
    for (const url of testUrls) {
      // Set initial testing state
      setTestResults(prev => [...prev, { url, status: 'testing' }])
      
      const result = await testConnection(url)
      results.push(result)
      
      // Update with result
      setTestResults(prev => prev.map(r => r.url === url ? result : r))
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    setTesting(false)
    
    // Show summary toast
    const successful = results.filter(r => r.status === 'success').length
    const total = results.length
    
    if (successful > 0) {
      toast({
        title: "✅ Connection Tests Complete",
        description: `${successful}/${total} connections successful`,
        duration: 3000,
      })
    } else {
      toast({
        title: "❌ Connection Tests Failed",
        description: "No connections were successful",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  const testLoginFlow = async () => {
    setLoginTestResult('testing')
    
    try {
      const result = await apiService.playerLogin('connectiontest')
      
      if (result.success) {
        setLoginTestResult('success')
        toast({
          title: "✅ Login Test Successful!",
          description: "API connection and login flow working correctly",
          duration: 3000,
        })
      } else {
        setLoginTestResult('error')
        toast({
          title: "❌ Login Test Failed",
          description: result.error || "Login API returned error",
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      setLoginTestResult('error')
      toast({
        title: "❌ Login Test Failed",
        description: error instanceof Error ? error.message : "Network error",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  const addTestUrl = () => {
    if (newUrl.trim() && !testUrls.includes(newUrl.trim())) {
      setTestUrls(prev => [...prev, newUrl.trim()])
      setNewUrl('')
    }
  }

  const removeTestUrl = (urlToRemove: string) => {
    setTestUrls(prev => prev.filter(url => url !== urlToRemove))
    setTestResults(prev => prev.filter(result => result.url !== urlToRemove))
  }

  const getStatusIcon = (status: ConnectionTest['status']) => {
    switch (status) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />
      default:
        return <Server className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: ConnectionTest['status']) => {
    switch (status) {
      case 'testing':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">Testing...</Badge>
      case 'success':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400">Success</Badge>
      case 'error':
        return <Badge variant="secondary" className="bg-red-500/20 text-red-400">Error</Badge>
      default:
        return <Badge variant="secondary" className="bg-gray-500/20 text-gray-400">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-amber-400" />
            Connection Admin
          </h2>
          <p className="text-slate-300">Test and manage backend connections</p>
        </div>
        <Button
          onClick={runConnectionTests}
          disabled={testing}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <TestTube className="h-4 w-4 mr-2" />
          )}
          {testing ? 'Testing...' : 'Run Tests'}
        </Button>
      </div>

      {/* URL Management */}
      <Card className="bg-slate-800/80 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-amber-400" />
            Test URLs
          </CardTitle>
          <CardDescription className="text-slate-300">
            Add or remove URLs to test backend connections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new URL */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="new-url" className="text-white">Add URL</Label>
              <Input
                id="new-url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://your-backend-url.com"
                className="bg-slate-700/50 border-slate-600"
              />
            </div>
            <Button
              onClick={addTestUrl}
              disabled={!newUrl.trim()}
              variant="outline"
              className="border-slate-600 hover:bg-slate-700 mt-6"
            >
              Add
            </Button>
          </div>

          {/* URL List */}
          <div className="space-y-2">
            {testUrls.map((url) => (
              <div key={url} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Server className="h-4 w-4 text-slate-400" />
                  <span className="text-white font-mono text-sm">{url}</span>
                </div>
                <Button
                  onClick={() => removeTestUrl(url)}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card className="bg-slate-800/80 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TestTube className="h-5 w-5 text-amber-400" />
            Connection Test Results
          </CardTitle>
          <CardDescription className="text-slate-300">
            Results from the latest connection tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <div className="text-center py-8">
              <TestTube className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No test results yet. Run tests to see results.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.map((result) => (
                <div
                  key={result.url}
                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="text-white font-mono text-sm">{result.url}</p>
                      {result.responseTime && (
                        <p className="text-slate-400 text-xs">
                          Response time: {result.responseTime}ms
                        </p>
                      )}
                      {result.error && (
                        <p className="text-red-400 text-xs">
                          Error: {result.error}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login Flow Test */}
      <Card className="bg-slate-800/80 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wifi className="h-5 w-5 text-amber-400" />
            Login Flow Test
          </CardTitle>
          <CardDescription className="text-slate-300">
            Test the complete login flow using the centralized API service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
            <div className="flex items-center gap-3">
              {loginTestResult === 'testing' ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              ) : loginTestResult === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : loginTestResult === 'error' ? (
                <XCircle className="h-4 w-4 text-red-400" />
              ) : (
                <Wifi className="h-4 w-4 text-slate-400" />
              )}
              <div>
                <p className="text-white">Centralized API Login Test</p>
                <p className="text-slate-400 text-xs">
                  Tests the complete login flow using apiService
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loginTestResult !== 'idle' && getStatusBadge(loginTestResult === 'testing' ? 'testing' : loginTestResult === 'success' ? 'success' : 'error')}
              <Button
                onClick={testLoginFlow}
                disabled={loginTestResult === 'testing'}
                variant="outline"
                className="border-slate-600 hover:bg-slate-700"
              >
                {loginTestResult === 'testing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Test Login</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 