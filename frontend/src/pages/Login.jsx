import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/css/auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Login({ setAuth }) {
    const [formData, setFormData] = useState({ login: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/api/login`, formData);
            localStorage.setItem('chatToken', response.data.token);
            localStorage.setItem('chatUser', JSON.stringify(response.data.user));
            setAuth(true);
            navigate('/chat');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка входа');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-5">
                        <div className="card shadow-lg border-0">
                            <div className="card-body p-5">
                                <h2 className="text-center mb-4">Вход в чат</h2>

                                {error && (
                                    <div className="alert alert-danger" role="alert">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Никнейм или Email</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="login"
                                            value={formData.login}
                                            onChange={handleChange}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Пароль</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100 mb-3"
                                        disabled={loading}
                                    >
                                        {loading ? 'Вход...' : 'Войти'}
                                    </button>
                                </form>

                                <div className="text-center mb-2">
                                    <Link to="/forgot-password" className="text-decoration-none">
                                        Забыли пароль?
                                    </Link>
                                </div>

                                <hr />

                                <div className="text-center">
                                    <p className="mb-2">Нет аккаунта?</p>
                                    <Link to="/register" className="btn btn-outline-primary">
                                        Зарегистрироваться
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;