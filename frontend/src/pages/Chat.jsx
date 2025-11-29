import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import '../assets/css/chat.css';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Chat({ setAuth }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [user, setUser] = useState(null);
    const [connected, setConnected] = useState(false);
    const [typing, setTyping] = useState(null);
    const [currentRoom, setCurrentRoom] = useState('главная');
    const [rooms, setRooms] = useState([]);
    const [showSidebar, setShowSidebar] = useState(true);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('chatUser');
        const token = localStorage.getItem('chatToken');
        const selectedRoom = localStorage.getItem('selectedRoom') || 'главная';

        if (!storedUser || !token) {
            handleLogout();
            return;
        }

        setUser(JSON.parse(storedUser));
        setCurrentRoom(selectedRoom);

        // Загрузка списка комнат из API
        const fetchRooms = async () => {
            try {
                const response = await fetch(`${API_URL}/api/rooms`);
                const roomsData = await response.json();
                console.log('🏠 Загружены комнаты:', roomsData);

                // Преобразуем в формат с userCount
                const roomsWithCounts = roomsData.map(room => ({
                    name: room.name,
                    displayName: room.displayName,
                    description: room.description,
                    userCount: 0,
                    users: []
                }));
                setRooms(roomsWithCounts);
            } catch (error) {
                console.error('Ошибка загрузки комнат:', error);
                // Fallback на дефолтные комнаты
                setRooms([
                    { name: 'главная', displayName: 'Главная', userCount: 0, users: [] },
                    { name: 'знакомства', displayName: 'Знакомства', userCount: 0, users: [] },
                    { name: 'беспредел', displayName: 'Беспредел', userCount: 0, users: [] }
                ]);
            }
        };

        fetchRooms();

        // Подключение к Socket.io
        socketRef.current = io(WS_URL, {
            transports: ['websocket', 'polling']
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('✅ Подключено к серверу');
            setConnected(true);
            socket.emit('authenticate', { token, room: selectedRoom });
        });

        socket.on('authenticated', (data) => {
            console.log('✅ Авторизован в комнате:', data.room);
            setCurrentRoom(data.room);
        });

        socket.on('auth_error', (error) => {
            console.error('Ошибка авторизации:', error);
            handleLogout();
        });

        socket.on('message_history', (history) => {
            console.log('📜 История сообщений:', history.length);
            setMessages(history);
        });

        socket.on('new_message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        socket.on('room_changed', (data) => {
            console.log('🚪 Комната изменена:', data.room);
            setCurrentRoom(data.room);
            setMessages(data.messages);
        });

        socket.on('rooms_update', (roomsData) => {
            console.log('📊 Обновление комнат:', roomsData);
            if (roomsData && roomsData.length > 0) {
                setRooms(roomsData);
            }
        });

        socket.on('user_joined', (data) => {
            console.log('👋 Присоединился:', data.nickname, 'в', data.room);
        });

        socket.on('user_left', (data) => {
            console.log('👋 Покинул чат:', data.nickname, 'из', data.room);
        });

        socket.on('user_typing', (data) => {
            if (data.room === currentRoom) {
                setTyping(data.nickname);
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }
                typingTimeoutRef.current = setTimeout(() => {
                    setTyping(null);
                }, 3000);
            }
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

    const handleRoomChange = (roomName) => {
        if (socketRef.current && connected && roomName !== currentRoom) {
            console.log('🔄 Переключение на комнату:', roomName);
            socketRef.current.emit('join_room', roomName);
            setShowSidebar(false); // Закрыть сайдбар на мобильных
        }
    };

    const handleLogout = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        localStorage.removeItem('chatToken');
        localStorage.removeItem('chatUser');
        localStorage.removeItem('selectedRoom');
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

    const getCurrentRoomUsers = () => {
        const room = rooms.find(r => r.name === currentRoom);
        return room ? room.users : [];
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
        <div className="chat-container d-flex vh-100">
            {/* Sidebar with Rooms */}
            <div className={`chat-sidebar bg-dark text-white ${showSidebar ? 'show' : ''}`}>
                <div className="p-3 border-bottom border-secondary">
                    <h5 className="mb-0">🏠 Комнаты</h5>
                    <small className="text-muted">{rooms.length} доступно</small>
                </div>

                <div className="rooms-list">
                    {rooms.length > 0 ? (
                        rooms.map((room) => (
                            <div
                                key={room.name}
                                className={`room-item p-3 ${currentRoom === room.name ? 'active' : ''}`}
                                onClick={() => handleRoomChange(room.name)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div className="fw-bold">
                                            # {room.displayName || room.name}
                                        </div>
                                        <small className="text-muted">
                                            {room.userCount || 0} {room.userCount === 1 ? 'пользователь' : 'пользователей'}
                                        </small>
                                    </div>
                                    <span className="badge bg-primary rounded-pill">
                                        {room.userCount || 0}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-center text-muted">
                            <div className="spinner-border spinner-border-sm mb-2" role="status">
                                <span className="visually-hidden">Загрузка...</span>
                            </div>
                            <div>Загрузка комнат...</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="chat-main flex-grow-1 d-flex flex-column">
                {/* Header */}
                <div className="chat-header bg-primary text-white p-3 shadow">
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                            <button
                                className="btn btn-sm btn-outline-light me-3 d-md-none"
                                onClick={() => setShowSidebar(!showSidebar)}
                            >
                                ☰
                            </button>
                            <div>
                                <h5 className="mb-0"># {currentRoom}</h5>
                                <small>
                                    {getCurrentRoomUsers().length} онлайн
                                </small>
                            </div>
                            <span className={`badge ms-3 ${connected ? 'bg-success' : 'bg-danger'}`}>
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

                <div className="d-flex flex-grow-1" style={{ overflow: 'hidden' }}>
                    {/* Messages Area */}
                    <div className="messages-area flex-grow-1 overflow-auto bg-light p-3">
                        <div className="container-fluid">
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

                    {/* Users Sidebar */}
                    <div className="users-sidebar bg-white border-start d-none d-lg-block">
                        <div className="p-3 border-bottom">
                            <h6 className="mb-0">
                                Онлайн ({getCurrentRoomUsers().length})
                            </h6>
                        </div>
                        <div className="users-list p-3">
                            {getCurrentRoomUsers().map((u) => (
                                <div
                                    key={u.socketId}
                                    className="user-item d-flex align-items-center mb-2"
                                >
                                    <div
                                        className="rounded-circle bg-success me-2"
                                        style={{ width: '10px', height: '10px' }}
                                    ></div>
                                    <span className={u.userId === user.id ? 'fw-bold' : ''}>
                                        {u.nickname}
                                        {u.userId === user.id && ' (вы)'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Input Area */}
                <div className="chat-input bg-white border-top p-3 shadow">
                    <div className="container-fluid">
                        <form onSubmit={handleSendMessage}>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder={`Сообщение в # ${currentRoom}`}
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
        </div>
    );
}

export default Chat;