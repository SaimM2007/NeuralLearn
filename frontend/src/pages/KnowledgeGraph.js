import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import ForceGraph2D from 'react-force-graph-2d';
import { Network, Loader2, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function KnowledgeGraph({ user }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Manual input for graph generation
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents/user/${user.id}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const generateGraph = async (docId = null, manualContent = null, manualTopic = null) => {
    setGenerating(true);
    const formData = new FormData();
    formData.append('user_id', user.id);
    formData.append('document_id', docId || 0);
    formData.append('content', manualContent || content);
    formData.append('topic', manualTopic || topic);

    try {
      const response = await axios.post(`${API}/knowledge-graph/generate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const data = response.data.graph_data;
      
      // Transform for react-force-graph
      const transformedData = {
        nodes: data.nodes.map(node => ({
          id: node.id,
          name: node.label,
          type: node.type,
          color: node.type === 'core' ? '#3b82f6' : node.type === 'supporting' ? '#10b981' : '#6b7280'
        })),
        links: data.edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          label: edge.relationship
        }))
      };
      
      setGraphData(transformedData);
      toast.success('Knowledge graph generated!');
    } catch (error) {
      toast.error('Failed to generate knowledge graph');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const loadGraphForDocument = async (doc) => {
    setSelectedDoc(doc);
    setLoading(true);
    try {
      const response = await axios.get(`${API}/knowledge-graph/document/${doc.id}`);
      const data = response.data.graph_data;
      
      const transformedData = {
        nodes: data.nodes.map(node => ({
          id: node.id,
          name: node.label,
          type: node.type,
          color: node.type === 'core' ? '#3b82f6' : node.type === 'supporting' ? '#10b981' : '#6b7280'
        })),
        links: data.edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          label: edge.relationship
        }))
      };
      
      setGraphData(transformedData);
    } catch (error) {
      // If graph doesn't exist, offer to generate it
      toast.info('No knowledge graph found. Generating one now...');
      generateGraph(doc.id, doc.content_preview, doc.filename);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="knowledge-graph-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Graph</h1>
          <p className="text-gray-600">Visualize relationships between concepts in your study materials</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Generate from Text */}
            <Card data-testid="manual-graph-generation">
              <CardHeader>
                <CardTitle className="text-lg">Generate Graph</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Machine Learning"
                    data-testid="graph-topic-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste text to visualize..."
                    rows={5}
                    data-testid="graph-content-input"
                  />
                </div>
                <Button
                  onClick={() => generateGraph()}
                  disabled={generating || !topic || !content}
                  className="w-full"
                  data-testid="generate-graph-button"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Network className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Documents List */}
            <Card data-testid="documents-list-kg">
              <CardHeader>
                <CardTitle className="text-lg">From Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4" data-testid="no-documents-kg">
                    No documents uploaded
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => loadGraphForDocument(doc)}
                        data-testid={`doc-kg-${doc.id}`}
                        className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.filename}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card data-testid="graph-legend">
              <CardHeader>
                <CardTitle className="text-lg">Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-blue-600"></div>
                  <span className="text-sm text-gray-700">Core Concept</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-green-600"></div>
                  <span className="text-sm text-gray-700">Supporting</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-gray-600"></div>
                  <span className="text-sm text-gray-700">Detail</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graph Visualization */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-200px)]" data-testid="graph-canvas">
              <CardContent className="p-0 h-full">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Loading knowledge graph...</p>
                    </div>
                  </div>
                ) : !graphData ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md px-4">
                      <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Graph Generated</h3>
                      <p className="text-gray-600 mb-4">
                        Generate a knowledge graph from your documents or paste content to visualize concept relationships.
                      </p>
                      <div className="flex items-start space-x-2 text-left bg-blue-50 p-4 rounded-lg">
                        <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900 mb-1">Tip:</p>
                          <p className="text-sm text-blue-800">
                            Click on nodes to explore concepts. The graph shows how different ideas connect and relate to each other.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ForceGraph2D
                    graphData={graphData}
                    nodeLabel="name"
                    nodeColor="color"
                    nodeRelSize={8}
                    linkLabel="label"
                    linkDirectionalArrowLength={6}
                    linkDirectionalArrowRelPos={1}
                    linkColor={() => '#94a3b8'}
                    backgroundColor="#ffffff"
                    width={window.innerWidth > 1024 ? window.innerWidth * 0.6 : window.innerWidth - 100}
                    height={window.innerHeight - 250}
                    onNodeClick={(node) => {
                      toast.info(`Concept: ${node.name}`, {
                        description: `Type: ${node.type}`
                      });
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KnowledgeGraph;