import React, { createContext, useReducer, useEffect, useState } from 'react';
import { vscode } from "./index";
import './App.css';
import AppHeader from "./components/AppHeader";
import MetadataType from "./components/MetadataType";
import ComponentList from "./components/ComponentList";
import MyComponents from "./components/MyComponents";
import { createMuiTheme, makeStyles, ThemeProvider } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Box from '@material-ui/core/Box';
import {reducer} from "./context/reducer";


const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  },
  tabPanel: {
    padding: theme.spacing(2),
  }
}));

export const GlobalContext = createContext();

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={0}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const classes = useStyles();
  const [globalState, dispatch] = useReducer(reducer, {'vscode' : vscode, metadataTypes : [], selectedMetadataType : {id:'',text:'',children:[]}, isShowChildren : false});
  const [tabValue, setTabValue] = useState(0);
  console.log(vscode);

  const element = document.querySelector("body");

  const prefersDarkMode = element.classList.contains("vscode-dark");
  //const prefersDarkMode = useMediaQuery('(body.vscode-dark)');

  const preferredTheme = createMuiTheme({
    palette: {
      // Switching the dark mode on is a single property value change.
      type: prefersDarkMode ? 'dark' : 'light',
    },
  });

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

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <ThemeProvider theme={preferredTheme}>
    <GlobalContext.Provider value={{ globalState, dispatch }}>
      <div className={classes.root}>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Paper><AppHeader/></Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                aria-label="component tabs"
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab label="My Components" id="tab-0" aria-controls="tabpanel-0" />
                <Tab label="All Components" id="tab-1" aria-controls="tabpanel-1" />
              </Tabs>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <TabPanel value={tabValue} index={0}>
              <MyComponents embedded={true} />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Paper><MetadataType/></Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper>
                   {globalState.selectedMetadataType.id!=='' &&
                    <ComponentList selectedMetadataType={globalState.selectedMetadataType} isShowChildren={globalState.isShowChildren}/>
                    }
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
          </Grid>
          </Grid>
          </div>
    </GlobalContext.Provider>
    </ThemeProvider>
  );
}

export default App;
