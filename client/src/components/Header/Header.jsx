import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { chatApi } from '../../api.js';
import './Header.css';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

const Header = () => {
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const socket = useRef(null);

  const fetchUnread = async () => {
    if (!currentUser) return;
    try {
      const res = await chatApi.getConversations();
      const totalUnread = res.data.reduce((sum, chat) => sum + (chat.unread || 0), 0);
      setUnreadCount(totalUnread);
    } catch (e) {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchUnread();
    // eslint-disable-next-line
  }, [currentUser, location.pathname]);

  useEffect(() => {
    if (!currentUser?.user_id) return;
    if (!socket.current) {
      socket.current = io(SOCKET_URL);
      socket.current.emit('join', currentUser.user_id);
    }
    const handleReceive = () => {
      fetchUnread();
    };
    socket.current.on('receive_message', handleReceive);
    return () => {
      if (socket.current) socket.current.off('receive_message', handleReceive);
    };
  }, [currentUser]);

  return (
    <header className="app-header">
      <div className="header-container">
        <NavLink to="/" className="logo-link">
          <img src="/logo.png" alt="Логотип" className="logo" />
          <span className="gymbro-title">GymBro</span>
        </NavLink>
        {currentUser && (
          <>
            <nav className={`main-nav ${menuOpen ? 'active' : ''}`}>
              <NavLink to="/feed" onClick={() => setMenuOpen(false)}>
                Лента
              </NavLink>
              <NavLink to="/chat" onClick={() => setMenuOpen(false)} style={{position:'relative'}}>
                Чаты
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-18px',
                    background: '#f5664c',
                    color: 'white',
                    borderRadius: '50%',
                    minWidth: '22px',
                    height: '22px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    zIndex: 2,
                    padding: '0 6px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
                  }}>{unreadCount}</span>
                )}
              </NavLink>
              <NavLink to="/profile" onClick={() => setMenuOpen(false)}>
                Профиль
              </NavLink>
            </nav>
            <button 
              className="mobile-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Меню"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
            <button onClick={logout} className="logout-btn">
              Выйти
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;