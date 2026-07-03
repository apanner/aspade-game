"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Bug, Smartphone, Wifi, Database } from "lucide-react"

// Extend Window interface to include our test function
declare global {
  interface Window {
    testMobileFixes?: () => Promise<{
      mobileDetected: boolean
      storageResults: {
        localStorage?: { success: boolean; error?: string }
        sessionStorage?: { success: boolean; error?: string }
      }
      networkWorking: boolean
      allWorking: boolean
    }>
  }
}

export default function DebugPage() {
  useEffect(() => {
    // Load the test script
    const loadTestScript = async () => {
      try {
        const response = await fetch('/test-mobile-fixes.js')
        const script = await response.text()
        eval(script)
        console.log('🧪 Mobile test script loaded successfully')
      } catch (error) {
        console.error('Failed to load test script:', error)
      }
    }

    loadTestScript()
  }, [])

  const runMobileTest = async () => {
    if (typeof window !== 'undefined' && window.testMobileFixes) {
      const results = await window.testMobileFixes()
      console.log('📊 Test Results:', results)
      
      // Show results in a more user-friendly way
      alert(`Mobile Test Results:
- Mobile Detected: ${results.mobileDetected ? 'Yes' : 'No'}
- localStorage: ${results.storageResults.localStorage?.success ? 'Working' : 'Failed'}
- sessionStorage: ${results.storageResults.sessionStorage?.success ? 'Working' : 'Failed'}
- Network: ${results.networkWorking ? 'Working' : 'Failed'}
- Overall: ${results.allWorking ? '✅ All Tests Passed' : '❌ Some Tests Failed'}`)
    } else {
      alert('Test script not loaded. Check console for details.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-2xl shadow-2xl border border-slate-600/50 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-4">
            <div className="bg-red-500/20 rounded-full p-4 border-2 border-red-500/30">
              <Bug className="h-12 w-12 text-red-400" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">Debug Tools</h1>
              <p className="text-sm text-red-400/90 font-medium">Mobile Compatibility Testing</p>
            </div>
          </div>
        </div>

        {/* Mobile Test Card */}
        <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Smartphone className="h-6 w-6 text-blue-400" />
              Mobile Compatibility Test
            </CardTitle>
            <CardDescription className="text-slate-400">
              Test mobile browser compatibility and storage access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm">
                This test will check mobile detection, storage compatibility, and network connectivity.
                Results will be shown in both console and alert.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={runMobileTest}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-300"
            >
              <Bug className="h-5 w-5 mr-2" />
              Run Mobile Test
            </Button>
          </CardContent>
        </Card>

        {/* Manual Tests */}
        <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Database className="h-6 w-6 text-green-400" />
              Manual Storage Tests
            </CardTitle>
            <CardDescription className="text-slate-400">
              Test individual storage methods manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              onClick={() => {
                try {
                  localStorage.setItem('test_manual', 'test_value')
                  const value = localStorage.getItem('test_manual')
                  localStorage.removeItem('test_manual')
                  alert(`localStorage Test: ${value === 'test_value' ? '✅ Working' : '❌ Failed'}`)
                } catch (error: any) {
                  alert(`localStorage Test: ❌ Failed - ${error.message}`)
                }
              }}
              className="w-full border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            >
              Test localStorage
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => {
                try {
                  sessionStorage.setItem('test_manual', 'test_value')
                  const value = sessionStorage.getItem('test_manual')
                  sessionStorage.removeItem('test_manual')
                  alert(`sessionStorage Test: ${value === 'test_value' ? '✅ Working' : '❌ Failed'}`)
                } catch (error: any) {
                  alert(`sessionStorage Test: ❌ Failed - ${error.message}`)
                }
              }}
              className="w-full border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            >
              Test sessionStorage
            </Button>
          </CardContent>
        </Card>

        {/* Network Test */}
        <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Wifi className="h-6 w-6 text-amber-400" />
              Network Connection Test
            </CardTitle>
            <CardDescription className="text-slate-400">
              Test backend connectivity and API endpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  const response = await fetch('/api/health')
                  if (response.ok) {
                    const data = await response.json()
                    alert(`Network Test: ✅ Working\nStatus: ${data.status || 'OK'}`)
                  } else {
                    alert(`Network Test: ❌ Failed\nStatus: ${response.status}`)
                  }
                } catch (error: any) {
                  alert(`Network Test: ❌ Failed\nError: ${error.message}`)
                }
              }}
              className="w-full border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            >
              Test Backend Connection
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>1. <strong>Run Mobile Test:</strong> Tests all mobile compatibility features</p>
            <p>2. <strong>Manual Tests:</strong> Test individual storage methods</p>
            <p>3. <strong>Network Test:</strong> Test backend connectivity</p>
            <p>4. <strong>Check Console:</strong> Open browser console for detailed logs</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 