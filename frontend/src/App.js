import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import Dashboard from '@/pages/Dashboard';
import StudyWorkspace from '@/pages/StudyWorkspace';
import KnowledgeGraph from '@/pages/KnowledgeGraph';
import QuizInterface from '@/pages/QuizInterface';
import Analytics from '@/pages/Analytics';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { BookOpen, Brain, BarChart3, Network, Home } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize or get user
    const initUser = async () => {
      try {
        const storedUserId = localStorage.getItem('neuralearn_user_id');
        if (storedUserId) {
          const response = await axios.get(`${API}/users/${storedUserId}`);
          setUser(response.data);
        } else {
          // Create default user for demo
          const response = await axios.post(`${API}/users`, {
            name: 'Student',
            email: `student_${Date.now()}@neuralearn.app`
          });
          setUser(response.data);
          localStorage.setItem('neuralearn_user_id', response.data.id);
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        toast.error('Failed to initialize user');
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading NeuraLearn...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="App">
        <Navigation user={user} />
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/study" element={<StudyWorkspace user={user} />} />
          <Route path="/knowledge-graph" element={<KnowledgeGraph user={user} />} />
          <Route path="/quiz" element={<QuizInterface user={user} />} />
          <Route path="/analytics" element={<Analytics user={user} />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </div>
    </BrowserRouter>
  );
}

function Navigation({ user }) {
  const navigate = useNavigate();
  const [activePath, setActivePath] = useState('/');

  useEffect(() => {
    setActivePath(window.location.pathname);
  }, [window.location.pathname]);

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/study', icon: BookOpen, label: 'Study' },
    { path: '/knowledge-graph', icon: Network, label: 'Knowledge Graph' },
    { path: '/quiz', icon: Brain, label: 'Quiz' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50" data-testid="main-navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2" data-testid="logo-link">
              <Brain className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-semibold text-gray-900">NeuraLearn</span>
            </Link>
          </div>

          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center" data-testid="user-info">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">Learner</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default App;