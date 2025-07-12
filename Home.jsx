import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowUp, 
  ArrowDown, 
  MessageSquare, 
  Eye, 
  Clock, 
  TrendingUp,
  Users,
  HelpCircle,
  Star
} from 'lucide-react';
import { useAuth } from "../hooks/useAuth.jsx";
import { apiClient } from "../lib/api.jsx";

export function Home() {
  const { isAuthenticated } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalUsers: 0,
    totalAnswers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      // Load recent questions
      const questionsResponse = await apiClient.getQuestions({
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      setQuestions(questionsResponse.questions || []);

      // Mock stats for demo (in real app, these would come from API)
      setStats({
        totalQuestions: questionsResponse.pagination?.total || 0,
        totalUsers: 150,
        totalAnswers: 320
      });
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to StackIt
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A modern Q&A platform where developers help each other solve problems, 
          share knowledge, and build amazing things together.
        </p>
        {!isAuthenticated && (
          <div className="flex justify-center space-x-4 mt-6">
            <Button asChild size="lg">
              <Link to="/register">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/questions">Browse Questions</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuestions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Questions asked by our community
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Developers helping each other
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Answers</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAnswers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Solutions provided by experts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Questions */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Recent Questions</h2>
          <Button variant="outline" asChild>
            <Link to="/questions">View All Questions</Link>
          </Button>
        </div>

        {questions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No questions yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to ask a question and help build our community!
              </p>
              {isAuthenticated && (
                <Button asChild>
                  <Link to="/questions/new">Ask the First Question</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <Card key={question.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Vote and Stats */}
                    <div className="flex flex-col items-center space-y-2 text-sm text-muted-foreground min-w-[60px]">
                      <div className="flex items-center space-x-1">
                        <ArrowUp className="h-4 w-4" />
                        <span>{question.voteCount || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{question.answerCount || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{question.viewCount || 0}</span>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/questions/${question.id}`}
                        className="block group"
                      >
                        <h3 className="text-lg font-medium group-hover:text-primary transition-colors mb-2">
                          {question.title}
                        </h3>
                      </Link>
                      
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {question.description?.substring(0, 200)}...
                      </p>

                      {/* Tags */}
                      {question.tags && question.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {question.tags.map((tag) => (
                            <Badge 
                              key={tag.id} 
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Author and Time */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={question.author?.avatar} />
                            <AvatarFallback>
                              {question.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{question.author?.name || 'Anonymous'}</span>
                          {question.author?.reputation && (
                            <span className="text-xs">
                              ({question.author.reputation} rep)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(question.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Call to Action */}
      {isAuthenticated && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="text-center py-8">
            <Star className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ready to contribute?</h3>
            <p className="text-muted-foreground mb-4">
              Share your knowledge and help fellow developers solve their problems.
            </p>
            <Button asChild>
              <Link to="/questions/new">Ask a Question</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

