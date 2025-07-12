from flask import Blueprint, jsonify, request
from src.models.user import db, User

auth_bp = Blueprint('auth', __name__)

# Mock user data for demonstration
mock_users = [
    {
        'id': 1,
        'email': 'demo@stackit.com',
        'name': 'Demo User',
        'password': 'demo123',  # In real app, this would be hashed
        'reputation': 1250,
        'avatar': None
    }
]

@auth_bp.route('/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Basic validation
        if not data or not data.get('email') or not data.get('password') or not data.get('name'):
            return jsonify({'error': {'message': 'Email, password, and name are required'}}), 400
        
        # Check if user already exists
        existing_user = next((u for u in mock_users if u['email'] == data['email']), None)
        if existing_user:
            return jsonify({'error': {'message': 'User with this email already exists'}}), 409
        
        # Create new user (in a real app, password would be hashed)
        new_user = {
            'id': len(mock_users) + 1,
            'email': data['email'],
            'name': data['name'],
            'password': data['password'],
            'reputation': 0,
            'avatar': None
        }
        
        mock_users.append(new_user)
        
        # Return user data without password
        user_data = {k: v for k, v in new_user.items() if k != 'password'}
        
        return jsonify({
            'user': user_data,
            'tokens': {
                'accessToken': 'mock_access_token',
                'refreshToken': 'mock_refresh_token'
            }
        }), 201
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 500

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        # Basic validation
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': {'message': 'Email and password are required'}}), 400
        
        # Find user
        user = next((u for u in mock_users if u['email'] == data['email']), None)
        if not user or user['password'] != data['password']:
            return jsonify({'error': {'message': 'Invalid email or password'}}), 401
        
        # Return user data without password
        user_data = {k: v for k, v in user.items() if k != 'password'}
        
        return jsonify({
            'user': user_data,
            'tokens': {
                'accessToken': 'mock_access_token',
                'refreshToken': 'mock_refresh_token'
            }
        })
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 500

@auth_bp.route('/auth/logout', methods=['POST'])
def logout():
    """Logout user"""
    try:
        return jsonify({'message': 'Logged out successfully'})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 500

@auth_bp.route('/auth/profile', methods=['GET'])
def get_profile():
    """Get current user profile"""
    try:
        # In a real app, this would get user from JWT token
        # For demo, return the first user
        if mock_users:
            user_data = {k: v for k, v in mock_users[0].items() if k != 'password'}
            return jsonify(user_data)
        else:
            return jsonify({'error': {'message': 'User not found'}}), 404
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 500

