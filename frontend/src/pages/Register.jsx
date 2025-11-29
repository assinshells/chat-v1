import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/css/auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Register({ setAuth }) {
    const [formData, setFormData] = useState({
        nickname: '',
        email: '',
        password: '',
        confirmPassword: '',
        room: 'главная'
    });
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

        if (formData.password !== formData.confirmPassword) {
            return setError('Пароли не совпадают');
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/api/register`, {
                nickname: formData.nickname,
                email: formData.email,
                password: formData.password
            });

            localStorage.setItem('chatToken', response.data.token);
            localStorage.setItem('chatUser', JSON.stringify(response.data.user));
            localStorage.setItem('selectedRoom', formData.room);
            setAuth(true);
            navigate('/chat');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка регистрации');
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
                                <h2 className="text-center mb-4">📝 Регистрация</h2>

                                {error && (
                                    <div className="alert alert-danger" role="alert">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Никнейм *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="nickname"
                                            value={formData.nickname}
                                            onChange={handleChange}
                                            required
                                            minLength={3}
                                            maxLength={30}
                                            placeholder="Ваш никнейм"
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Email (опционально)</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Ваш email"
                                        />
                                        <small className="text-muted">
                                            Нужен для восстановления пароля
                                        </small>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Пароль *</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            minLength={6}
                                            placeholder="Минимум 6 символов"
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Подтвердите пароль *</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            placeholder="Повторите пароль"
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">🚪 Выберите комнату для входа</label>
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
                                        {loading ? 'Регистрация...' : 'Создать аккаунт'}
                                    </button>
                                </form>

                                <div className="text-center">
                                    <Link to="/login" className="text-decoration-none">
                                        Уже есть аккаунт? Войти
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

export default Register;