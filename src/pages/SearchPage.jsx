import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button, { SearchIcon } from '../components/Button';
import { ToggleGroup, Input, Select } from '../components/Input';
import IDCard from '../components/EnhancedIDCard';
import { api } from '../utils/api';
import './SearchPage.css';
import { useNotify } from '../contexts/NotificationContext';

const SearchPage = () => {
  const navigate = useNavigate();
  const { error: notifyError } = useNotify();
  const [filters, setFilters] = useState({
    idType: 'all',
    name: '',
    idNumber: '',
    campus: '',
    q: ''
  });

  const campusOptions = [
    { value: '', label: 'All Campuses' },
    { value: 'Athi River', label: 'Athi River' },
    { value: 'Nairobi', label: 'Nairobi' },
    { value: 'Mombasa', label: 'Mombasa' }
  ];

  const idTypeOptions = [
    { value: 'all', label: 'All' },
    { value: 'student', label: 'Student' },
    { value: 'staff', label: 'Staff' }
  ];

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchResults = React.useCallback(async (params = {}) => {
    setIsLoading(true);
    try {
      let queryString = '/reports/search?';
      if (params.q) queryString += `&q=${params.q}`;
      if (params.name) queryString += `&name=${params.name}`;
      if (params.idNumber) queryString += `&idNumber=${params.idNumber}`;
      if (params.campus) queryString += `&campus=${params.campus}`;
      if (params.idType && params.idType !== 'all') queryString += `&idType=${params.idType}`;

      const response = await api.get(queryString);
      if (response.success && response.data) {
        setResults(response.data.map(r => ({
          id: r._id,
          type: r.idType,
          name: r.fullName,
          idNumber: r.maskedIdNumber || '*****',
          campus: r.campus,
          dateFound: new Date(r.createdAt).toLocaleDateString(),
          initials: r.fullName ? r.fullName.split(' ').map(n => n[0]).join('') : '?',
          status: r.status,
        })));
      }
    } catch (error) {
      console.error('Search failed', error);
      notifyError('Search Failed', error.message || 'Unable to fetch results');
    } finally {
      setIsLoading(false);
    }
  }, [notifyError]);

  // Fetch initial results
  React.useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchResults(filters);
  };

  const handleClaim = (id) => {
    navigate(`/claim/${id}`);
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Search Lost IDs</h1>
        <p className="page-subtitle">Use the filters below to search for your lost identification card.</p>
      </div>

      {/* Search Filters */}
      <form className="search-filters" onSubmit={handleSearch}>
        <div className="filter-row">
          <ToggleGroup
            options={idTypeOptions}
            value={filters.idType}
            onChange={(value) => handleFilterChange('idType', value)}
            label="ID Type"
          />
        </div>

        <div className="filter-row">
          <Input
            type="text"
            id="q"
            placeholder="Search anything (Name, ID, Report #)..."
            value={filters.q}
            onChange={(e) => handleFilterChange('q', e.target.value)}
            fullWidth
            className="global-search-input"
          />
        </div>

        <div className="filter-row filter-row-3">
          <Input
            type="text"
            id="name"
            placeholder="Enter name..."
            value={filters.name}
            onChange={(e) => handleFilterChange('name', e.target.value)}
            label="Name"
          />
          <Input
            type="text"
            id="idNumber"
            placeholder="e.g., 1234"
            value={filters.idNumber}
            onChange={(e) => handleFilterChange('idNumber', e.target.value)}
            label="Partial ID Number"
          />
          <Select
            id="campus"
            options={campusOptions}
            value={filters.campus}
            onChange={(e) => handleFilterChange('campus', e.target.value)}
            label="Campus Location"
          />
        </div>

        <Button type="submit" variant="primary" icon={<SearchIcon />}>
          Search
        </Button>
      </form>

      {/* Privacy Notice */}
      <div className="privacy-notice">
        <ShieldIconSmall />
        <span>For privacy, only partial information is displayed. Full details are shared after verification.</span>
      </div>

      <div className="results-grid">
        {isLoading ? (
          <p className="loading-text">Loading...</p>
        ) : results.length > 0 ? (
          results.map(result => (
            <IDCard
              key={result.id}
              {...result}
              onVerify={handleClaim}
              onClaim={handleClaim}
            />
          ))
        ) : (
          <p className="no-results">No IDs found matching your criteria.</p>
        )}
      </div>
    </div>
  );
};

const ShieldIconSmall = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

export default SearchPage;