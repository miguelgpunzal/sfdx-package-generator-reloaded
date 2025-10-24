import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from "../App";
import './MyComponents.css';
import '../components/ModernUI.css';

export default function MyComponents({ open, onClose, embedded = false }) {
  const { globalState, dispatch } = useContext(GlobalContext);
  const [loading, setLoading] = useState(false);
  const [myComponents, setMyComponents] = useState([]);
  const [filterKey, setFilterKey] = useState("");
  const [metadataTypeFilter, setMetadataTypeFilter] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'lastModifiedDate', direction: 'desc' });
  const [metadataTypeFilterAnchor, setMetadataTypeFilterAnchor] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Listen for response from extension
  useEffect(() => {
    const messageListener = (event) => {
      const message = event.data;
      if (message.command === 'myComponentsResponse') {
        const components = message.components || [];
        setMyComponents(components.map(comp => ({ ...comp, isSelected: false })));
        setLoading(false);
      }
    };

    window.addEventListener('message', messageListener);
    return () => window.removeEventListener('message', messageListener);
  }, []);

  useEffect(() => {
    if (embedded && !hasInitialized) {
      // For embedded mode, fetch immediately on mount
      setLoading(true);
      setHasInitialized(true);
      globalState.vscode.postMessage({
        command: 'FETCH_MY_COMPONENTS'
      });
    } else if (open && !embedded) {
      // For dialog mode, fetch when opened
      setLoading(true);
      globalState.vscode.postMessage({
        command: 'FETCH_MY_COMPONENTS'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, embedded]);

  // Update global state when myComponents changes
  useEffect(() => {
    dispatch({
      type: 'UPDATE_MY_COMPONENTS',
      payload: myComponents
    });
  }, [myComponents, dispatch]);

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

  // Render the main content
  const renderContent = () => (
    <>
      {!embedded && (
        <div className="dialog-title">
          My Components ({myComponents.length} total, {selectedCount} selected)
        </div>
      )}
      <div className="dialog-content" style={embedded ? { padding: 0 } : {}}>
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <div style={{ marginTop: 20 }}>
              Loading your components...
            </div>
          </div>
        ) : (
          <>
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
              <button onClick={handleSelectAll} className="btn-secondary">
                Select All
              </button>
              <button onClick={handleClearAll} className="btn-secondary">
                Clear All
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
                      <tr key={component.id} className={component.isSelected ? 'selected' : ''}>
                        <td>
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
            
            {filteredComponents.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                No components found.
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
      <div className="panel" style={{ padding: 16 }}>
        {renderContent()}
      </div>
    );
  }

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </div>
    </div>
  );
}
