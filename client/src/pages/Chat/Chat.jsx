// src/pages/Chat/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { chatApi, feedApi } from '../../api.js';
import './Chat.css';
import logo from '../../assets/images/logo1.png';
import { useAuth } from '../../context/AuthContext.js';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';
// let socket; // Удаляем глобальную переменную

const Chat = () => {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const socket = useRef(null);
    const messagesEndRef = useRef(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [userDetails, setUserDetails] = useState(null);

    // Загрузка списка чатов
    useEffect(() => {
        const loadChats = async () => {
            try {
                const response = await chatApi.getConversations();
                // Преобразуем чаты к нужному формату
                const chats = response.data.map(chat => ({
                    id: chat.chat_id,
                    userId: chat.companion_id,
                    firstName: chat.first_name,
                    lastName: chat.last_name,
                    photo: chat.photo_url,
                    unread: chat.unread,
                    lastMessage: chat.last_message,
                    lastMessageTime: chat.last_message_time,
                }));
                setChats(chats);

                // Если есть chatId в URL, выбираем соответствующий чат и загружаем сообщения
                if (chatId) {
                    const chat = chats.find(c => c.id === parseInt(chatId));
                    if (chat) {
                        loadMessagesForChat(chat);
                    }
                }
            } catch (err) {
                setError('Не удалось загрузить чаты');
                console.error('Chat load error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadChats();
    }, [chatId]);

    // Подключение к сокету и join
    useEffect(() => {
        if (!currentUser?.user_id) return;
        if (!socket.current) {
            socket.current = io(SOCKET_URL);
        }
        socket.current.emit('join', currentUser.user_id);
        socket.current.off('receive_message');
        socket.current.on('receive_message', (msg) => {
            setChats(prevChats => prevChats.map(chat => {
                if (chat.id === msg.chatId) {
                    const isMe = msg.senderId === currentUser.user_id;
                    const newMsg = {
                        id: msg.id || Date.now(),
                        text: msg.content,
                        isMe,
                        time: msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                    // Если чат открыт, добавляем в selectedChat
                    if (selectedChat && selectedChat.id === chat.id) {
                        setSelectedChat(sel => ({ ...sel, messages: [...(sel.messages || []), newMsg] }));
                    }
                    return { ...chat, messages: [...(chat.messages || []), newMsg], lastMessage: msg.content };
                }
                return chat;
            }));
        });
        return () => {
            if (socket.current) socket.current.off('receive_message');
        };
    }, [currentUser, selectedChat]);

    // Загрузка сообщений для выбранного чата
    const loadMessagesForChat = async (chat) => {
        try {
            const response = await chatApi.getMessages(chat.id);
            // Преобразуем сообщения к нужному формату
            const messages = response.data.map(msg => ({
                id: msg.message_id || msg.id,
                text: msg.content,
                isMe: msg.sender_id === currentUser.user_id,
                time: msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            }));
            setSelectedChat({ ...chat, messages });
        } catch (err) {
            setError('Не удалось загрузить сообщения');
            setSelectedChat({ ...chat, messages: [] });
        }
    };

    // Обработчик отправки сообщения
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || !selectedChat || !currentUser) return;

        // Отправляем через сокет
        if (socket.current) {
            socket.current.emit('send_message', {
                chatId: selectedChat.id,
                senderId: currentUser.id,
                receiverId: selectedChat.userId,
                content: message,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }

        // Также отправляем через REST API для сохранения в базе
        try {
            await chatApi.sendMessage(selectedChat.userId, message);
        } catch (err) {
            console.error('Ошибка при сохранении сообщения:', err);
        }

        // Оптимистичное добавление в UI
        const tempMessage = {
            id: Date.now(),
            text: message,
            isMe: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSelectedChat(sel => ({ ...sel, messages: [...(sel.messages || []), tempMessage] }));
        setChats(prevChats => prevChats.map(chat =>
            chat.id === selectedChat.id
                ? { ...chat, messages: [...(chat.messages || []), tempMessage], lastMessage: message }
                : chat
        ));
        setMessage('');
    };

    // Выбор чата
    const selectChat = (chat) => {
        loadMessagesForChat(chat);
        navigate(`/chat/${chat.id}`);
        setMessage(''); // Сбросить поле ввода при переходе между чатами
        // Помечаем сообщения как прочитанные
        if (chat.unread > 0) {
            markAsRead(chat.id);
        }
    };

    // Отметка чата как прочитанного
    const markAsRead = async (chatId) => {
        try {
            await chatApi.markAsRead(chatId);
            setChats(prevChats => 
                prevChats.map(chat => 
                    chat.id === chatId ? { ...chat, unread: 0 } : chat
                )
            );
        } catch (err) {
            console.error('Mark as read error:', err);
        }
    };

    // Автоскролл к последнему сообщению
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [selectedChat?.messages?.length, selectedChat?.id]);

    // Функция для открытия модального окна с инфо о пользователе
    const handleOpenUserModal = async () => {
        if (!selectedChat) return;
        try {
            const res = await feedApi.getUserDetails(selectedChat.userId);
            setUserDetails(res.data);
            setShowUserModal(true);
        } catch (err) {
            console.error('Ошибка загрузки данных пользователя:', err);
        }
    };

    // Вспомогательные функции для отображения информации о пользователе (скопировано из Feed)
    function getExperienceLabel(exp) {
        switch (exp) {
            case 'beginner': return 'Новичок (0-6 мес.)';
            case 'intermediate': return 'Продолжающий (6 мес.-2 года)';
            case 'advanced': return 'Профи (2+ года)';
            default: return exp;
        }
    }
    function getGoalLabel(goal) {
        switch (goal) {
            case 'muscle_gain':
            case 'mass_gain': return 'Набор массы';
            case 'weight_loss': return 'Сброс веса';
            case 'maintenance': return 'Поддержание формы';
            case 'other': return 'Другое';
            default: return goal;
        }
    }
    function getInterestLabel(interest) {
        switch (interest) {
            case 'strength': return 'Силовые';
            case 'cardio': return 'Кардио';
            case 'group': return 'Групповые';
            default: return interest;
        }
    }
    function getAgeFromBirthDate(birthDate) {
        if (!birthDate) return '';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }
    function getAgeWithWord(age) {
        if (!age) return '—';
        age = Number(age);
        if (isNaN(age)) return age;
        const lastDigit = age % 10;
        const lastTwoDigits = age % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
            return `${age} лет`;
        }
        if (lastDigit === 1) {
            return `${age} год`;
        }
        if (lastDigit >= 2 && lastDigit <= 4) {
            return `${age} года`;
        }
        return `${age} лет`;
    }

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Загрузка чатов...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p className="error-message">{error}</p>
                <button onClick={() => window.location.reload()}>Попробовать снова</button>
            </div>
        );
    }

    return (
        <div className="chat-page">
            {/* Удалена локальная шапка, осталась только глобальная */}
            <div className="chat-container">
                {/* Список чатов */}
                <div className="chat-list">
                    <h2 className="chat-list-title">Сообщения</h2>
                    <div className="chat-items">
                        {chats.map(chat => (
                            <div
                                key={chat.id}
                                className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                                onClick={() => selectChat(chat)}
                            >
                                <img src={chat.photo || '/default-avatar.jpg'} alt={`${chat.firstName} ${chat.lastName}`} className="chat-item-photo" onError={e => { e.target.src = '/default-avatar.jpg'; }} />
                                <div className="chat-item-info">
                                    <h3 className="chat-item-name">{chat.firstName} {chat.lastName}</h3>
                                    <p className="chat-item-preview">
                                        {chat.lastMessage || 'Нет сообщений'}
                                    </p>
                                </div>
                                {Number(chat.unread) > 0 && (
                                    <span className="unread-badge" style={{minWidth: 12, width: 12, height: 12, padding: 0, fontSize: 0, background: '#f5664c', borderRadius: '50%', display: 'inline-block', marginLeft: 8}} title="Есть непрочитанные сообщения"></span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Область диалога */}
                <div className="dialog-area">
                    {selectedChat ? (
                        <>
                            <div className="chat-header">
                                <div className="chat-user-info">
                                    <img
                                        src={selectedChat.photo || '/default-avatar.jpg'}
                                        alt="Аватар"
                                        className="chat-user-photo"
                                        style={{ cursor: 'pointer' }}
                                        onClick={handleOpenUserModal}
                                        aria-label="Показать информацию о пользователе"
                                    />
                                    <span
                                        className="chat-user-name"
                                        onClick={handleOpenUserModal}
                                        aria-label="Показать информацию о пользователе"
                                    >
                                        {selectedChat.firstName} {selectedChat.lastName}
                                    </span>
                                </div>
                            </div>

                            <div className="messages-container">
                                {selectedChat.messages && selectedChat.messages.length > 0 ? selectedChat.messages.map(message => (
                                    <div
                                        key={message.id}
                                        className={`message ${message.isMe ? 'outgoing' : 'incoming'}`}
                                    >
                                        <div className="message-content">
                                            <p className="message-text">{message.text}</p>
                                            <span className="message-time">{message.time}</span>
                                        </div>
                                    </div>
                                )) : <div style={{color:'#aaa',padding:'2rem'}}>Нет сообщений</div>}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="message-form" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Напишите сообщение..."
                                    className="message-input"
                                    disabled={!selectedChat}
                                />
                                <button type="submit" className="send-button" disabled={!message.trim() || !selectedChat}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="empty-dialog">
                            <div className="empty-dialog-content">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="#f5664c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <h3>Выберите собеседника</h3>
                                <p>Начните диалог с одним из пользователей из списка слева</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {showUserModal && userDetails && (
                <div className="modal-overlay">
                    <div className="user-modal">
                        <div className="modal-content">
                            <button className="close-modal" onClick={() => setShowUserModal(false)}>&times;</button>
                            <div className="modal-header">
                                <img src={userDetails.profile_picture_url || '/default-avatar.jpg'} alt={`${userDetails.first_name} ${userDetails.last_name}`} className="modal-photo" onError={e => { e.target.src = '/default-avatar.jpg'; }} />
                                <div className="modal-user-info">
                                    <h3>{userDetails.first_name} {userDetails.last_name}</h3>
                                    <p className="user-detail"><strong>Город:</strong> {userDetails.city}</p>
                                    <p className="user-detail"><strong>Возраст:</strong> {userDetails.birth_date ? getAgeWithWord(getAgeFromBirthDate(userDetails.birth_date)) : '—'}</p>
                                    <p className="user-detail"><strong>Опыт:</strong> {getExperienceLabel(userDetails.experience_level)}</p>
                                </div>
                            </div>
                            <div className="modal-body">
                                <div className="details-section">
                                    <p><strong>Цель тренировок:</strong> {getGoalLabel(userDetails.goals && (Array.isArray(userDetails.goals) ? userDetails.goals[0] : typeof userDetails.goals === 'string' ? userDetails.goals.replace(/[{}]/g, '').split(',')[0] : '')) || '—'}</p>
                                </div>
                                <div className="details-section">
                                    <h4>Интересующие виды тренировок:</h4>
                                    <div className="interests-list">
                                        {userDetails.workout_types && (Array.isArray(userDetails.workout_types) ? userDetails.workout_types : typeof userDetails.workout_types === 'string' ? userDetails.workout_types.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean) : []).length > 0
                                            ? (Array.isArray(userDetails.workout_types) ? userDetails.workout_types : typeof userDetails.workout_types === 'string' ? userDetails.workout_types.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean) : []).map(interest => (
                                                <span key={interest} className="interest-tag">{getInterestLabel(interest)}</span>
                                            ))
                                            : <span style={{color: '#aaa'}}>—</span>
                                        }
                                    </div>
                                </div>
                                <div className="details-section">
                                    <h4>О себе:</h4>
                                    <p>{userDetails.about_text}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;