import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Chat from './pages/Chat';
import 'bootstrap/dist/css/bootstrap.min.css';
import './assets/css/global.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('chatToken');
        if (token) {
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Загрузка...</span>
                </div>
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                <Route
                    path="/login"
                    element={
                        isAuthenticated ? <Navigate to="/chat" /> : <Login setAuth={setIsAuthenticated} />
                    }
                />
                <Route
                    path="/register"
                    element={
                        isAuthenticated ? <Navigate to="/chat" /> : <Register setAuth={setIsAuthenticated} />
                    }
                />
                <Route
                    path="/forgot-password"
                    element={
                        isAuthenticated ? <Navigate to="/chat" /> : <ForgotPassword />
                    }
                />
                <Route
                    path="/reset-password/:token"
                    element={
                        isAuthenticated ? <Navigate to="/chat" /> : <ResetPassword />
                    }
                />
                <Route
                    path="/chat"
                    element={
                        isAuthenticated ? <Chat setAuth={setIsAuthenticated} /> : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/"
                    element={<Navigate to={isAuthenticated ? "/chat" : "/login"} />}
                />
            </Routes>
        </Router>
    );
}

export default App;