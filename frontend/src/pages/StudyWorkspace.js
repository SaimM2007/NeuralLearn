import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Send, Loader2, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function StudyWorkspace({ user }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [mode, setMode] = useState('Quick Learner');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents/user/${user.id}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', user.id);

    try {
      const response = await axios.post(`${API}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`${file.name} uploaded successfully!`);
      setMessages([{
        role: 'assistant',
        content: `I've indexed "${file.name}". Here's a summary:\n\n${response.data.summary}\n\nFeel free to ask me anything about this document!`,
        sources: []
      }]);
      loadDocuments();
    } catch (error) {
      toast.error('Failed to upload document');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/query`, {
        query: query,
        user_id: user.id,
        mode: mode
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources || []
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to get response');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please try again.',
        sources: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="study-workspace-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Workspace</h1>
          <p className="text-gray-600">Upload documents and chat with your AI study assistant</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Documents & Settings */}
          <div className="lg:col-span-1 space-y-4">
            {/* Upload Section */}
            <Card data-testid="upload-section">
              <CardHeader>
                <CardTitle className="text-lg">Upload Document</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf"
                  className="hidden"
                  data-testid="file-input"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                  data-testid="upload-button"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload PDF
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Mode Selection */}
            <Card data-testid="mode-selection">
              <CardHeader>
                <CardTitle className="text-lg">Study Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger data-testid="mode-selector">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quick Learner" data-testid="mode-quick">Quick Learner</SelectItem>
                    <SelectItem value="Deep Thinker" data-testid="mode-deep">Deep Thinker</SelectItem>
                    <SelectItem value="Code Mentor" data-testid="mode-code">Code Mentor</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">
                  {mode === 'Quick Learner' && 'Concise summaries and key points'}
                  {mode === 'Deep Thinker' && 'Detailed explanations with reasoning'}
                  {mode === 'Code Mentor' && 'Code examples and debugging guidance'}
                </p>
              </CardContent>
            </Card>

            {/* Documents List */}
            <Card data-testid="documents-list">
              <CardHeader>
                <CardTitle className="text-lg">My Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500" data-testid="no-documents">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No documents yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          data-testid={`document-${doc.id}`}
                          className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.filename}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right - Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-250px)]" data-testid="chat-interface">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                  AI Study Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[calc(100%-80px)]">
                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                  {messages.length === 0 ? (
                    <div className="text-center py-12" data-testid="empty-chat">
                      <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to help you learn!</h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        Upload a document and start asking questions. I can summarize, explain concepts, and help you understand complex topics.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          data-testid={`message-${index}`}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-4 ${
                              message.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-300">
                                <p className="text-xs font-semibold mb-2">Sources:</p>
                                <div className="space-y-1">
                                  {message.sources.map((source, idx) => (
                                    <p key={idx} className="text-xs opacity-75">
                                      • {source.content.substring(0, 100)}...
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {loading && (
                        <div className="flex justify-start" data-testid="loading-message">
                          <div className="bg-gray-100 rounded-lg p-4">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="border-t p-4">
                  <div className="flex space-x-2">
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !loading && handleQuery()}
                      placeholder="Ask me anything about your documents..."
                      disabled={loading || documents.length === 0}
                      data-testid="query-input"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleQuery}
                      disabled={loading || !query.trim() || documents.length === 0}
                      data-testid="send-button"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudyWorkspace;
