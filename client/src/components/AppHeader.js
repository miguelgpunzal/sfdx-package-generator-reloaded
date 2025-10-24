import React, {useContext} from 'react';
import { GlobalContext } from "../App";
import '../components/AppHeader.css';

export default function AppHeader() {
  const { globalState, dispatch, currentTab }= useContext(GlobalContext);

  const updatePackageXML=()=>{
    dispatch({type: "UPDATE_PACKAGE_XML", payload: { currentTab }});
  };

  const copyToClipboard=()=>{
    dispatch({type: "COPY_TO_CLIPBOARD", payload: { currentTab }});
  };

  // Calculate selection count based on current tab
  const getSelectionInfo = () => {
    if (currentTab === 0) {
      // My Components tab
      const myComponents = globalState.myComponents || [];
      const selectedCount = myComponents.filter(comp => comp.isSelected).length;
      return `(${selectedCount} selected)`;
    } else {
      // All Components tab
      return '';
    }
  };

  return (
    <div className="app-header-container">
      <div className="header-content">
        <div className="header-title">
          <svg className="header-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="currentColor" opacity="0.3"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1>Salesforce Package XML Generator</h1>
          {getSelectionInfo() && (
            <span className="selection-count">{getSelectionInfo()}</span>
          )}
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={updatePackageXML}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.5 1.5v3.5h3.5L9.5 1.5z"/>
              <path d="M2 2a1 1 0 0 1 1-1h5v4a1 1 0 0 0 1 1h4v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2z"/>
            </svg>
            Update Package.xml
          </button>
          <button className="btn btn-secondary" onClick={copyToClipboard}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
              <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
            </svg>
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
}
