import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Clock, Brain, TrendingUp, Award } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Analytics({ user }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/user/${user.id}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const radarData = analytics?.topic_mastery?.map(topic => ({
    topic: topic.topic.length > 20 ? topic.topic.substring(0, 20) + '...' : topic.topic,
    mastery: topic.mastery_score * 100,
    fullTopic: topic.topic
  })) || [];

  const barData = analytics?.topic_mastery?.map(topic => ({
    name: topic.topic.length > 15 ? topic.topic.substring(0, 15) + '...' : topic.topic,
    'Study Time (min)': topic.study_time,
    'Quizzes Taken': topic.quizzes_taken,
    fullName: topic.topic
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="analytics-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Analytics</h1>
          <p className="text-gray-600">Track your progress and identify areas for improvement</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="stat-total-study-time">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Study Time</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {analytics?.total_study_time_minutes || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">minutes</p>
                </div>
                <Clock className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-quizzes-completed">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Quizzes Completed</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {analytics?.total_quizzes_taken || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">total</p>
                </div>
                <Brain className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-average-score">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Average Score</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round((analytics?.average_score || 0) * 100)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">percent</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-topics-studied">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Topics Studied</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {analytics?.topic_mastery?.length || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">topics</p>
                </div>
                <Award className="w-10 h-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {analytics?.topic_mastery && analytics.topic_mastery.length > 0 ? (
          <>
            {/* Topic Mastery Radar Chart */}
            <Card className="mb-8" data-testid="mastery-radar-chart">
              <CardHeader>
                <CardTitle>Topic Mastery Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="topic" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Mastery %"
                      dataKey="mastery"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Study Activity Bar Chart */}
            <Card className="mb-8" data-testid="study-activity-chart">
              <CardHeader>
                <CardTitle>Study Activity by Topic</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Study Time (min)" fill="#3b82f6" />
                    <Bar dataKey="Quizzes Taken" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Detailed Topic Breakdown */}
            <Card data-testid="topic-breakdown">
              <CardHeader>
                <CardTitle>Topic Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {analytics.topic_mastery.map((topic, index) => (
                    <div key={index} data-testid={`topic-detail-${index}`} className="border-b pb-6 last:border-0">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{topic.topic}</h3>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Mastery Score</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {Math.round(topic.mastery_score * 100)}%
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${topic.mastery_score * 100}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Study Time</p>
                          <p className="text-lg font-semibold text-gray-900">{topic.study_time} min</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Quizzes Taken</p>
                          <p className="text-lg font-semibold text-gray-900">{topic.quizzes_taken}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Performance</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {topic.mastery_score >= 0.8
                              ? 'Excellent'
                              : topic.mastery_score >= 0.6
                              ? 'Good'
                              : 'Needs Practice'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card data-testid="no-data-message">
            <CardContent className="p-12 text-center">
              <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data Yet</h3>
              <p className="text-gray-600 mb-6">
                Start studying and taking quizzes to see your progress analytics here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default Analytics;