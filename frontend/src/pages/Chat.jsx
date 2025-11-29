import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import '../assets/css/chat.css';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

function Chat({ setAuth }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [user, setUser] = useState(null);
    const [connected, setConnected] = useState(false);
    const [typing, setTyping] = useState(null);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('chatUser');
        const token = localStorage.getItem('chatToken');

        if (!storedUser || !token) {
            handleLogout();
            return;
        }

        setUser(JSON.parse(storedUser));

        // Подключение к Socket.io
        socketRef.current = io(WS_URL, {
            transports: ['websocket', 'polling']
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('✅ Подключено к серверу');
            setConnected(true);
            socket.emit('authenticate', token);
        });

        socket.on('authenticated', () => {
            console.log('✅ Авторизован');
        });

        socket.on('auth_error', (error) => {
            console.error('Ошибка авторизации:', error);
            handleLogout();
        });

        socket.on('message_history', (history) => {
            setMessages(history);
        });

        socket.on('new_message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        socket.on('user_joined', (data) => {
            console.log('👋 Присоединился:', data.nickname);
        });

        socket.on('user_left', (data) => {
            console.log('👋 Покинул чат:', data.nickname);
        });

        socket.on('user_typing', (data) => {
            setTyping(data.nickname);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                setTyping(null);
            }, 3000);
        });

        socket.on('disconnect', () => {
            console.log('❌ Отключено от сервера');
            setConnected(false);
        });

        socket.on('error', (error) => {
            console.error('Ошибка Socket.io:', error);
        });

        return () => {
            if (socket) {
                socket.disconnect();
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = (e) => {
        e.preventDefault();

        if (!inputMessage.trim() || !socketRef.current || !connected) {
            return;
        }

        socketRef.current.emit('send_message', { text: inputMessage.trim() });
        setInputMessage('');
    };

    const handleInputChange = (e) => {
        setInputMessage(e.target.value);

        if (socketRef.current && connected && e.target.value.trim()) {
            socketRef.current.emit('typing');
        }
    };

    const handleLogout = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        localStorage.removeItem('chatToken');
        localStorage.removeItem('chatUser');
        setAuth(false);
        navigate('/login');
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!user) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Загрузка...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-container d-flex flex-column vh-100">
            {/* Header */}
            <div className="chat-header bg-primary text-white p-3 shadow">
                <div className="container d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <h4 className="mb-0 me-3">💬 Чат</h4>
                        <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
                            {connected ? 'Онлайн' : 'Офлайн'}
                        </span>
                    </div>
                    <div className="d-flex align-items-center">
                        <span className="badge bg-light text-primary me-2">
                            {user.nickname}
                        </span>
                        <button
                            className="btn btn-sm btn-outline-light"
                            onClick={handleLogout}
                        >
                            Выйти
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="messages-area flex-grow-1 overflow-auto bg-light p-3">
                <div className="container">
                    {messages.length === 0 ? (
                        <div className="text-center text-muted mt-5">
                            <p>Сообщений пока нет. Начните общение!</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id || msg._id}
                                className={`message mb-3 ${msg.userId === user.id ? 'text-end' : 'text-start'
                                    }`}
                            >
                                <div
                                    className={`d-inline-block p-3 rounded shadow-sm ${msg.userId === user.id
                                            ? 'bg-primary text-white'
                                            : 'bg-white'
                                        }`}
                                    style={{ maxWidth: '70%' }}
                                >
                                    {msg.userId !== user.id && (
                                        <div className="fw-bold small mb-1 text-primary">
                                            {msg.nickname}
                                        </div>
                                    )}
                                    <div>{msg.text}</div>
                                    <div
                                        className={`small mt-1 ${msg.userId === user.id
                                                ? 'text-white-50'
                                                : 'text-muted'
                                            }`}
                                    >
                                        {formatTime(msg.timestamp)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {typing && (
                        <div className="text-muted small mb-2">
                            <em>{typing} печатает...</em>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="chat-input bg-white border-top p-3 shadow">
                <div className="container">
                    <form onSubmit={handleSendMessage}>
                        <div className="input-group">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Введите сообщение..."
                                value={inputMessage}
                                onChange={handleInputChange}
                                disabled={!connected}
                            />
                            <button
                                className="btn btn-primary px-4"
                                type="submit"
                                disabled={!connected || !inputMessage.trim()}
                            >
                                Отправить
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Chat;