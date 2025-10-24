import React, { createContext, useReducer, useEffect, useState } from 'react';
import { vscode } from "./index";
import './App.css';
import './components/ModernUI.css';
import AppHeader from "./components/AppHeader";
import MetadataType from "./components/MetadataType";
import ComponentList from "./components/ComponentList";
import MyComponents from "./components/MyComponents";
import {reducer} from "./context/reducer";

export const GlobalContext = createContext();

function App() {
  const [globalState, dispatch] = useReducer(reducer, {'vscode' : vscode, metadataTypes : [], selectedMetadataType : {id:'',text:'',children:[]}, isShowChildren : false, myComponents: []});
  const [tabValue, setTabValue] = useState(0);
  console.log(vscode);

  useEffect(()=>{
    console.log('Inside INIT_LOAD_REQUEST useEffect() App.js');
    dispatch({ type: "INIT_LOAD_REQUEST" });
  },[globalState.vscode]);

  
useEffect(()=>{
  console.log('Inside messageEventListener useEffect() App.js');
    const messageEventListener= (event) => {
      const message = event.data; // The json data that the extension sent
      console.log(event.data);
      switch (message.command) {
          case 'metadataObjects':
              let metadataObjects=message.metadataObjects;
              console.log("Inside App.js metadataObjects event listener "+metadataObjects.length);
              dispatch({ type: "INIT_LOAD_RESPONSE" , payload : message});
              break;
          
          case 'listmetadata':
            console.log("Inside App.js listmetadata event listener");
            dispatch({ type: "FETCH_CHILDREN_RESPONSE" , payload : message});
            break;

          default:
            break;
          
      }
    }

    window.addEventListener('message', messageEventListener);
    return ()=>{
      window.removeEventListener('message', messageEventListener);
    };
},[globalState.vscode]);

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
  };

  return (
    <GlobalContext.Provider value={{ globalState, dispatch, currentTab: tabValue }}>
      <div className="App">
        <div className="app-container">
          {/* Header */}
          <div className="app-header">
            <AppHeader/>
          </div>
          
          {/* Tabs */}
          <div className="tab-container">
            <div className="tabs">
              <button 
                className={`tab ${tabValue === 0 ? 'active' : ''}`}
                onClick={() => handleTabChange(0)}
              >
                My Components
              </button>
              <button 
                className={`tab ${tabValue === 1 ? 'active' : ''}`}
                onClick={() => handleTabChange(1)}
              >
                All Components
              </button>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="tab-content">
            {tabValue === 0 && (
              <div className="fade-in">
                <MyComponents embedded={true} />
              </div>
            )}
            
            {tabValue === 1 && (
              <div className="two-panel-layout fade-in">
                <div className="panel">
                  <MetadataType/>
                </div>
                <div className="panel">
                  {globalState.selectedMetadataType.id !== '' && (
                    <ComponentList 
                      selectedMetadataType={globalState.selectedMetadataType} 
                      isShowChildren={globalState.isShowChildren}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </GlobalContext.Provider>
  );
}

export default App;
