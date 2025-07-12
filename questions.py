from flask import Blueprint, jsonify, request
from src.models.user import db, User

questions_bp = Blueprint('questions', __name__)

# Mock data for demonstration
mock_questions = [
    {
        "id": 1,
        "title": "How to implement authentication in React?",
        "description": "I'm building a React application and need to implement user authentication. What are the best practices for handling login, logout, and protecting routes?",
        "author": {"id": 1, "name": "John Doe", "reputation": 1250},
        "tags": [{"id": 1, "name": "react"}, {"id": 2, "name": "authentication"}],
        "voteCount": 15,
        "answerCount": 3,
        "viewCount": 245,
        "isResolved": True,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-16T14:20:00Z"
    },
    {
        "id": 2,
        "title": "Best practices for Node.js API design",
        "description": "What are the recommended patterns and practices for designing RESTful APIs in Node.js? I'm particularly interested in error handling, validation, and security.",
        "author": {"id": 2, "name": "Jane Smith", "reputation": 890},
        "tags": [{"id": 3, "name": "nodejs"}, {"id": 4, "name": "api"}, {"id": 5, "name": "rest"}],
        "voteCount": 8,
        "answerCount": 2,
        "viewCount": 156,
        "isResolved": False,
        "createdAt": "2024-01-14T16:45:00Z",
        "updatedAt": "2024-01-14T16:45:00Z"
    },
    {
        "id": 3,
        "title": "Database optimization techniques",
        "description": "My application is experiencing slow database queries. What are some effective techniques for optimizing database performance in a web application?",
        "author": {"id": 3, "name": "Mike Johnson", "reputation": 2100},
        "tags": [{"id": 6, "name": "database"}, {"id": 7, "name": "optimization"}, {"id": 8, "name": "performance"}],
        "voteCount": 22,
        "answerCount": 5,
        "viewCount": 387,
        "isResolved": True,
        "createdAt": "2024-01-13T09:15:00Z",
        "updatedAt": "2024-01-15T11:30:00Z"
    }
]

@questions_bp.route('/questions', methods=['GET'])
def get_questions():
    """Get all questions with pagination and filtering"""
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        search = request.args.get('search', '')
        sort_by = request.args.get('sortBy', 'createdAt')
        sort_order = request.args.get('sortOrder', 'desc')
        
        # Filter questions based on search
        filtered_questions = mock_questions
        if search:
            filtered_questions = [
                q for q in mock_questions 
                if search.lower() in q['title'].lower() or search.lower() in q['description'].lower()
            ]
        
        # Sort questions
        reverse = sort_order == 'desc'
        if sort_by == 'voteCount':
            filtered_questions.sort(key=lambda x: x['voteCount'], reverse=reverse)
        elif sort_by == 'answerCount':
            filtered_questions.sort(key=lambda x: x['answerCount'], reverse=reverse)
        elif sort_by == 'viewCount':
            filtered_questions.sort(key=lambda x: x['viewCount'], reverse=reverse)
        else:  # default to createdAt
            filtered_questions.sort(key=lambda x: x['createdAt'], reverse=reverse)
        
        # Pagination
        total = len(filtered_questions)
        start = (page - 1) * limit
        end = start + limit
        questions = filtered_questions[start:end]
        
        # Calculate pagination info
        total_pages = (total + limit - 1) // limit
        has_prev = page > 1
        has_next = page < total_pages
        
        return jsonify({
            'questions': questions,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': total_pages,
                'hasPrev': has_prev,
                'hasNext': has_next
            }
        })
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 500

@questions_bp.route('/questions/<int:question_id>', methods=['GET'])
def get_question(question_id):
    """Get a specific question by ID"""
    try:
        question = next((q for q in mock_questions if q['id'] == question_id), None)
        if not question:
            return jsonify({'error': {'message': 'Question not found'}}), 404
        
        return jsonify(question)
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 500

@questions_bp.route('/questions', methods=['POST'])
def create_question():
    """Create a new question"""
    try:
        data = request.get_json()
        
        # Basic validation
        if not data or not data.get('title') or not data.get('description'):
            return jsonify({'error': {'message': 'Title and description are required'}}), 400
        
        # Create new question (in a real app, this would save to database)
        new_question = {
            'id': len(mock_questions) + 1,
            'title': data['title'],
            'description': data['description'],
            'author': {'id': 1, 'name': 'Current User', 'reputation': 100},
            'tags': data.get('tags', []),
            'voteCount': 0,
            'answerCount': 0,
            'viewCount': 0,
            'isResolved': False,
            'createdAt': '2024-01-16T12:00:00Z',
            'updatedAt': '2024-01-16T12:00:00Z'
        }
        
        mock_questions.append(new_question)
        
        return jsonify(new_question), 201
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 500

@questions_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'StackIt Q&A Platform',
        'version': '1.0.0'
    })

