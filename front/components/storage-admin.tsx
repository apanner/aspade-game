'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { Trash2, Eye, RefreshCw, HardDrive, Database, FileText, Users, Gamepad2, UserCheck, Link } from 'lucide-react';

interface StorageStatus {
  provider: string;
  connected: boolean;
  config: any;
}

interface StorageFile {
  key: string;
  size: number;
  lastModified: string;
  type: 'game' | 'player' | 'profile' | 'session' | 'history' | 'other';
}

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  gameFiles: number;
  gameSize: number;
  gameSizeFormatted: string;
  playerFiles: number;
  playerSize: number;
  playerSizeFormatted: string;
  profileFiles: number;
  profileSize: number;
  profileSizeFormatted: string;
  sessionFiles: number;
  sessionSize: number;
  sessionSizeFormatted: string;
  otherFiles: number;
  otherSize: number;
  otherSizeFormatted: string;
  lastSync: string;
}

export function StorageAdmin() {
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<{ key: string; content: string } | null>(null);
  const [newFileKey, setNewFileKey] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [stats, setStats] = useState<StorageStats | null>(null);

  const fetchStorageStatus = async () => {
    try {
      const response = await fetch('/api/admin/storage/config');
      const data = await response.json();
      setStorageStatus(data);
    } catch (error) {
      console.error('Failed to fetch storage status:', error);
    }
  };

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/storage/files');
      const data = await response.json();
      setFiles(data.files || []);
      setStats(data.stats || null);
      setSelectedFiles(new Set()); // Clear selections on refresh
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelection = (fileKey: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileKey);
    } else {
      newSelected.delete(fileKey);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(filteredFiles.map(f => f.key)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const viewFile = async (key: string) => {
    try {
      const response = await fetch(`/api/admin/storage/file/${encodeURIComponent(key)}`);
      const data = await response.json();
      setSelectedFile({ key, content: JSON.stringify(data, null, 2) });
    } catch (error) {
      console.error('Failed to view file:', error);
      alert('Failed to load file');
    }
  };

  const saveFile = async (key: string, content: string) => {
    try {
      const response = await fetch(`/api/admin/storage/file/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: JSON.parse(content) })
      });
      
      if (response.ok) {
        alert('File saved successfully');
        setSelectedFile(null);
        fetchFiles();
      } else {
        alert('Failed to save file');
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file');
    }
  };

  const deleteFile = async (key: string) => {
    if (!confirm(`Are you sure you want to delete ${key}?`)) return;
    
    try {
      const response = await fetch(`/api/admin/storage/file/${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('File deleted successfully');
        fetchFiles();
      } else {
        alert('Failed to delete file');
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    }
  };

  const handleDeleteSelectedFiles = async () => {
    const fileKeys = Array.from(selectedFiles);
    
    try {
      setIsLoading(true);
      let deletedCount = 0;
      
      for (const key of fileKeys) {
        try {
          const response = await fetch(`/api/admin/storage/file/${encodeURIComponent(key)}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            deletedCount++;
          }
        } catch (error) {
          console.error(`Failed to delete ${key}:`, error);
        }
      }
      
      alert(`Successfully deleted ${deletedCount}/${fileKeys.length} files`);
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (error) {
      console.error('Failed to delete files:', error);
      alert('Failed to delete selected files');
    } finally {
      setIsLoading(false);
    }
  };

  const createFile = async () => {
    if (!newFileKey || !newFileContent) {
      alert('Please provide both key and content');
      return;
    }

    try {
      const response = await fetch(`/api/admin/storage/file/${encodeURIComponent(newFileKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: JSON.parse(newFileContent) })
      });
      
      if (response.ok) {
        alert('File created successfully');
        setNewFileKey('');
        setNewFileContent('');
        fetchFiles();
      } else {
        alert('Failed to create file');
      }
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file');
    }
  };

  const testStorage = async () => {
    try {
      const response = await fetch('/api/admin/storage/test', { method: 'POST' });
      const data = await response.json();
      alert(`Storage Test Results:\n\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('Storage test failed:', error);
      alert('Storage test failed');
    }
  };

  const syncStorage = async () => {
    try {
      const response = await fetch('/api/admin/storage/sync', { method: 'POST' });
      const data = await response.json();
      alert(`Sync Results:\n\n${JSON.stringify(data, null, 2)}`);
      fetchFiles();
    } catch (error) {
      console.error('Storage sync failed:', error);
      alert('Storage sync failed');
    }
  };

  useEffect(() => {
    fetchStorageStatus();
    fetchFiles();
  }, []);

  const filteredFiles = files.filter(file => 
    file.key.toLowerCase().includes(filter.toLowerCase())
  );

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'game': return 'bg-blue-500';
      case 'player': return 'bg-green-500';
      case 'profile': return 'bg-teal-500';
      case 'session': return 'bg-orange-500';
      case 'history': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'game': return <Gamepad2 className="h-4 w-4" />;
      case 'player': return <Users className="h-4 w-4" />;
      case 'profile': return <UserCheck className="h-4 w-4" />;
      case 'session': return <Link className="h-4 w-4" />;
      case 'history': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 's3': return '🗄️';
      case 'local': return '📁';
      case 'supabase': return '🔗';
      default: return '💾';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Admin Panel
          </CardTitle>
          <CardDescription>
            Manage backend storage files and monitor space utilization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {storageStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getProviderIcon(storageStatus.provider)}</span>
                <Badge className={storageStatus.connected ? 'bg-green-500' : 'bg-red-500'}>
                  {storageStatus.provider.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-500">
                  {storageStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <Button onClick={fetchFiles} disabled={isLoading} className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Files
              </Button>
              
              <Button onClick={testStorage} variant="outline" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Test Storage
              </Button>
            </div>
          )}

          {/* Enhanced Storage Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200">Total Storage</h3>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalSizeFormatted}</div>
                  <div className="text-sm text-blue-600 dark:text-blue-300">{stats.totalFiles} files</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gamepad2 className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-800 dark:text-green-200">Games</h3>
                  </div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.gameSizeFormatted}</div>
                  <div className="text-sm text-green-600 dark:text-green-300">{stats.gameFiles} files</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-teal-600" />
                    <h3 className="font-semibold text-teal-800 dark:text-teal-200">Players</h3>
                  </div>
                  <div className="text-2xl font-bold text-teal-900 dark:text-teal-100">{stats.playerSizeFormatted}</div>
                  <div className="text-sm text-teal-600 dark:text-teal-300">{stats.playerFiles} files</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-800 dark:text-purple-200">Profiles</h3>
                  </div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.profileSizeFormatted}</div>
                  <div className="text-sm text-purple-600 dark:text-purple-300">{stats.profileFiles} files</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Link className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold text-orange-800 dark:text-orange-200">Sessions</h3>
                  </div>
                  <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.sessionSizeFormatted}</div>
                  <div className="text-sm text-orange-600 dark:text-orange-300">{stats.sessionFiles} files</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">Other Files</h3>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.otherSizeFormatted}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{stats.otherFiles} files</div>
                </CardContent>
              </Card>
            </div>
          )}

<Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="files">Files Browser</TabsTrigger>
          <TabsTrigger value="create">Create File</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Files Browser
                  </CardTitle>
                  <CardDescription>
                    View, edit, and delete storage files
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedFiles.size > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-1">
                          <Trash2 className="h-4 w-4" />
                          Delete ({selectedFiles.size})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Selected Files</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedFiles.size} file(s)? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteSelectedFiles}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <Input
                  placeholder="Filter files..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading files...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map((file) => (
                      <TableRow key={file.key}>
                        <TableCell>
                          <Checkbox
                            checked={selectedFiles.has(file.key)}
                            onCheckedChange={(checked) => handleFileSelection(file.key, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{file.key}</TableCell>
                        <TableCell>
                          <Badge className={`${getFileTypeColor(file.type)} text-white flex items-center gap-1 w-fit`}>
                            {getFileTypeIcon(file.type)}
                            {file.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatBytes(file.size)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewFile(file.key)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteFile(file.key)}
                              className="gap-1"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              
              {filteredFiles.length === 0 && !isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  No files found matching your search.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New File</CardTitle>
              <CardDescription>
                Create a new file in storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="File path (e.g., games/NEW_GAME.json)"
                value={newFileKey}
                onChange={(e) => setNewFileKey(e.target.value)}
              />
              <Textarea
                placeholder='File content (JSON format) - e.g., {"key": "value"}'
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                rows={10}
              />
              <Button onClick={createFile}>Create File</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Statistics</CardTitle>
              <CardDescription>
                Detailed storage usage and file statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Last updated: {new Date(stats.lastSync).toLocaleString()}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">File Distribution</h3>
                      <div className="space-y-1 text-sm">
                        <div>Games: {stats.gameFiles} files</div>
                        <div>Players: {stats.playerFiles} files</div>
                        <div>Profiles: {stats.profileFiles} files</div>
                        <div>Sessions: {stats.sessionFiles} files</div>
                        <div>Other: {stats.otherFiles} files</div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-2">Space Usage</h3>
                      <div className="space-y-1 text-sm">
                        <div>Games: {stats.gameSizeFormatted}</div>
                        <div>Players: {stats.playerSizeFormatted}</div>
                        <div>Profiles: {stats.profileSizeFormatted}</div>
                        <div>Sessions: {stats.sessionSizeFormatted}</div>
                        <div>Other: {stats.otherSizeFormatted}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>No statistics available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File View Dialog */}
      {selectedFile && (
        <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>File: {selectedFile.key}</DialogTitle>
              <DialogDescription>
                View and edit file content
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-96">
              <Textarea
                value={selectedFile.content}
                onChange={(e) => setSelectedFile({ ...selectedFile, content: e.target.value })}
                rows={20}
                className="font-mono text-sm"
              />
            </ScrollArea>
            <div className="flex gap-2">
              <Button onClick={() => saveFile(selectedFile.key, selectedFile.content)}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setSelectedFile(null)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
        </CardContent>
      </Card>
    </div>
  );
} 