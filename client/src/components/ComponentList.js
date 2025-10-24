import React,{useState,useContext} from 'react';
import { GlobalContext } from "../App";
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import InputAdornment from '@material-ui/core/InputAdornment';
import SearchIcon from '@material-ui/icons/Search';
import Checkbox from '@material-ui/core/Checkbox';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import Chip from '@material-ui/core/Chip';
import FilterListIcon from '@material-ui/icons/FilterList';
import IconButton from '@material-ui/core/IconButton';
import Popover from '@material-ui/core/Popover';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';

const useStyles = makeStyles({
  root: {
    minWidth: 275,
  },
  title: {
    fontSize: 10,
  },
  pos: {
    marginBottom: 12,
  },
  table: {
    minWidth: 650,
  }
});

export default function ComponentList({selectedMetadataType,isShowChildren}) {
  const classes = useStyles();
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
    <Card className={classes.root} variant="outlined">
		<CardHeader
      titleTypographyProps={{variant:'h6' }}
			title={selectedMetadataType.text!==''?selectedMetadataType.text:'Available Components'}
      action={
        <React.Fragment>
        <Button onClick={handleSelectAll}>Select All</Button>
        <Button onClick={handleClearAll}>Clear All</Button>
        </React.Fragment>
      }
      
      />
      <CardContent>
      <TextField
      id="input-with-icon-textfield"
      variant="outlined"
      placeholder={selectedMetadataType.text!==''?'Filter '+selectedMetadataType.text+'..':'Filter Components..'}
      value={filterKey}
      onChange={handleFilterKeyChange}
      size="small"
      InputProps={{
      startAdornment: (
        <InputAdornment position="start">
        <SearchIcon />
        </InputAdornment>
      ),
      }}
      fullWidth
      />
      {hasActiveFilters() && (
        <Paper style={{padding: 10, marginTop: 10, backgroundColor: '#f5f5f5'}}>
          <div style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5}}>
            <strong style={{marginRight: 10}}>Active Filters:</strong>
            {columnFilters.name.length > 0 && (
              <Chip 
                label={`Name: ${columnFilters.name.length} selected`} 
                onDelete={() => clearColumnFilter('name')}
                size="small"
                color="primary"
              />
            )}
            {columnFilters.lastModifiedBy.length > 0 && (
              <Chip 
                label={`Modified By: ${columnFilters.lastModifiedBy.length} selected`} 
                onDelete={() => clearColumnFilter('lastModifiedBy')}
                size="small"
                color="primary"
              />
            )}
            {columnFilters.lastModifiedDate.length > 0 && (
              <Chip 
                label={`Date: ${columnFilters.lastModifiedDate.length} selected`} 
                onDelete={() => clearColumnFilter('lastModifiedDate')}
                size="small"
                color="primary"
              />
            )}
          </div>
        </Paper>
      )}
      {hasLastModifiedBy ? (
        // Table view with LastModifiedBy column
        <TableContainer component={Paper} style={{maxHeight: 500, overflow: 'auto', marginTop: 10}}>
          <Table className={classes.table} size="small" stickyHeader aria-label="metadata components table">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={filteredSelectionState.indeterminate}
                    checked={filteredSelectionState.checked}
                    onChange={(evt) => {
                      if (evt.target.checked) {
                        handleSelectAll();
                      } else {
                        handleClearAll();
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <TableSortLabel
                      active={sortConfig.key === 'name'}
                      direction={sortConfig.key === 'name' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('name')}
                    >
                      <strong>Component Name</strong>
                    </TableSortLabel>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleFilterClick(e, 'name')}
                      color={columnFilters.name.length > 0 ? 'primary' : 'default'}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                  </div>
                </TableCell>
                <TableCell>
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <TableSortLabel
                      active={sortConfig.key === 'lastModifiedBy'}
                      direction={sortConfig.key === 'lastModifiedBy' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('lastModifiedBy')}
                    >
                      <strong>Last Modified By</strong>
                    </TableSortLabel>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleFilterClick(e, 'lastModifiedBy')}
                      color={columnFilters.lastModifiedBy.length > 0 ? 'primary' : 'default'}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                  </div>
                </TableCell>
                <TableCell>
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <TableSortLabel
                      active={sortConfig.key === 'lastModifiedDate'}
                      direction={sortConfig.key === 'lastModifiedDate' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('lastModifiedDate')}
                    >
                      <strong>Last Modified Date</strong>
                    </TableSortLabel>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleFilterClick(e, 'lastModifiedDate')}
                      color={columnFilters.lastModifiedDate.length > 0 ? 'primary' : 'default'}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                  </div>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredAndSortedChildren().map(child => {
                const lastModifiedDate = child.lastModifiedDate 
                  ? new Date(child.lastModifiedDate).toLocaleString()
                  : 'N/A';
                
                return (
                  <TableRow key={child.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox 
                        checked={child.isSelected}
                        onClick={evt=>handleComponentClick(child,evt)}
                      />
                    </TableCell>
                    <TableCell>{child.text}</TableCell>
                    <TableCell>{child.lastModifiedByName || 'N/A'}</TableCell>
                    <TableCell>{lastModifiedDate}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        // Original checkbox list view
        <Paper style={{maxHeight: 500, overflow: 'auto'}}>
          <FormGroup>
            {
              selectedMetadataType.children.map(child=>{
             
                if(child.text.toUpperCase().includes(filterKey.toUpperCase())){
             
                  return (
                    <FormControlLabel
                      key={child.id}
                      control={<Checkbox value={child.id} checked={child.isSelected}
                      onClick={evt=>handleComponentClick(child,evt)}/>}
                      label={child.text}/>
                  )

                }else{
                  return null;
                }

              })

            }
        
          </FormGroup>
        </Paper>
      )}
      </CardContent>
      
      {/* Filter Popover */}
      <Popover
        open={openFilter}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Paper style={{padding: 10, maxHeight: 400, overflow: 'auto', minWidth: 250}}>
          <div style={{marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <strong>
              {activeFilterColumn === 'name' && 'Filter by Name'}
              {activeFilterColumn === 'lastModifiedBy' && 'Filter by User'}
              {activeFilterColumn === 'lastModifiedDate' && 'Filter by Date'}
            </strong>
            {activeFilterColumn && columnFilters[activeFilterColumn].length > 0 && (
              <Button size="small" onClick={() => clearColumnFilter(activeFilterColumn)}>
                Clear
              </Button>
            )}
          </div>
          <List dense>
            {activeFilterColumn && getUniqueValues(activeFilterColumn).map(value => (
              <ListItem 
                key={value} 
                button 
                onClick={() => handleColumnFilterToggle(activeFilterColumn, value)}
              >
                <Checkbox
                  edge="start"
                  checked={columnFilters[activeFilterColumn].includes(value)}
                  tabIndex={-1}
                  disableRipple
                />
                <ListItemText primary={value} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Popover>
    </Card>
  );
}

