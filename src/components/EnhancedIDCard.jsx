import React, { useState } from 'react';
import Button from './Button';
import './EnhancedIDCard.css';

const EnhancedIDCard = ({
  id,
  type,
  name,
  idNumber,
  campus,
  dateFound,
  initials,
  status = 'pending', // pending, verified, claimed, returned
  finderContact,
  ownerContact,
  showActions = true,
  onClaim,
  onVerify,
  onMarkReturned
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const statusConfig = {
    pending: {
      label: 'Pending Verification',
      color: 'var(--accent)',
      bgColor: 'var(--accent-light)'
    },
    verified: {
      label: 'Verified - Ready for Claim',
      color: 'var(--primary)',
      bgColor: 'var(--primary-light)'
    },
    claimed: {
      label: 'Claimed by Owner',
      color: 'var(--success)',
      bgColor: 'var(--success-light)'
    },
    returned: {
      label: 'Returned to Owner',
      color: 'var(--text-muted)',
      bgColor: 'var(--surface)'
    }
  };

  const statusInfo = statusConfig[status] || statusConfig.pending;

  const handleClaimClick = () => {
    if (onClaim) {
      onClaim(id);
    }
  };

  const handleVerifyClick = () => {
    if (onVerify) {
      onVerify(id);
    }
  };

  const handleReturnClick = () => {
    if (onMarkReturned) {
      onMarkReturned(id);
    }
  };

  return (
    <div className={`enhanced-id-card ${status}`}>
      <div className="id-card-header">
        <div className="id-type-section">
          <span className={`id-badge id-badge-${type}`}>
            {type === 'student' ? 'Student ID' : 'Staff ID'}
          </span>
          <span className="id-status-badge" style={{ 
            backgroundColor: statusInfo.bgColor,
            color: statusInfo.color
          }}>
            {statusInfo.label}
          </span>
        </div>
        <div className="id-meta">
          <span className="id-campus">{campus}</span>
          <button 
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Less Details' : 'More Details'}
          </button>
        </div>
      </div>

      <div className="id-card-body">
        <div className="id-info">
          <div className="id-avatar">{initials}</div>
          <div className="id-details">
            <h3 className="id-name">{name}</h3>
            <p className="id-number">ID: {idNumber}</p>
            <p className="id-date">Found: {dateFound}</p>
          </div>
        </div>

        {showDetails && (
          <div className="id-details-expanded">
            <div className="detail-row">
              <span className="detail-label">Finder Contact:</span>
              <span className="detail-value">{finderContact || 'Not provided'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Owner Contact:</span>
              <span className="detail-value">{ownerContact || 'Not claimed yet'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Last Updated:</span>
              <span className="detail-value">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>

      {showActions && (
        <div className="id-card-actions">
          {status === 'pending' && (
            <Button 
              variant="outline-accent" 
              size="sm"
              onClick={handleVerifyClick}
            >
              Verify Identity
            </Button>
          )}
          
          {status === 'verified' && (
            <Button 
              variant="primary" 
              size="sm"
              onClick={handleClaimClick}
            >
              This Might Be Mine
            </Button>
          )}
          
          {status === 'claimed' && (
            <Button 
              variant="success" 
              size="sm"
              onClick={handleReturnClick}
            >
              Mark as Returned
            </Button>
          )}
          
          <button 
            className="action-btn secondary"
            onClick={() => console.log('Report issue for:', id)}
          >
            Report Issue
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedIDCard;