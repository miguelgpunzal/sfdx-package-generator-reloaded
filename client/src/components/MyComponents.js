import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from "../App";
import './MyComponents.css';
import '../components/ModernUI.css';

export default function MyComponents({ open, onClose, embedded = false }) {
  const { globalState, dispatch } = useContext(GlobalContext);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' });
  const [myComponents, setMyComponents] = useState([]);
  const [filterKey, setFilterKey] = useState("");
  const [metadataTypeFilter, setMetadataTypeFilter] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'lastModifiedDate', direction: 'desc' });
  const [metadataTypeFilterAnchor, setMetadataTypeFilterAnchor] = useState(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false); // Track if we've tried fetching
  const [lastRefresh, setLastRefresh] = useState(null); // Last refresh timestamp
  
  // Refresh modal state
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [refreshMetadataTypes, setRefreshMetadataTypes] = useState([]);
  const [refreshSearchKey, setRefreshSearchKey] = useState("");
  const [isSelectiveRefresh, setIsSelectiveRefresh] = useState(false); // Track if doing selective refresh
  const [refreshingTypes, setRefreshingTypes] = useState([]); // Track which types are being refreshed
  
  // Default metadata types to refresh
  const defaultRefreshTypes = ['ApexClass', 'ApexTrigger', 'LightningComponentBundle', 'CustomField', 'CustomObject', 'Flexipage', 'Layout', 'Flow'];
  
  // All available metadata types (we'll populate this from the extension)
  const [allMetadataTypes, setAllMetadataTypes] = useState([]);
  const [loadingMetadataTypes, setLoadingMetadataTypes] = useState(false);

  // Listen for response from extension
  useEffect(() => {
    const messageListener = (event) => {
      const message = event.data;
      
      if (message.command === 'allMetadataTypes') {
        // Received list of all available metadata types
        setAllMetadataTypes(message.types || []);
        // Set default selected types
        setRefreshMetadataTypes(defaultRefreshTypes);
        // Stop loading
        setLoadingMetadataTypes(false);
      } else if (message.command === 'myComponentsResponse') {
        // Initial response with loading state
        const components = message.components || [];
        
        // If this is a selective refresh (from backend flag), don't replace all components
        if (message.isSelectiveRefresh && message.isLoading) {
          // Just update loading state, don't touch components
          console.log('Selective refresh - preserving existing components');
          setLoading(true);
          setHasAttemptedFetch(true);
          setLoadingProgress({ current: 0, total: message.totalTypes || 0, message: 'Starting...' });
        } else {
          // Normal full refresh - replace all components
          console.log('Full refresh - replacing all components');
          setMyComponents(components.map(comp => ({ ...comp, isSelected: false })));
        
          // Update last refresh timestamp
          if (message.lastRefresh) {
            setLastRefresh(message.lastRefresh);
          }
          
          if (message.fromCache) {
            // Loaded from cache, no loading needed
            console.log('Loaded components from cache');
            setLoading(false);
            setHasInitiallyLoaded(true);
            setHasAttemptedFetch(true);
          } else if (message.isLoading) {
            // Starting fresh load
            setLoading(true);
            setHasAttemptedFetch(true);
            setLoadingProgress({ current: 0, total: message.totalTypes || 0, message: 'Starting...' });
          } else {
            setLoading(false);
            setHasAttemptedFetch(true);
          }
        }
      } else if (message.command === 'myComponentsProgress') {
        // Progressive updates - append new components
        const newComponents = message.components || [];
        setMyComponents(prev => [
          ...prev,
          ...newComponents.map(comp => ({ ...comp, isSelected: false }))
        ]);
        setLoadingProgress({ 
          current: message.processedCount || 0, 
          total: message.totalTypes || 0,
          message: `Processing metadata types...`
        });
      } else if (message.command === 'myComponentsComplete') {
        // Loading complete
        setLoading(false);
        setLoadingProgress({ current: 0, total: 0, message: '' });
        setIsSelectiveRefresh(false); // Reset selective refresh flag
        setRefreshingTypes([]); // Clear refreshing types
        
        // Update last refresh timestamp
        if (message.lastRefresh) {
          setLastRefresh(message.lastRefresh);
        }
      }
    };

    window.addEventListener('message', messageListener);
    return () => window.removeEventListener('message', messageListener);
  }, []);

  // Fetch components on initial mount only if not already loaded
  useEffect(() => {
    if (embedded && !hasInitiallyLoaded) {
      console.log('Checking for cached components...');
      setHasInitiallyLoaded(true);
      globalState.vscode.postMessage({
        command: 'FETCH_MY_COMPONENTS',
        forceRefresh: false // Check cache first
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update global state when myComponents changes
  useEffect(() => {
    dispatch({
      type: 'UPDATE_MY_COMPONENTS',
      payload: myComponents
    });
  }, [myComponents, dispatch]);

  const handleRefresh = () => {
    // Show modal immediately with loading state
    setShowRefreshModal(true);
    setLoadingMetadataTypes(true);
    setAllMetadataTypes([]);
    
    // Request all metadata types from the extension
    globalState.vscode.postMessage({
      command: 'GET_ALL_METADATA_TYPES'
    });
  };
  
  const handleConfirmRefresh = () => {
    setShowRefreshModal(false);
    setLoading(true);
    setIsSelectiveRefresh(true); // Mark as selective refresh
    setRefreshingTypes(refreshMetadataTypes); // Store which types we're refreshing
    
    // Remove components of the types being refreshed (they'll be re-added with fresh data)
    setMyComponents(prev => prev.filter(comp => !refreshMetadataTypes.includes(comp.type)));
    
    globalState.vscode.postMessage({
      command: 'FETCH_MY_COMPONENTS',
      forceRefresh: true, // Force refresh to bypass cache
      metadataTypes: refreshMetadataTypes, // Only fetch selected types
      isSelectiveRefresh: true // Flag to indicate this is a selective refresh
    });
  };
  
  const handleCancelRefresh = () => {
    setShowRefreshModal(false);
    setRefreshSearchKey("");
    setLoadingMetadataTypes(false);
  };
  
  const handleToggleRefreshType = (metadataType) => {
    setRefreshMetadataTypes(prev => {
      if (prev.includes(metadataType)) {
        return prev.filter(t => t !== metadataType);
      } else {
        return [...prev, metadataType];
      }
    });
  };
  
  const handleSelectAllRefreshTypes = () => {
    const filteredTypes = getFilteredRefreshTypes();
    setRefreshMetadataTypes(filteredTypes);
  };
  
  const handleDeselectAllRefreshTypes = () => {
    setRefreshMetadataTypes([]);
  };
  
  const getFilteredRefreshTypes = () => {
    if (!refreshSearchKey) {
      return allMetadataTypes;
    }
    return allMetadataTypes.filter(type => 
      type.toUpperCase().includes(refreshSearchKey.toUpperCase())
    );
  };

  const handleSort = (columnKey) => {
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnKey, direction });
  };

  const handleMetadataTypeFilterClick = (event) => {
    setMetadataTypeFilterAnchor(event.currentTarget);
  };

  const handleMetadataTypeFilterClose = () => {
    setMetadataTypeFilterAnchor(null);
  };

  const handleMetadataTypeFilterToggle = (metadataType) => {
    setMetadataTypeFilter(prev => {
      if (prev.includes(metadataType)) {
        return prev.filter(t => t !== metadataType);
      } else {
        return [...prev, metadataType];
      }
    });
  };

  const handleClearMetadataTypeFilter = () => {
    setMetadataTypeFilter([]);
  };

  // Get unique metadata types
  const uniqueMetadataTypes = [...new Set(myComponents.map(comp => comp.metadataType))].sort();

  const handleSelectAll = () => {
    const filteredComponents = getFilteredAndSortedComponents();
    const filteredIds = new Set(filteredComponents.map(comp => comp.id));
    
    setMyComponents(prev => prev.map(comp => {
      if (filteredIds.has(comp.id)) {
        return { ...comp, isSelected: true };
      }
      return comp;
    }));
  };

  const handleClearAll = () => {
    const filteredComponents = getFilteredAndSortedComponents();
    const filteredIds = new Set(filteredComponents.map(comp => comp.id));
    
    setMyComponents(prev => prev.map(comp => {
      if (filteredIds.has(comp.id)) {
        return { ...comp, isSelected: false };
      }
      return comp;
    }));
  };

  const handleComponentToggle = (componentId) => {
    setMyComponents(prev => prev.map(comp => 
      comp.id === componentId ? { ...comp, isSelected: !comp.isSelected } : comp
    ));
  };

  const getFilteredAndSortedComponents = () => {
    let components = [...myComponents];
    
    // Apply text filter
    if (filterKey) {
      components = components.filter(comp => 
        comp.componentName.toUpperCase().includes(filterKey.toUpperCase()) ||
        comp.metadataType.toUpperCase().includes(filterKey.toUpperCase())
      );
    }
    
    // Apply metadata type filter
    if (metadataTypeFilter.length > 0) {
      components = components.filter(comp => 
        metadataTypeFilter.includes(comp.metadataType)
      );
    }
    
    // Apply sorting
    components.sort((a, b) => {
      let aValue, bValue;
      
      switch(sortConfig.key) {
        case 'metadataType':
          aValue = a.metadataType || '';
          bValue = b.metadataType || '';
          break;
        case 'componentName':
          aValue = a.componentName || '';
          bValue = b.componentName || '';
          break;
        case 'lastModifiedByName':
          aValue = a.lastModifiedByName || '';
          bValue = b.lastModifiedByName || '';
          break;
        case 'lastModifiedDate':
          aValue = a.lastModifiedDate ? new Date(a.lastModifiedDate).getTime() : 0;
          bValue = b.lastModifiedDate ? new Date(b.lastModifiedDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return components;
  };

  const getSelectionState = () => {
    const filteredComponents = getFilteredAndSortedComponents();
    if (filteredComponents.length === 0) {
      return { checked: false, indeterminate: false };
    }
    
    const selectedCount = filteredComponents.filter(comp => comp.isSelected).length;
    
    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === filteredComponents.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  };

  const selectionState = getSelectionState();
  const selectedCount = myComponents.filter(comp => comp.isSelected).length;
  const filteredComponents = getFilteredAndSortedComponents();
  const filteredRefreshTypes = getFilteredRefreshTypes();
  
  // Check if last refresh is more than 1 day old
  const isRefreshOld = () => {
    if (!lastRefresh) return false;
    const now = new Date();
    const refreshDate = new Date(lastRefresh);
    const diffInMs = now - refreshDate;
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    return diffInDays > 1;
  };
  
  // Format last refresh date
  const formatLastRefresh = () => {
    if (!lastRefresh) return null;
    const date = new Date(lastRefresh);
    return date.toLocaleString();
  };

  // Render the main content
  const renderContent = () => (
    <>
      {!embedded && (
        <div className="dialog-title">
          My Components ({myComponents.length} total, {selectedCount} selected)
        </div>
      )}
      <div className="dialog-content" style={embedded ? { padding: 0 } : {}}>
        {/* Show loading indicator ABOVE the table when loading */}
        {loading && (
          <div style={{ 
            backgroundColor: 'var(--vscode-editor-background)', 
            padding: '8px 12px', 
            marginBottom: '12px', 
            borderRadius: '4px',
            border: '1px solid var(--vscode-panel-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Refreshing metadata list...
                </div>
                {loadingProgress.total > 0 && (
                  <>
                    <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '6px' }}>
                      {loadingProgress.current} of {loadingProgress.total} metadata types processed
                      {myComponents.length > 0 && (
                        <span style={{ color: 'var(--accent-green)', marginLeft: '8px' }}>
                          • {myComponents.length} components found
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '4px', 
                      backgroundColor: 'var(--vscode-input-background)', 
                      borderRadius: '2px', 
                      overflow: 'hidden' 
                    }}>
                      <div style={{ 
                        width: `${(loadingProgress.current / loadingProgress.total) * 100}%`, 
                        height: '100%', 
                        backgroundColor: 'var(--accent-blue)',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Show table controls and table once we have components OR if loading is complete */}
        {(myComponents.length > 0 || !loading) && (
          <>
            {/* Last Refresh Date */}
            {lastRefresh && (
              <div style={{ 
                marginBottom: 12, 
                padding: '8px 12px', 
                backgroundColor: isRefreshOld() ? 'rgba(255, 0, 0, 0.15)' : 'var(--vscode-editor-background)',
                border: `1px solid ${isRefreshOld() ? 'rgba(255, 0, 0, 0.5)' : 'var(--vscode-panel-border)'}`,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: isRefreshOld() ? 'flash 2s ease-in-out infinite' : 'none'
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill={isRefreshOld() ? '#ff4444' : 'currentColor'}>
                  <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                </svg>
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: isRefreshOld() ? 'bold' : 'normal',
                  color: isRefreshOld() ? '#ff4444' : 'inherit'
                }}>
                  Last Refreshed: {formatLastRefresh()}
                  {isRefreshOld() && <span style={{ marginLeft: '8px' }}>(More than 1 day old)</span>}
                </span>
              </div>
            )}
            
            <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="search-box" style={{ flex: 1 }}>
                <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Filter by component name or metadata type..."
                  value={filterKey}
                  onChange={(e) => setFilterKey(e.target.value)}
                />
              </div>
              <button onClick={handleRefresh} className="btn btn-primary" disabled={loading}>
                {loading ? 'Refreshing...' : 'REFRESH'}
              </button>
              <button onClick={handleSelectAll} className="btn btn-secondary">
                SELECT ALL
              </button>
              <button onClick={handleClearAll} className="btn btn-secondary">
                CLEAR ALL
              </button>
            </div>

            {metadataTypeFilter.length > 0 && (
              <div className="filter-chips">
                <strong style={{ fontSize: '13px' }}>
                  Metadata Type Filters:
                </strong>
                {metadataTypeFilter.map(type => (
                  <span key={type} className="chip">
                    {type}
                    <button 
                      className="chip-close"
                      onClick={() => handleMetadataTypeFilterToggle(type)}
                      aria-label="Remove filter"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button 
                  className="btn-sm btn-secondary"
                  onClick={handleClearMetadataTypeFilter}
                  style={{ marginLeft: 8 }}
                >
                  Clear All
                </button>
              </div>
            )}

            {Boolean(metadataTypeFilterAnchor) && (
              <div className="filter-popover" style={{
                top: metadataTypeFilterAnchor.getBoundingClientRect().bottom + 5,
                left: metadataTypeFilterAnchor.getBoundingClientRect().left
              }}>
                <div className="filter-backdrop" onClick={handleMetadataTypeFilterClose}></div>
                <div className="filter-popover-content">
                  <div className="filter-popover-header">
                    <strong>Filter by Metadata Type</strong>
                  </div>
                  <ul className="filter-list">
                    {uniqueMetadataTypes.map(type => (
                      <li key={type} className="filter-list-item">
                        <input
                          type="checkbox"
                          className="modern-checkbox"
                          checked={metadataTypeFilter.includes(type)}
                          onChange={() => handleMetadataTypeFilterToggle(type)}
                          id={`filter-${type}`}
                        />
                        <label htmlFor={`filter-${type}`}>{type}</label>
                      </li>
                    ))}
                  </ul>
                  {uniqueMetadataTypes.length === 0 && (
                    <div style={{ padding: '8px', opacity: 0.6 }}>
                      No metadata types available
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>
                      <input
                        type="checkbox"
                        className="modern-checkbox"
                        ref={input => {
                          if (input) {
                            input.indeterminate = selectionState.indeterminate;
                          }
                        }}
                        checked={selectionState.checked}
                        onChange={(evt) => {
                          if (evt.target.checked) {
                            handleSelectAll();
                          } else {
                            handleClearAll();
                          }
                        }}
                      />
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          className="sort-button"
                          onClick={() => handleSort('metadataType')}
                        >
                          <strong>Metadata Type</strong>
                          {sortConfig.key === 'metadataType' && (
                            <span className="sort-indicator">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                        <button 
                          className="filter-button"
                          onClick={handleMetadataTypeFilterClick}
                          style={{ color: metadataTypeFilter.length > 0 ? 'var(--accent-blue)' : 'inherit' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
                          </svg>
                        </button>
                      </div>
                    </th>
                    <th>
                      <button 
                        className="sort-button"
                        onClick={() => handleSort('componentName')}
                      >
                        <strong>Component Name</strong>
                        {sortConfig.key === 'componentName' && (
                          <span className="sort-indicator">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th>
                      <button 
                        className="sort-button"
                        onClick={() => handleSort('lastModifiedByName')}
                      >
                        <strong>Last Modified By</strong>
                        {sortConfig.key === 'lastModifiedByName' && (
                          <span className="sort-indicator">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th>
                      <button 
                        className="sort-button"
                        onClick={() => handleSort('lastModifiedDate')}
                      >
                        <strong>Last Modified Date</strong>
                        {sortConfig.key === 'lastModifiedDate' && (
                          <span className="sort-indicator">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComponents.map((component) => {
                    const lastModifiedDate = component.lastModifiedDate 
                      ? new Date(component.lastModifiedDate).toLocaleString()
                      : 'N/A';
                    
                    return (
                      <tr 
                        key={component.id} 
                        className={component.isSelected ? 'selected' : ''}
                        onClick={() => handleComponentToggle(component.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="modern-checkbox"
                            checked={component.isSelected}
                            onChange={() => handleComponentToggle(component.id)}
                          />
                        </td>
                        <td>{component.metadataType}</td>
                        <td>{component.componentName}</td>
                        <td>{component.lastModifiedByName || 'Unknown'}</td>
                        <td>{lastModifiedDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Show appropriate message based on state */}
            {filteredComponents.length === 0 && !loading && myComponents.length === 0 && hasAttemptedFetch && (
              <div style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>
                <div style={{ fontSize: '16px', marginBottom: '10px' }}>
                  No components found
                </div>
                <div style={{ fontSize: '14px' }}>
                  Click the <strong>REFRESH</strong> button to reload your components
                </div>
              </div>
            )}
            {filteredComponents.length === 0 && !loading && myComponents.length === 0 && !hasAttemptedFetch && (
              <div style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                <div style={{ fontSize: '16px', marginBottom: '10px' }}>
                  Loading...
                </div>
                <div style={{ fontSize: '14px' }}>
                  Checking for cached components
                </div>
              </div>
            )}
            {filteredComponents.length === 0 && !loading && myComponents.length > 0 && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                No components match the current filters.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  // Return dialog wrapper if not embedded, otherwise just render content
  if (embedded) {
    return (
      <>
        <div className="panel" style={{ padding: 16 }}>
          {renderContent()}
        </div>
        
        {/* Refresh Modal */}
        {showRefreshModal && (
          <div className="dialog-overlay" onClick={handleCancelRefresh}>
            <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
              <div className="dialog-title">
                Select Metadata Types to Refresh
              </div>
              <div className="dialog-content">
                {loadingMetadataTypes ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                      Retrieving metadata types...
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.7 }}>
                      Please wait while we fetch available metadata types from your org
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    <div className="search-box" style={{ marginBottom: 12 }}>
                      <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                      </svg>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Search metadata types..."
                        value={refreshSearchKey}
                        onChange={(e) => setRefreshSearchKey(e.target.value)}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <button onClick={handleSelectAllRefreshTypes} className="btn btn-secondary btn-sm">
                        Select All
                      </button>
                      <button onClick={handleDeselectAllRefreshTypes} className="btn btn-secondary btn-sm">
                        Deselect All
                      </button>
                      <div style={{ flex: 1 }}></div>
                      <span style={{ fontSize: '13px', opacity: 0.8, alignSelf: 'center' }}>
                        {refreshMetadataTypes.length} selected
                      </span>
                    </div>
                    
                    <div style={{ 
                      maxHeight: '400px', 
                      overflowY: 'auto', 
                      border: '1px solid var(--vscode-panel-border)', 
                      borderRadius: '4px',
                      padding: '8px'
                    }}>
                      {filteredRefreshTypes.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                          {filteredRefreshTypes.map(type => (
                            <label 
                              key={type} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                padding: '6px 8px',
                                cursor: 'pointer',
                                borderRadius: '3px',
                                backgroundColor: refreshMetadataTypes.includes(type) ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent'
                              }}
                            >
                              <input
                                type="checkbox"
                                className="modern-checkbox"
                                checked={refreshMetadataTypes.includes(type)}
                                onChange={() => handleToggleRefreshType(type)}
                                style={{ marginRight: '8px' }}
                              />
                              <span style={{ fontSize: '13px' }}>{type}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: 20, opacity: 0.6 }}>
                          No metadata types match your search
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button onClick={handleCancelRefresh} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmRefresh} 
                    className="btn btn-primary"
                    disabled={refreshMetadataTypes.length === 0 || loadingMetadataTypes}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (!open) return null;

  return (
    <>
      <div className="dialog-overlay" onClick={onClose}>
        <div className="dialog" onClick={(e) => e.stopPropagation()}>
          {renderContent()}
        </div>
      </div>
      
      {/* Refresh Modal */}
      {showRefreshModal && (
        <div className="dialog-overlay" onClick={handleCancelRefresh} style={{ zIndex: 10000 }}>
          <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div className="dialog-title">
              Select Metadata Types to Refresh
            </div>
            <div className="dialog-content">
              <div style={{ marginBottom: 16 }}>
                <div className="search-box" style={{ marginBottom: 12 }}>
                  <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                  </svg>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search metadata types..."
                    value={refreshSearchKey}
                    onChange={(e) => setRefreshSearchKey(e.target.value)}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button onClick={handleSelectAllRefreshTypes} className="btn btn-secondary btn-sm">
                    Select All
                  </button>
                  <button onClick={handleDeselectAllRefreshTypes} className="btn btn-secondary btn-sm">
                    Deselect All
                  </button>
                  <div style={{ flex: 1 }}></div>
                  <span style={{ fontSize: '13px', opacity: 0.8, alignSelf: 'center' }}>
                    {refreshMetadataTypes.length} selected
                  </span>
                </div>
                
                <div style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  border: '1px solid var(--vscode-panel-border)', 
                  borderRadius: '4px',
                  padding: '8px'
                }}>
                  {filteredRefreshTypes.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                      {filteredRefreshTypes.map(type => (
                        <label 
                          key={type} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '6px 8px',
                            cursor: 'pointer',
                            borderRadius: '3px',
                            backgroundColor: refreshMetadataTypes.includes(type) ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent'
                          }}
                        >
                          <input
                            type="checkbox"
                            className="modern-checkbox"
                            checked={refreshMetadataTypes.includes(type)}
                            onChange={() => handleToggleRefreshType(type)}
                            style={{ marginRight: '8px' }}
                          />
                          <span style={{ fontSize: '13px' }}>{type}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20, opacity: 0.6 }}>
                      No metadata types match your search
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={handleCancelRefresh} className="btn btn-secondary">
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmRefresh} 
                  className="btn btn-primary"
                  disabled={refreshMetadataTypes.length === 0}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
