import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import { Layout } from './components/Layout.jsx';
import { Home } from './pages/Home.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { Questions } from './pages/Questions.jsx';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth routes without layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Main app routes with layout */}
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/questions" element={<Questions />} />
                <Route path="/questions/new" element={<div className="text-center py-12"><h2 className="text-2xl font-bold mb-4">Ask a Question</h2><p className="text-muted-foreground">This feature will be available soon!</p></div>} />
                <Route path="/questions/:id" element={<div className="text-center py-12"><h2 className="text-2xl font-bold mb-4">Question Details</h2><p className="text-muted-foreground">This feature will be available soon!</p></div>} />
                <Route path="/users" element={<div className="text-center py-12"><h2 className="text-2xl font-bold mb-4">Users</h2><p className="text-muted-foreground">This feature will be available soon!</p></div>} />
                <Route path="/users/:id" element={<div className="text-center py-12"><h2 className="text-2xl font-bold mb-4">User Profile</h2><p className="text-muted-foreground">This feature will be available soon!</p></div>} />
                <Route path="/tags" element={<div className="text-center py-12"><h2 className="text-2xl font-bold mb-4">Tags</h2><p className="text-muted-foreground">This feature will be available soon!</p></div>} />
                <Route path="/settings" element={<div className="text-center py-12"><h2 className="text-2xl font-bold mb-4">Settings</h2><p className="text-muted-foreground">This feature will be available soon!</p></div>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
