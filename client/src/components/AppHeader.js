import React, {useContext} from 'react';
import { GlobalContext } from "../App";
import '../components/AppHeader.css';

export default function AppHeader() {
  const { dispatch }= useContext(GlobalContext);

  const updatePackageXML=()=>{
    dispatch({type: "UPDATE_PACKAGE_XML"});
  };

  const copyToClipboard=()=>{
    dispatch({type: "COPY_TO_CLIPBOARD"});
  };

  const handleHowTo = ()=>{
    console.log('handleHowTo invoked');
    dispatch({type: "HOW_TO"});
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
          <button className="btn btn-secondary" onClick={handleHowTo}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
            </svg>
            How To
          </button>
        </div>
      </div>
    </div>
  );
}
