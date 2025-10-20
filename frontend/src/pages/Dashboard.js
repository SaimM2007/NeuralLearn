import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Brain, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const [analyticsRes, docsRes] = await Promise.all([
        axios.get(`${API}/analytics/user/${user.id}`),
        axios.get(`${API}/documents/user/${user.id}`)
      ]);
      setAnalytics(analyticsRes.data);
      setRecentDocs(docsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Study Time',
      value: `${analytics?.total_study_time_minutes || 0}`,
      unit: 'minutes',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
      testId: 'stat-study-time'
    },
    {
      title: 'Quizzes Taken',
      value: analytics?.total_quizzes_taken || 0,
      unit: 'quizzes',
      icon: Brain,
      color: 'bg-green-50 text-green-600',
      testId: 'stat-quizzes-taken'
    },
    {
      title: 'Average Score',
      value: `${Math.round((analytics?.average_score || 0) * 100)}`,
      unit: '%',
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600',
      testId: 'stat-average-score'
    },
    {
      title: 'Documents',
      value: recentDocs.length,
      unit: 'uploaded',
      icon: BookOpen,
      color: 'bg-orange-50 text-orange-600',
      testId: 'stat-documents'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30" data-testid="dashboard-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-lg text-gray-600">Your intelligent study companion for AI, ML, and Computer Science</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="card-hover" data-testid={stat.testId}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                      <div className="flex items-baseline space-x-2">
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                        <span className="text-sm text-gray-500">{stat.unit}</span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="border-2 border-blue-100 hover:border-blue-300 transition-colors cursor-pointer" data-testid="quick-action-upload">
            <CardHeader>
              <CardTitle className="text-xl">Upload & Study Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Upload PDFs, lecture notes, or research papers. Our AI will index, summarize, and make them searchable.
              </p>
              <Button onClick={() => navigate('/study')} className="w-full" data-testid="btn-go-to-study">
                Start Studying <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-100 hover:border-green-300 transition-colors cursor-pointer" data-testid="quick-action-quiz">
            <CardHeader>
              <CardTitle className="text-xl">Take Adaptive Quizzes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Test your knowledge with AI-generated quizzes that adapt to your learning progress and difficulty level.
              </p>
              <Button onClick={() => navigate('/quiz')} variant="outline" className="w-full" data-testid="btn-go-to-quiz">
                Take a Quiz <Brain className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Documents */}
        <Card data-testid="recent-documents-section">
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDocs.length === 0 ? (
              <div className="text-center py-8" data-testid="no-documents-message">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No documents uploaded yet</p>
                <Button onClick={() => navigate('/study')} variant="link" className="mt-2" data-testid="btn-upload-first-doc">
                  Upload your first document
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    data-testid={`doc-item-${doc.id}`}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.filename}</p>
                        <p className="text-sm text-gray-500">
                          Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate('/study')}
                      data-testid={`btn-open-doc-${doc.id}`}
                    >
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Topic Mastery Preview */}
        {analytics?.topic_mastery && analytics.topic_mastery.length > 0 && (
          <Card className="mt-6" data-testid="topic-mastery-preview">
            <CardHeader>
              <CardTitle>Topic Mastery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topic_mastery.slice(0, 5).map((topic, index) => (
                  <div key={index} data-testid={`mastery-topic-${index}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{topic.topic}</span>
                      <span className="text-sm text-gray-600">{Math.round(topic.mastery_score * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${topic.mastery_score * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => navigate('/analytics')}
                variant="link"
                className="mt-4 w-full"
                data-testid="btn-view-full-analytics"
              >
                View Full Analytics <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default Dashboard;