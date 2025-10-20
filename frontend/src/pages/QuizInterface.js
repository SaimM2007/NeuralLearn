import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function QuizInterface({ user }) {
  const [quizzes, setQuizzes] = useState([]);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Quiz generation form
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);

  useEffect(() => {
    if (user) {
      loadQuizzes();
    }
  }, [user]);

  const loadQuizzes = async () => {
    try {
      const response = await axios.get(`${API}/quiz/user/${user.id}`);
      setQuizzes(response.data);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    }
  };

  const generateQuiz = async () => {
    if (!topic.trim() || !content.trim()) {
      toast.error('Please provide both topic and content');
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`${API}/quiz/generate`, {
        user_id: user.id,
        topic,
        content,
        difficulty,
        num_questions: numQuestions
      });
      
      setCurrentQuiz(response.data);
      setUserAnswers({});
      setShowResults(false);
      setQuizResult(null);
      toast.success('Quiz generated successfully!');
      loadQuizzes();
    } catch (error) {
      toast.error('Failed to generate quiz');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const submitQuiz = async () => {
    if (Object.keys(userAnswers).length !== currentQuiz.questions.length) {
      toast.error('Please answer all questions');
      return;
    }

    try {
      const response = await axios.post(`${API}/quiz/submit`, {
        quiz_id: currentQuiz.id,
        user_id: user.id,
        answers: userAnswers
      });
      
      setQuizResult(response.data);
      setShowResults(true);
      toast.success(`Quiz completed! Score: ${response.data.percentage.toFixed(0)}%`);
    } catch (error) {
      toast.error('Failed to submit quiz');
      console.error(error);
    }
  };

  const selectAnswer = (questionIndex, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const loadExistingQuiz = (quiz) => {
    setCurrentQuiz(quiz);
    setUserAnswers({});
    setShowResults(false);
    setQuizResult(null);
  };

  if (!currentQuiz) {
    return (
      <div className="min-h-screen bg-gray-50" data-testid="quiz-interface-page">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Adaptive Quiz Generator</h1>
            <p className="text-gray-600">Test your knowledge with AI-generated quizzes</p>
          </div>

          {/* Quiz Generation Form */}
          <Card className="mb-6" data-testid="quiz-generation-form">
            <CardHeader>
              <CardTitle>Generate New Quiz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Neural Networks, Machine Learning"
                  data-testid="quiz-topic-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content or Context</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste text from your study materials or describe what you want to be quizzed on..."
                  rows={6}
                  data-testid="quiz-content-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger data-testid="quiz-difficulty-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy" data-testid="difficulty-easy">Easy</SelectItem>
                      <SelectItem value="medium" data-testid="difficulty-medium">Medium</SelectItem>
                      <SelectItem value="hard" data-testid="difficulty-hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
                  <Input
                    type="number"
                    min="3"
                    max="10"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                    data-testid="quiz-num-questions-input"
                  />
                </div>
              </div>

              <Button
                onClick={generateQuiz}
                disabled={generating}
                className="w-full"
                data-testid="generate-quiz-button"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Quiz...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Generate Quiz
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Previous Quizzes */}
          {quizzes.length > 0 && (
            <Card data-testid="previous-quizzes">
              <CardHeader>
                <CardTitle>Previous Quizzes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      data-testid={`quiz-item-${quiz.id}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{quiz.topic}</p>
                        <p className="text-sm text-gray-500">
                          {quiz.difficulty} • {quiz.questions.length} questions
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadExistingQuiz(quiz)}
                        data-testid={`retake-quiz-${quiz.id}`}
                      >
                        Retake
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="quiz-taking-interface">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{currentQuiz.topic}</h1>
              <p className="text-gray-600">Difficulty: {currentQuiz.difficulty}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setCurrentQuiz(null);
                setUserAnswers({});
                setShowResults(false);
              }}
              data-testid="back-to-quiz-list"
            >
              Back to Quizzes
            </Button>
          </div>
          
          {!showResults && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{Object.keys(userAnswers).length} / {currentQuiz.questions.length} answered</span>
              </div>
              <Progress
                value={(Object.keys(userAnswers).length / currentQuiz.questions.length) * 100}
                className="h-2"
              />
            </div>
          )}
        </div>

        {/* Results */}
        {showResults && quizResult && (
          <Card className="mb-6 border-2 border-blue-200" data-testid="quiz-results">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mb-4">
                  {quizResult.percentage >= 70 ? (
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                  ) : (
                    <XCircle className="w-16 h-16 text-orange-500 mx-auto" />
                  )}
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Score: {quizResult.percentage.toFixed(0)}%
                </h2>
                <p className="text-lg text-gray-600 mb-4">
                  You got {quizResult.correct} out of {quizResult.total} questions correct
                </p>
                <Button
                  onClick={() => {
                    setCurrentQuiz(null);
                    setShowResults(false);
                  }}
                  data-testid="take-another-quiz"
                >
                  Take Another Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {currentQuiz.questions.map((question, index) => (
            <Card key={index} data-testid={`question-${index}`}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Question {index + 1}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900 mb-4 font-medium">{question.question}</p>
                <div className="space-y-2">
                  {question.options.map((option, optIdx) => {
                    const optionLetter = option.charAt(0);
                    const isSelected = userAnswers[index] === optionLetter;
                    const isCorrect = showResults && question.correct_answer === optionLetter;
                    const isWrong = showResults && isSelected && !isCorrect;

                    return (
                      <button
                        key={optIdx}
                        onClick={() => !showResults && selectAnswer(index, optionLetter)}
                        disabled={showResults}
                        data-testid={`option-${index}-${optIdx}`}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isCorrect
                            ? 'border-green-500 bg-green-50'
                            : isWrong
                            ? 'border-red-500 bg-red-50'
                            : isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        } ${!showResults ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option}</span>
                          {showResults && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                          {showResults && isWrong && <XCircle className="w-5 h-5 text-red-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {showResults && question.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg" data-testid={`explanation-${index}`}>
                    <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                    <p className="text-sm text-blue-800">{question.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit Button */}
        {!showResults && (
          <div className="mt-6 flex justify-center">
            <Button
              onClick={submitQuiz}
              size="lg"
              disabled={Object.keys(userAnswers).length !== currentQuiz.questions.length}
              data-testid="submit-quiz-button"
            >
              Submit Quiz
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizInterface;