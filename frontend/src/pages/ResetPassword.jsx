// frontend/src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/css/auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// frontend/src/pages/ResetPassword.jsx
import { useParams } from 'react-router-dom';

function ResetPassword() {
    const { token } = useParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return setError('Пароли не совпадают');
        }

        setLoading(true);
        setError('');

        try {
            await axios.post(`${API_URL}/api/reset-password`, {
                token,
                newPassword: password
            });
            setMessage('Пароль успешно изменен! Перенаправление...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка сброса пароля');
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
                                <h2 className="text-center mb-4">Новый пароль</h2>

                                {error && <div className="alert alert-danger">{error}</div>}
                                {message && <div className="alert alert-success">{message}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Новый пароль</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={6}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Подтвердите пароль</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100"
                                        disabled={loading}
                                    >
                                        {loading ? 'Сохранение...' : 'Сохранить пароль'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;