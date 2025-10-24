import React,{useState,useContext} from 'react';
import { GlobalContext } from "../App";
import './MetadataType.css';

export default function MetadataType() {
  const { globalState, dispatch }= useContext(GlobalContext);
  const [filterKey,setFilterKey] = useState("");
  
  const handleCheckboxChange = (evt,metadataType)=>{
    evt.stopPropagation();
    console.log('handleCheckboxChange invoked MetadataType.js');
    const isChecked=evt.target.checked;
    metadataType.isSelected=isChecked;
    metadataType.isIndeterminate=false;//reset indeterminate state
    console.log(metadataType);
    dispatch({type: "MDATA_TYPE_CHECKBOX_STATE_CHANGE" , payload : metadataType});
    //window.scrollTo(0, 0);Commented for #35
    
  };

 const handleMetadataClick = (evt,metadataType)=>{
    evt.stopPropagation();
    console.log('handleMetadataClick invoked MetadataType.js');
    console.log(metadataType);
    dispatch({type: "MDATA_TYPE_CLICK" , payload : metadataType});
    //window.scrollTo(0, 0);Commented for #35
  };

  const handleSelectAll =()=>{
    console.log("handleSelectAll MetadataType.js");
    let parNodeArr=[];
    let skippedMetadataTypes=[];   

    const metadataTypes=globalState.metadataTypes.map(metadataType => {
      
    if(!metadataType.inFolder && !metadataType.isChildXMLName){
      parNodeArr.push(metadataType.id);
      metadataType.isSelected=true;
      metadataType.isIndeterminate=false;//reset indeterminate state
    }else{
      skippedMetadataTypes.push(metadataType.id);
    }

      return metadataType;
    });
      //Added for #18 - starts
    if(skippedMetadataTypes && skippedMetadataTypes.length>0){
      console.log("skippedMetadataTypes");
      console.log(skippedMetadataTypes);
      skippedMetadataTypes.sort();
      //alert("The following Metadata Types will be skipped "+skippedMetadataTypes.join());
    }
    //Added for #18 - ends
    parNodeArr.sort();

    dispatch({type: "MDATA_TYPE_SELECT_ALL" , payload : {metadataTypes,parNodeArr,skippedMetadataTypes}});
  };

  const handleClearAll=()=>{
    console.log("handleClearAll MetadataType.js");
    dispatch({type: "MDATA_TYPE_CLEAR_ALL" });
  };

  const handleFilterKeyChange=(event)=>{
    let fKey=event.target.value;
    fKey=fKey?fKey:'';
    setFilterKey(fKey);
  }

  return (
    <div className="metadata-type-container">
      <div className="panel-header">
        <h2 className="panel-title">Metadata Types</h2>
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
            placeholder="Filter Metadata Types..."
            value={filterKey}
            onChange={handleFilterKeyChange}
          />
        </div>

        <ul className="modern-list">
          {globalState.metadataTypes.map(metadataType => {
            if(metadataType.id.toUpperCase().includes(filterKey.toUpperCase())){
              return(
                <li 
                  key={metadataType.id} 
                  className={`modern-list-item ${metadataType.id === globalState.selectedMetadataType.id ? 'active' : ''}`}
                  onClick={evt=>handleMetadataClick(evt,metadataType)}
                  title='Click to view available Metadata Components'
                >
                  <input
                    type="checkbox"
                    className="modern-checkbox"
                    checked={metadataType.isSelected}
                    ref={el => {
                      if (el) el.indeterminate = metadataType.isIndeterminate;
                    }}
                    onClick={evt=>handleCheckboxChange(evt,metadataType)}
                    onChange={() => {}}
                  />
                  <span className="modern-list-item-text">{metadataType.id}</span>
                  <svg className="modern-list-item-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                  </svg>
                </li>
              );
            } else {
              return null;
            }
          })}
        </ul>
      </div>
    </div>
  );
}
