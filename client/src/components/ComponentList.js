import React,{useState,useContext} from 'react';
import { GlobalContext } from "../App";
import './ComponentList.css';

export default function ComponentList({selectedMetadataType,isShowChildren}) {
  const { dispatch }= useContext(GlobalContext);
  const [filterKey,setFilterKey] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'lastModifiedDate', direction: 'desc' });
  const [columnFilters, setColumnFilters] = useState({
    name: [],
    lastModifiedBy: [],
    lastModifiedDate: []
  });
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);

  const handleComponentClick = (component,evt)=>{
    console.log("handleComponentClick invoked ComponentList.js");
    const isChecked=evt.target.checked;
    const compId=component.id;
    selectedMetadataType.children=selectedMetadataType.children.map(child=>{
      if(compId===child.id){
        child.isSelected=isChecked;//update the child state
      }
      return child;
    });

    selectedMetadataType=updateMetadataType(selectedMetadataType);
    dispatch({type: "COMPONENT_CHECKBOX_STATE_CHANGE" , payload : selectedMetadataType});
    
  };

  const updateMetadataType = (selectedMetadataType)=>{
    console.log("updateMetadataType invoked ComponentList.js");

    const selectedChildrenArr=selectedMetadataType.children.filter(child=>child.isSelected);
    if(selectedChildrenArr.length===0){
      //None of the children is selected
      selectedMetadataType.isSelected=false;
      selectedMetadataType.isIndeterminate=false;
    }else if(selectedChildrenArr.length===selectedMetadataType.children.length){
      //ALl the children are selected
      selectedMetadataType.isSelected=true;
      selectedMetadataType.isIndeterminate=false;
    }else{
      //Some the children are selected
      selectedMetadataType.isSelected=false;
      selectedMetadataType.isIndeterminate=true;
    }

    return selectedMetadataType;

  };

  const handleSelectAll = ()=>{
    const filteredChildren = getFilteredAndSortedChildren();
    const filteredIds = new Set(filteredChildren.map(child => child.id));
    
    selectedMetadataType.children=selectedMetadataType.children.map(child=>{
      // Only select children that are currently filtered/displayed
      if (filteredIds.has(child.id)) {
        child.isSelected=true;
      }
      return child;
    });

    // Update parent selection state based on all children
    const selectedChildrenArr=selectedMetadataType.children.filter(child=>child.isSelected);
    if(selectedChildrenArr.length===0){
      selectedMetadataType.isSelected=false;
      selectedMetadataType.isIndeterminate=false;
    }else if(selectedChildrenArr.length===selectedMetadataType.children.length){
      selectedMetadataType.isSelected=true;
      selectedMetadataType.isIndeterminate=false;
    }else{
      selectedMetadataType.isSelected=false;
      selectedMetadataType.isIndeterminate=true;
    }
    
    dispatch({type: "COMPONENT_CHECKBOX_STATE_CHANGE" , payload : selectedMetadataType});
  };

  const handleClearAll = ()=>{
    const filteredChildren = getFilteredAndSortedChildren();
    const filteredIds = new Set(filteredChildren.map(child => child.id));
    
    selectedMetadataType.children=selectedMetadataType.children.map(child=>{
      // Only clear children that are currently filtered/displayed
      if (filteredIds.has(child.id)) {
        child.isSelected=false;
      }
      return child;
    });

    // Update parent selection state based on all children
    const selectedChildrenArr=selectedMetadataType.children.filter(child=>child.isSelected);
    if(selectedChildrenArr.length===0){
      selectedMetadataType.isSelected=false;
      selectedMetadataType.isIndeterminate=false;
    }else if(selectedChildrenArr.length===selectedMetadataType.children.length){
      selectedMetadataType.isSelected=true;
      selectedMetadataType.isIndeterminate=false;
    }else{
      selectedMetadataType.isSelected=false;
      selectedMetadataType.isIndeterminate=true;
    }
    
    dispatch({type: "COMPONENT_CHECKBOX_STATE_CHANGE" , payload : selectedMetadataType});
  };

  const handleFilterKeyChange=(event)=>{
    let fKey=event.target.value;
    fKey=fKey?fKey:'';
    setFilterKey(fKey);
  }

  const handleSort = (columnKey) => {
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnKey, direction });
  };

  const handleFilterClick = (event, column) => {
    setFilterAnchorEl(event.currentTarget);
    setActiveFilterColumn(column);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
    setActiveFilterColumn(null);
  };

  const handleColumnFilterToggle = (column, value) => {
    setColumnFilters(prev => {
      const currentFilters = prev[column];
      const newFilters = currentFilters.includes(value)
        ? currentFilters.filter(v => v !== value)
        : [...currentFilters, value];
      return { ...prev, [column]: newFilters };
    });
  };

  const clearColumnFilter = (column) => {
    setColumnFilters(prev => ({ ...prev, [column]: [] }));
  };

  const getUniqueValues = (column) => {
    const values = new Set();
    selectedMetadataType.children.forEach(child => {
      let value;
      switch(column) {
        case 'name':
          value = child.text;
          break;
        case 'lastModifiedBy':
          value = child.lastModifiedByName || 'N/A';
          break;
        case 'lastModifiedDate':
          value = child.lastModifiedDate 
            ? new Date(child.lastModifiedDate).toLocaleDateString()
            : 'N/A';
          break;
        default:
          return;
      }
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  };

  const applyColumnFilters = (children) => {
    return children.filter(child => {
      // Check name filter
      if (columnFilters.name.length > 0 && !columnFilters.name.includes(child.text)) {
        return false;
      }
      
      // Check lastModifiedBy filter
      if (columnFilters.lastModifiedBy.length > 0) {
        const modifiedBy = child.lastModifiedByName || 'N/A';
        if (!columnFilters.lastModifiedBy.includes(modifiedBy)) {
          return false;
        }
      }
      
      // Check lastModifiedDate filter
      if (columnFilters.lastModifiedDate.length > 0) {
        const date = child.lastModifiedDate 
          ? new Date(child.lastModifiedDate).toLocaleDateString()
          : 'N/A';
        if (!columnFilters.lastModifiedDate.includes(date)) {
          return false;
        }
      }
      
      return true;
    });
  };

  const getSortedChildren = (children) => {
    if (!sortConfig.key) {
      return children;
    }

    return [...children].sort((a, b) => {
      let aValue, bValue;
      
      switch(sortConfig.key) {
        case 'name':
          aValue = a.text || '';
          bValue = b.text || '';
          break;
        case 'lastModifiedBy':
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
  };

  const getFilteredAndSortedChildren = () => {
    let children = selectedMetadataType.children;
    
    // Apply text search filter
    if (filterKey) {
      children = children.filter(child => 
        child.text.toUpperCase().includes(filterKey.toUpperCase())
      );
    }
    
    // Apply column filters
    children = applyColumnFilters(children);
    
    // Apply sorting
    children = getSortedChildren(children);
    
    return children;
  };

  const hasActiveFilters = () => {
    return columnFilters.name.length > 0 || 
           columnFilters.lastModifiedBy.length > 0 || 
           columnFilters.lastModifiedDate.length > 0;
  };

  // Calculate selection state for filtered items only
  const getFilteredSelectionState = () => {
    const filteredChildren = getFilteredAndSortedChildren();
    if (filteredChildren.length === 0) {
      return { checked: false, indeterminate: false };
    }
    
    const selectedCount = filteredChildren.filter(child => child.isSelected).length;
    
    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === filteredChildren.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  };

  // Check if any child has lastModifiedByName to determine which view to use
  const hasLastModifiedBy = selectedMetadataType.children.some(child => child.lastModifiedByName);

  const openFilter = Boolean(filterAnchorEl);
  const filteredSelectionState = getFilteredSelectionState();

  return (
    <div className="component-list-container">
      <div className="panel-header">
        <h2 className="panel-title">
          {selectedMetadataType.text !== '' ? selectedMetadataType.text : 'Available Components'}
        </h2>
        <div className="panel-actions">
          <button className="btn btn-primary btn-sm" onClick={handleSelectAll}>
            Select All
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleClearAll}>
            Clear All
          </button>
        </div>
      </div>

      <div className="panel-content">
        <div className="search-box">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          <input
            type="text"
            className="input-field"
            placeholder={selectedMetadataType.text !== '' ? `Filter ${selectedMetadataType.text}...` : 'Filter Components...'}
            value={filterKey}
            onChange={handleFilterKeyChange}
          />
        </div>

        {hasActiveFilters() && (
          <div className="filter-chips">
            <strong style={{fontSize: '12px', marginRight: '8px'}}>Active Filters:</strong>
            {columnFilters.name.length > 0 && (
              <div className="chip">
                Name: {columnFilters.name.length} selected
                <button className="chip-close" onClick={() => clearColumnFilter('name')}>×</button>
              </div>
            )}
            {columnFilters.lastModifiedBy.length > 0 && (
              <div className="chip">
                Modified By: {columnFilters.lastModifiedBy.length} selected
                <button className="chip-close" onClick={() => clearColumnFilter('lastModifiedBy')}>×</button>
              </div>
            )}
            {columnFilters.lastModifiedDate.length > 0 && (
              <div className="chip">
                Date: {columnFilters.lastModifiedDate.length} selected
                <button className="chip-close" onClick={() => clearColumnFilter('lastModifiedDate')}>×</button>
              </div>
            )}
          </div>
        )}

        {hasLastModifiedBy ? (
        // Table view with LastModifiedBy column
        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{width: '40px'}}>
                  <input
                    type="checkbox"
                    className="modern-checkbox"
                    checked={filteredSelectionState.checked}
                    ref={el => {
                      if (el) el.indeterminate = filteredSelectionState.indeterminate;
                    }}
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
                  <div className="sort-indicator" style={{display: 'flex', alignItems: 'center'}}>
                    <span className={sortConfig.key === 'name' ? 'active' : ''} onClick={() => handleSort('name')} style={{cursor: 'pointer'}}>
                      Component Name
                      {sortConfig.key === 'name' && (
                        <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span>
                      )}
                    </span>
                    <button 
                      className="filter-btn"
                      onClick={(e) => handleFilterClick(e, 'name')}
                      style={{
                        marginLeft: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: columnFilters.name.length > 0 ? 'var(--accent-blue)' : 'inherit'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
                      </svg>
                    </button>
                  </div>
                </th>
                <th>
                  <div className="sort-indicator" style={{display: 'flex', alignItems: 'center'}}>
                    <span className={sortConfig.key === 'lastModifiedBy' ? 'active' : ''} onClick={() => handleSort('lastModifiedBy')} style={{cursor: 'pointer'}}>
                      Last Modified By
                      {sortConfig.key === 'lastModifiedBy' && (
                        <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span>
                      )}
                    </span>
                    <button 
                      className="filter-btn"
                      onClick={(e) => handleFilterClick(e, 'lastModifiedBy')}
                      style={{
                        marginLeft: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: columnFilters.lastModifiedBy.length > 0 ? 'var(--accent-blue)' : 'inherit'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
                      </svg>
                    </button>
                  </div>
                </th>
                <th>
                  <div className="sort-indicator" style={{display: 'flex', alignItems: 'center'}}>
                    <span className={sortConfig.key === 'lastModifiedDate' ? 'active' : ''} onClick={() => handleSort('lastModifiedDate')} style={{cursor: 'pointer'}}>
                      Last Modified Date
                      {sortConfig.key === 'lastModifiedDate' && (
                        <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span>
                      )}
                    </span>
                    <button 
                      className="filter-btn"
                      onClick={(e) => handleFilterClick(e, 'lastModifiedDate')}
                      style={{
                        marginLeft: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: columnFilters.lastModifiedDate.length > 0 ? 'var(--accent-blue)' : 'inherit'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
                      </svg>
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {getFilteredAndSortedChildren().map(child => {
                const lastModifiedDate = child.lastModifiedDate 
                  ? new Date(child.lastModifiedDate).toLocaleString()
                  : 'N/A';
                
                return (
                  <tr key={child.id} className={child.isSelected ? 'selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        className="modern-checkbox"
                        checked={child.isSelected}
                        onChange={evt=>handleComponentClick(child,evt)}
                      />
                    </td>
                    <td>{child.text}</td>
                    <td>{child.lastModifiedByName || 'N/A'}</td>
                    <td>{lastModifiedDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        // Original checkbox list view
        <div className="component-list-scroll">
          <ul className="modern-list">
            {selectedMetadataType.children.map(child=>{
              if(child.text.toUpperCase().includes(filterKey.toUpperCase())){
                return (
                  <li key={child.id} className="modern-list-item">
                    <input
                      type="checkbox"
                      className="modern-checkbox"
                      checked={child.isSelected}
                      onChange={evt=>handleComponentClick(child,evt)}
                    />
                    <span className="modern-list-item-text">{child.text}</span>
                  </li>
                )
              } else {
                return null;
              }
            })}
          </ul>
        </div>
      )}
      </div>
      
      {/* Filter Popover */}
      {openFilter && (
        <div className="filter-popover" style={{
          position: 'fixed',
          top: filterAnchorEl ? filterAnchorEl.getBoundingClientRect().bottom + 5 : 0,
          left: filterAnchorEl ? filterAnchorEl.getBoundingClientRect().left : 0,
          zIndex: 1000
        }}>
          <div className="filter-popover-content">
            <div className="filter-popover-header">
              <strong>
                {activeFilterColumn === 'name' && 'Filter by Name'}
                {activeFilterColumn === 'lastModifiedBy' && 'Filter by User'}
                {activeFilterColumn === 'lastModifiedDate' && 'Filter by Date'}
              </strong>
              {activeFilterColumn && columnFilters[activeFilterColumn].length > 0 && (
                <button className="btn btn-sm btn-secondary" onClick={() => clearColumnFilter(activeFilterColumn)}>
                  Clear
                </button>
              )}
            </div>
            <ul className="filter-list">
              {activeFilterColumn && getUniqueValues(activeFilterColumn).map(value => (
                <li 
                  key={value} 
                  className="filter-list-item"
                  onClick={() => handleColumnFilterToggle(activeFilterColumn, value)}
                >
                  <input
                    type="checkbox"
                    className="modern-checkbox"
                    checked={columnFilters[activeFilterColumn].includes(value)}
                    readOnly
                  />
                  <span>{value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="filter-backdrop" onClick={handleFilterClose}></div>
        </div>
      )}
    </div>
  );
}

