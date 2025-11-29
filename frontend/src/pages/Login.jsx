import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/css/auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Login({ setAuth }) {
    const [formData, setFormData] = useState({ login: '', password: '', room: 'главная' });
    const [rooms, setRooms] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Загрузка списка комнат
        const fetchRooms = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/rooms`);
                setRooms(response.data);
            } catch (err) {
                console.error('Ошибка загрузки комнат:', err);
            }
        };
        fetchRooms();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/api/login`, {
                login: formData.login,
                password: formData.password
            });
            localStorage.setItem('chatToken', response.data.token);
            localStorage.setItem('chatUser', JSON.stringify(response.data.user));
            localStorage.setItem('selectedRoom', formData.room);
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
                                <h2 className="text-center mb-4">🔐 Вход в чат</h2>

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

                                    <div className="mb-3">
                                        <label className="form-label">🚪 Выберите комнату</label>
                                        <select
                                            className="form-select"
                                            name="room"
                                            value={formData.room}
                                            onChange={handleChange}
                                        >
                                            {rooms.length > 0 ? (
                                                rooms.map((room) => (
                                                    <option key={room.name} value={room.name}>
                                                        # {room.displayName}
                                                        {room.description && ` - ${room.description}`}
                                                    </option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="главная"># Главная</option>
                                                    <option value="знакомства"># Знакомства</option>
                                                    <option value="беспредел"># Беспредел</option>
                                                </>
                                            )}
                                        </select>
                                        <small className="text-muted">
                                            Вы можете переключаться между комнатами в любое время
                                        </small>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100 mb-3"
                                        disabled={loading}
                                    >
                                        {loading ? 'Вход...' : 'Войти в чат'}
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