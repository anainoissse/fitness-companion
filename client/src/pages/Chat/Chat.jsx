// src/pages/Chat/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { chatApi } from '../../api.js';
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
                                {chat.unread > 0 && (
                                    <span className="unread-badge">{chat.unread}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Область диалога */}
                <div className="dialog-area">
                    {selectedChat ? (
                        <>
                            <div className="dialog-header">
                                <div className="dialog-partner">
                                    <img src={selectedChat.photo || '/default-avatar.jpg'} alt={`${selectedChat.firstName} ${selectedChat.lastName}`} className="dialog-photo" onError={e => { e.target.src = '/default-avatar.jpg'; }} />
                                    <h3 className="dialog-name">{selectedChat.firstName} {selectedChat.lastName}</h3>
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
        </div>
    );
};

export default Chat;