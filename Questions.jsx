import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowUp, 
  ArrowDown, 
  MessageSquare, 
  Eye, 
  Clock, 
  Search,
  Plus,
  Filter,
  CheckCircle
} from 'lucide-react';
import { useAuth } from "../hooks/useAuth.jsx";
import { apiClient } from "../lib/api.jsx";

export function Questions() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');

  useEffect(() => {
    loadQuestions();
  }, [searchParams]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const params = {
        page: searchParams.get('page') || 1,
        limit: 20,
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery })
      };

      const response = await apiClient.getQuestions(params);
      setQuestions(response.questions || []);
      setPagination(response.pagination || {});
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    } else {
      params.delete('search');
    }
    params.delete('page'); // Reset to first page
    setSearchParams(params);
  };

  const handleSortChange = (newSortBy) => {
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', newSortBy);
    params.delete('page'); // Reset to first page
    setSearchParams(params);
    setSortBy(newSortBy);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage);
    setSearchParams(params);
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
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-muted rounded mb-6"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Questions</h1>
          <p className="text-muted-foreground">
            {pagination.total ? `${pagination.total.toLocaleString()} questions` : 'Browse questions from our community'}
          </p>
        </div>
        {isAuthenticated && (
          <Button asChild>
            <Link to="/questions/new">
              <Plus className="h-4 w-4 mr-2" />
              Ask Question
            </Link>
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Newest</SelectItem>
            <SelectItem value="voteCount">Most Voted</SelectItem>
            <SelectItem value="answerCount">Most Answered</SelectItem>
            <SelectItem value="viewCount">Most Viewed</SelectItem>
            <SelectItem value="updatedAt">Recently Updated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'No questions found' : 'No questions yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No questions match "${searchQuery}". Try different keywords.`
                : 'Be the first to ask a question and help build our community!'
              }
            </p>
            {isAuthenticated && (
              <Button asChild>
                <Link to="/questions/new">Ask a Question</Link>
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
                  <div className="flex flex-col items-center space-y-2 text-sm text-muted-foreground min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center space-x-1">
                        <ArrowUp className="h-4 w-4" />
                        <span className="font-medium">{question.voteCount || 0}</span>
                      </div>
                      <span className="text-xs">votes</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium">{question.answerCount || 0}</span>
                      </div>
                      <span className="text-xs">answers</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span className="font-medium">{question.viewCount || 0}</span>
                      </div>
                      <span className="text-xs">views</span>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <Link 
                        to={`/questions/${question.id}`}
                        className="block group flex-1"
                      >
                        <h3 className="text-lg font-medium group-hover:text-primary transition-colors mb-1">
                          {question.title}
                          {question.isResolved && (
                            <CheckCircle className="inline-block h-5 w-5 text-green-500 ml-2" />
                          )}
                        </h3>
                      </Link>
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {question.description?.substring(0, 300)}...
                    </p>

                    {/* Tags */}
                    {question.tags && question.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {question.tags.map((tag) => (
                          <Badge 
                            key={tag.id} 
                            variant="secondary"
                            className="text-xs hover:bg-primary hover:text-primary-foreground cursor-pointer"
                            asChild
                          >
                            <Link to={`/questions?tag=${tag.name}`}>
                              {tag.name}
                            </Link>
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
                        <Link 
                          to={`/users/${question.author?.id}`}
                          className="hover:text-foreground"
                        >
                          {question.author?.name || 'Anonymous'}
                        </Link>
                        {question.author?.reputation && (
                          <span className="text-xs">
                            ({question.author.reputation} rep)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>asked {formatTimeAgo(question.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrev}
          >
            Previous
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, pagination.page - 2) + i;
              if (pageNum > pagination.totalPages) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === pagination.page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNext}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

