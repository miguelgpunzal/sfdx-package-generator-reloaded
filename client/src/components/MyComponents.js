import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from "../App";
import { makeStyles } from '@material-ui/core/styles';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import Paper from '@material-ui/core/Paper';
import Checkbox from '@material-ui/core/Checkbox';
import TextField from '@material-ui/core/TextField';
import InputAdornment from '@material-ui/core/InputAdornment';
import SearchIcon from '@material-ui/icons/Search';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import Popover from '@material-ui/core/Popover';
import IconButton from '@material-ui/core/IconButton';
import FilterListIcon from '@material-ui/icons/FilterList';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Chip from '@material-ui/core/Chip';

const useStyles = makeStyles({
  table: {
    minWidth: 650,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    flexDirection: 'column',
  },
});

export default function MyComponents({ open, onClose, embedded = false }) {
  const classes = useStyles();
  const { globalState } = useContext(GlobalContext);
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

  const handleBuildPackageXml = () => {
    const selectedComponents = myComponents.filter(comp => comp.isSelected);
    
    if (selectedComponents.length === 0) {
      return;
    }

    // Send selected components to build package.xml
    globalState.vscode.postMessage({
      command: 'BUILD_PACKAGE_FROM_MY_COMPONENTS',
      components: selectedComponents
    });
  };

  const handleCopyToClipboard = () => {
    const selectedComponents = myComponents.filter(comp => comp.isSelected);
    
    if (selectedComponents.length === 0) {
      return;
    }

    // Send selected components to copy to clipboard
    globalState.vscode.postMessage({
      command: 'COPY_MY_COMPONENTS_TO_CLIPBOARD',
      components: selectedComponents
    });
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
        <DialogTitle id="my-components-dialog-title">
          My Components ({myComponents.length} total, {selectedCount} selected)
        </DialogTitle>
      )}
      <DialogContent style={embedded ? { padding: 0 } : {}}>
        {loading ? (
          <div className={classes.loadingContainer}>
            <CircularProgress />
            <Typography variant="body1" style={{ marginTop: 20 }}>
              Loading your components...
            </Typography>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
              <TextField
                variant="outlined"
                placeholder="Filter by component name or metadata type..."
                value={filterKey}
                onChange={(e) => setFilterKey(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button onClick={handleSelectAll} variant="outlined">
                Select All
              </Button>
              <Button onClick={handleClearAll} variant="outlined">
                Clear All
              </Button>
            </div>

            {metadataTypeFilter.length > 0 && (
              <div style={{ marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="body2" style={{ fontWeight: 500 }}>
                  Metadata Type Filters:
                </Typography>
                {metadataTypeFilter.map(type => (
                  <Chip
                    key={type}
                    label={type}
                    onDelete={() => handleMetadataTypeFilterToggle(type)}
                    size="small"
                    color="primary"
                  />
                ))}
                <Button 
                  size="small" 
                  onClick={handleClearMetadataTypeFilter}
                  style={{ marginLeft: 8 }}
                >
                  Clear All
                </Button>
              </div>
            )}

            <Popover
              open={Boolean(metadataTypeFilterAnchor)}
              anchorEl={metadataTypeFilterAnchor}
              onClose={handleMetadataTypeFilterClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
            >
              <div style={{ padding: 16, maxHeight: 400, overflow: 'auto' }}>
                <Typography variant="subtitle2" style={{ marginBottom: 8, fontWeight: 600 }}>
                  Filter by Metadata Type
                </Typography>
                <FormGroup>
                  {uniqueMetadataTypes.map(type => (
                    <FormControlLabel
                      key={type}
                      control={
                        <Checkbox
                          checked={metadataTypeFilter.includes(type)}
                          onChange={() => handleMetadataTypeFilterToggle(type)}
                          size="small"
                        />
                      }
                      label={type}
                    />
                  ))}
                </FormGroup>
                {uniqueMetadataTypes.length === 0 && (
                  <Typography variant="body2" color="textSecondary">
                    No metadata types available
                  </Typography>
                )}
              </div>
            </Popover>
            
            <TableContainer component={Paper} style={{ maxHeight: 500 }}>
              <Table className={classes.table} size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectionState.indeterminate}
                        checked={selectionState.checked}
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
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <TableSortLabel
                          active={sortConfig.key === 'metadataType'}
                          direction={sortConfig.key === 'metadataType' ? sortConfig.direction : 'asc'}
                          onClick={() => handleSort('metadataType')}
                        >
                          <strong>Metadata Type</strong>
                        </TableSortLabel>
                        <IconButton 
                          size="small" 
                          onClick={handleMetadataTypeFilterClick}
                          style={{ marginLeft: 4 }}
                        >
                          <FilterListIcon 
                            fontSize="small" 
                            style={{ color: metadataTypeFilter.length > 0 ? '#1976d2' : 'inherit' }}
                          />
                        </IconButton>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.key === 'componentName'}
                        direction={sortConfig.key === 'componentName' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('componentName')}
                      >
                        <strong>Component Name</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.key === 'lastModifiedByName'}
                        direction={sortConfig.key === 'lastModifiedByName' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('lastModifiedByName')}
                      >
                        <strong>Last Modified By</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.key === 'lastModifiedDate'}
                        direction={sortConfig.key === 'lastModifiedDate' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('lastModifiedDate')}
                      >
                        <strong>Last Modified Date</strong>
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredComponents.map((component) => {
                    const lastModifiedDate = component.lastModifiedDate 
                      ? new Date(component.lastModifiedDate).toLocaleString()
                      : 'N/A';
                    
                    return (
                      <TableRow key={component.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox 
                            checked={component.isSelected}
                            onChange={() => handleComponentToggle(component.id)}
                          />
                        </TableCell>
                        <TableCell>{component.metadataType}</TableCell>
                        <TableCell>{component.componentName}</TableCell>
                        <TableCell>{component.lastModifiedByName || 'Unknown'}</TableCell>
                        <TableCell>{lastModifiedDate}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            
            {filteredComponents.length === 0 && !loading && (
              <Typography variant="body1" style={{ textAlign: 'center', padding: 20 }}>
                No components found.
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      {!embedded && (
        <DialogActions>
          <Button onClick={onClose}>
            Close
          </Button>
          <Button 
            onClick={handleCopyToClipboard} 
            color="primary"
            disabled={selectedCount === 0}
          >
            Copy to Clipboard
          </Button>
          <Button 
            onClick={handleBuildPackageXml} 
            color="primary" 
            variant="contained"
            disabled={selectedCount === 0}
          >
            Build Package.xml
          </Button>
        </DialogActions>
      )}
    </>
  );

  // Return dialog wrapper if not embedded, otherwise just render content
  if (embedded) {
    return (
      <Paper style={{ padding: 16 }}>
        <Typography variant="h6" style={{ marginBottom: 16 }}>
          My Components ({myComponents.length} total, {selectedCount} selected)
        </Typography>
        {renderContent()}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
          <Button 
            onClick={handleCopyToClipboard} 
            color="primary"
            disabled={selectedCount === 0}
          >
            Copy to Clipboard
          </Button>
          <Button 
            onClick={handleBuildPackageXml} 
            color="primary" 
            variant="contained"
            disabled={selectedCount === 0}
          >
            Build Package.xml
          </Button>
        </div>
      </Paper>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      aria-labelledby="my-components-dialog-title"
    >
      {renderContent()}
    </Dialog>
  );
}
