import React, { createContext, useState, useContext, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const newNotification = {
      id,
      ...notification,
      timestamp: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);

    return id;
  }, [removeNotification]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

const NotificationToast = ({ notification, onClose }) => {
  const { type = 'info', title, message, action } = notification;

  const typeConfig = {
    success: {
      icon: '✅',
      bgColor: 'var(--success-light)',
      borderColor: 'var(--success)',
      color: '#166534'
    },
    error: {
      icon: '❌',
      bgColor: 'var(--accent-light)',
      borderColor: 'var(--accent)',
      color: '#991b1b'
    },
    warning: {
      icon: '⚠️',
      bgColor: '#fef3c7',
      borderColor: '#f59e0b',
      color: '#92400e'
    },
    info: {
      icon: 'ℹ️',
      bgColor: 'var(--primary-light)',
      borderColor: 'var(--primary)',
      color: 'var(--primary-dark)'
    }
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div
      className="notification-toast"
      style={{
        backgroundColor: config.bgColor,
        borderLeftColor: config.borderColor
      }}
    >
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-icon">{config.icon}</span>
          <h4 className="notification-title" style={{ color: config.color }}>
            {title}
          </h4>
          <button className="notification-close" onClick={onClose}>
            ×
          </button>
        </div>
        {message && (
          <p className="notification-message" style={{ color: config.color }}>
            {message}
          </p>
        )}
        {action && (
          <div className="notification-actions">
            <button
              className="notification-action-btn"
              onClick={action.onClick}
              style={{ color: config.color }}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for easy notification usage
export const useNotify = () => {
  const { addNotification } = useNotification();

  const notify = useCallback((options) => {
    return addNotification(options);
  }, [addNotification]);

  const notifySuccess = useCallback((title, message, action) => {
    return addNotification({
      type: 'success',
      title,
      message,
      action
    });
  }, [addNotification]);

  const notifyError = useCallback((title, message, action) => {
    return addNotification({
      type: 'error',
      title,
      message,
      action
    });
  }, [addNotification]);

  const notifyInfo = useCallback((title, message, action) => {
    return addNotification({
      type: 'info',
      title,
      message,
      action
    });
  }, [addNotification]);

  const notifyWarning = useCallback((title, message, action) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      action
    });
  }, [addNotification]);

  return {
    notify,
    success: notifySuccess,
    error: notifyError,
    info: notifyInfo,
    warning: notifyWarning
  };
};