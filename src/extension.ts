import * as path from 'path';
import * as vscode from 'vscode';
import * as child from 'child_process';

let clipboardy: any;
var fs = require("fs");
var xml2js = require('xml2js');
let DEFAULT_API_VERSION='';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('sfdxPackageGen.chooseMetadata',async () => {
			// Dynamically import clipboardy
			const module = await import('clipboardy');
        	clipboardy = module.default || module; // Handle both default and named exports
			//check whether clipboardy got imported correctly
			console.log(clipboardy);
			DEFAULT_API_VERSION=await getAPIVersion();
			console.log('DEFAULT_API_VERSION '+DEFAULT_API_VERSION);
			CodingPanel.createOrShow(context.extensionPath);
		})
	);


}

 function getAPIVersion():Promise<string>{
	console.log('getAPIVersion invoked');
	return new Promise((resolve,reject)=>{
		let sfdxCmd ="sf org display --json";
		let foo: child.ChildProcess = child.exec(sfdxCmd,{
			maxBuffer: 1024 * 1024 * 6,
			cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
		});
		let bufferOutData='';
		foo.stdout.on("data",(dataArg : any)=> {
			console.log('stdout: ' + dataArg);
			bufferOutData+=dataArg;
		});

		/*foo.stderr.on("data",(data : any)=> {
			console.log('stderr: ' + data);
			//vscode.window.showErrorMessage(data);
			resolve(undefined);
		});

		foo.stdin.on("data",(data : any)=> {
			console.log('stdin: ' + data);
			resolve(undefined);
		});*/

		foo.on("exit", (code: number, signal: string) => {
			console.log("exited with code "+code);
			console.log("bufferOutData "+bufferOutData);
			let data = JSON.parse(bufferOutData);
			let apiVersion = data.result.apiVersion;
			console.log('apiVersion '+apiVersion);
			resolve(apiVersion);
		});
	});
}
/**
 * Manages cat coding webview panels
 */
class CodingPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: CodingPanel | undefined;

	public static readonly viewType = 'Coding';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];
	private reportFolderMap={
		Dashboard : 'DashboardFolder',
		Document :'DocumentFolder',
		EmailTemplate :'EmailFolder',
		Report :'ReportFolder'
	};
	//Modified for #18
	//metadata types that accept * reg exp
	private regExpArr=['AccountRelationshipShareRule','ActionLinkGroupTemplate','ApexClass','ApexComponent',
'ApexPage','ApexTrigger','AppMenu','ApprovalProcess','ArticleType','AssignmentRules','Audience','AuthProvider',
'AuraDefinitionBundle','AutoResponseRules','Bot','BrandingSet','CallCenter','Certificate','CleanDataService',
'CMSConnectSource','Community','CommunityTemplateDefinition','CommunityThemeDefinition','CompactLayout',
'ConnectedApp','ContentAsset','CorsWhitelistOrigin','CustomApplication','CustomApplicationComponent',
'CustomFeedFilter','CustomHelpMenuSection','CustomMetadata','CustomLabels','CustomObjectTranslation',
'CustomPageWebLink','CustomPermission','CustomSite','CustomTab','DataCategoryGroup','DelegateGroup',
'DuplicateRule','EclairGeoData','EntitlementProcess','EntitlementTemplate','EventDelivery','EventSubscription',
'ExternalServiceRegistration','ExternalDataSource','FeatureParameterBoolean','FeatureParameterDate','FeatureParameterInteger',
'FieldSet','FlexiPage','Flow','FlowCategory','FlowDefinition','GlobalValueSet','GlobalValueSetTranslation','Group','HomePageComponent',
'HomePageLayout','InstalledPackage','KeywordList','Layout','LightningBolt','LightningComponentBundle','LightningExperienceTheme',
'LiveChatAgentConfig','LiveChatButton','LiveChatDeployment','LiveChatSensitiveDataRule','ManagedTopics','MatchingRules','MilestoneType',
'MlDomain','ModerationRule','NamedCredential','Network','NetworkBranding','PathAssistant','PermissionSet','PlatformCachePartition',
'Portal','PostTemplate','PresenceDeclineReason','PresenceUserConfig','Profile','ProfilePasswordPolicy','ProfileSessionSetting',
'Queue','QueueRoutingConfig','QuickAction','RecommendationStrategy','RecordActionDeployment','ReportType','Role','SamlSsoConfig',
'Scontrol','ServiceChannel','ServicePresenceStatus','SharingRules','SharingSet','SiteDotCom','Skill','StandardValueSetTranslation',
'StaticResource','SynonymDictionary','Territory','Territory2','Territory2Model','Territory2Rule','Territory2Type','TopicsForObjects',
'TransactionSecurityPolicy','Translations','WaveApplication','WaveDashboard','WaveDataflow','WaveDataset','WaveLens','WaveTemplateBundle',
'WaveXmd','Workflow',
'ActionPlanTemplate',
'AnimationRule',
'ChannelLayout',
'ApexTestSuite',
'AppointmentSchedulingPolicy',
'CampaignInfluenceModel',
'ChatterExtension',
'CspTrustedSite',
'CompactLayout',
'ExperienceBundle',
'LightningMessageChannel',
'MyDomainDiscoverableLogin',
'NavigationMenu',
'OauthCustomScope',
'PaymentGatewayProvider',
'PlatformEventChannel',
'PlatformEventChannelMember',
'Prompt',
'RedirectWhitelistUrl',
'Settings',
'TimeSheetTemplate',
'WaveRecipe',
'WorkSkillRouting'];

	private  PACKAGE_START='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+
														'<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';

	private  TYPES_START='<types>';	
	private  TYPES_END='</types>';			
	private  MEMBERS_START='<members>';	
	private  MEMBERS_END='</members>';
	private  NAME_START='<name>';	
	private  NAME_END='</name>';
	private  VERSION_START='<version>';	
	private  VERSION_END='</version>';
	private  PACKAGE_END='</Package>';
	private NEW_LINE ='\n';
	private  VERSION_NUM=DEFAULT_API_VERSION;
	private CHAR_TAB='\t';
	private LOADING='*loading..';
	private infoMsg='All metadata selected except ';

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (CodingPanel.currentPanel) {
			CodingPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			CodingPanel.viewType,
			'Choose Metadata Components',
			column || vscode.ViewColumn.One,
			{
				// Enable javascript in the webview
				enableScripts: true,
				retainContextWhenHidden: true,
				// And restrict the webview to only loading content from our extension's `media` directory.
				//localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]Commented for UI Changes
			}
		);
		//get the API version
		CodingPanel.currentPanel = new CodingPanel(panel, extensionPath);

	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		CodingPanel.currentPanel = new CodingPanel(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		/*this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);*/

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'fetchChildren':
						console.log('onDidReceiveMessage fetchChildren');
						let metadataType = message.metadataType;
						this.fetchChildren(metadataType);
						return;

					case 'buildPackageXML':
						console.log('onDidReceiveMessage buildPackageXML');
						this.buildPackageXML(message.selectedNodes,false);
						return;

					case 'getMetadataTypes':
						console.log('onDidReceiveMessage getMetadataTypes');
						this.getMetadataTypes({});
						return;
					
					case 'copyToClipboard':
							console.log('onDidReceiveMessage copyToClipboard');
							//clipboardy = await import('clipboardy');
							this.buildPackageXML(message.selectedNodes,true);
							return;

					case 'selectAll':
							console.log('onDidReceiveMessage selectAll');
							let selectedMetadata = message.selectedMetadata;
							let skippedMetadataTypes=message.skippedMetadataTypes;//Added for #18
							this.fetchAllChildren(selectedMetadata,skippedMetadataTypes,0);
							return;
					//Added for UI Changes - starts
					case 'INIT_LOAD_REQUEST':
						console.log('onDidReceiveMessage INIT_LOAD_REQUEST');
						this.handleInitLoadRequest();
						return;
					
					case 'FETCH_CHILDREN_REQUEST':
						console.log('onDidReceiveMessage FETCH_CHILDREN');
						this.fetchChildren(message.metadataType);
						return;

					case 'UPDATE_PACKAGE_XML':
						console.log('onDidReceiveMessage UPDATE_PACKAGE_XML');
						this.handleUpdatePackageXml(message.metadataTypes);
						return;
					
					case 'UPDATE_PACKAGE_XML_FROM_MY_COMPONENTS':
						console.log('onDidReceiveMessage UPDATE_PACKAGE_XML_FROM_MY_COMPONENTS');
						this.buildPackageFromMyComponents(message.components);
						return;
					
					case 'COPY_TO_CLIPBOARD':
						console.log('onDidReceiveMessage COPY_TO_CLIPBOARD');
						//clipboardy = await import('clipboardy');
						this.handleCopyToClipboard(message.metadataTypes);
						return;
					
					case 'OPEN_URL':
						console.log('onDidReceiveMessage OPEN_URL');
						this.openUrl(message.url);
						return;
					
					case 'FETCH_MY_COMPONENTS':
						console.log('onDidReceiveMessage FETCH_MY_COMPONENTS');
						this.fetchMyComponents();
						return;
					
					case 'BUILD_PACKAGE_FROM_MY_COMPONENTS':
						console.log('onDidReceiveMessage BUILD_PACKAGE_FROM_MY_COMPONENTS');
						this.buildPackageFromMyComponents(message.components);
						return;
					
					case 'COPY_MY_COMPONENTS_TO_CLIPBOARD':
						console.log('onDidReceiveMessage COPY_MY_COMPONENTS_TO_CLIPBOARD');
						this.copyMyComponentsToClipboard(message.components);
						return;
					//Added for Ui Changes - ends

				}
			},
			null,
			this._disposables
		);
	}

	private buildPackageXML(selectedNodes,isCopyToClipboard){
		console.log('Invoked buildPackageXML');
		if(!selectedNodes || selectedNodes.length==0){
			vscode.window.showErrorMessage("Please select components for package.xml");
			return;
		}

		let mpPackage=this.buildPackageMap(selectedNodes);
		this.generatePackageXML(mpPackage,isCopyToClipboard);

	}

	private buildPackageMap(selectedNodes){
		console.log('Invoked buildPackageMap');
		let mpPackage=new Map();

		for(let i=0;i<selectedNodes.length;i++){
		
			
			let node=selectedNodes[i];
			let parent=node.parent;

			//do not add loading child node to final map
			if(node.text==this.LOADING){
				continue;
			}
		

			if(parent=='#'){
				//parent node
			
				if(!mpPackage.has(node.text)){
				
					//new entry
					if(this.regExpArr.includes(node.text)){
					
						//accepts *
						mpPackage.set(node.text,['*']);
					
					}else{
					
						mpPackage.set(node.text,[]);
						
					}
				}else{
					if(this.regExpArr.includes(node.text)){
						
						//accepts *
						mpPackage.set(node.text,['*']);
					
					}
				}
			}else{
				//children
			
				if(!mpPackage.has(parent)){
				
					//metadata type not present
					mpPackage.set(parent,[node.text]);
					
				}else{
				
					let childArr=mpPackage.get(parent);
					if(!childArr.includes('*')){
					
						//add children only if parent metadata type does not accept *
						childArr.push(node.text);
						mpPackage.set(parent,childArr);
					

					}
				
				}
			
			}//else children end


		}//end for

		for (const [k, v] of mpPackage) {
			console.log(k, v);
		}
		return mpPackage;

	}

	private generatePackageXML(mpPackage,isCopyToClipboard){
		console.log('Invoked generatePackageXML');
		//for parent metadata types which have empty children, fetch the children and rebuild the map entries.
		if(!mpPackage || mpPackage.size ==0){
			console.log('Invoked generatePackageXML'+mpPackage);
			return mpPackage;
		}
		

		let xmlString='';
		xmlString+=this.PACKAGE_START;

		let mpKeys=[];
		
		for(let key of mpPackage.keys()){
			mpKeys.push(key);
		}

	//	mpKeys=mpKeys.sort();
		console.log(mpKeys);
		let mpSortedKeys=mpKeys.sort();
		console.log(mpSortedKeys);
	//	for (const [mType, components] of mpPackage) {
			for (let mType of mpKeys) {
				let components = mpPackage.get(mType);
				
			//remove metadata types with empty array values
			if(!components || components.length==0){
				continue;
			}

			components=components.sort();
				//console.log(components);

			xmlString+=this.CHAR_TAB+this.TYPES_START+this.NEW_LINE;
			
			for(const component of components){
				xmlString+=this.CHAR_TAB+this.CHAR_TAB+this.MEMBERS_START+component+this.MEMBERS_END+this.NEW_LINE;
			}

			xmlString+=this.CHAR_TAB+this.CHAR_TAB+this.NAME_START+mType+this.NAME_END+this.NEW_LINE;
			xmlString+=this.CHAR_TAB+this.TYPES_END+this.NEW_LINE;
		}

		xmlString+=this.CHAR_TAB+this.VERSION_START+this.VERSION_NUM+this.VERSION_END+this.NEW_LINE;
		xmlString+=this.PACKAGE_END;
		console.log(xmlString);

		if(isCopyToClipboard){
			console.log('Copy to Clipboard - Initiated');
			console.log(clipboardy);
			clipboardy.write(xmlString).then((result)=>{
				console.log(result);
			vscode.window.showInformationMessage("Contents Copied to Clipboard successfully!!");
		});

		}else{
			fs.writeFile(vscode.workspace.workspaceFolders[0].uri.fsPath+"/manifest/package.xml", xmlString, (err) => {
				if (err) {
					console.log(err);
					vscode.window.showErrorMessage(err);
				}
				console.log("Successfully Written to File.");
				vscode.workspace.openTextDocument(vscode.workspace.workspaceFolders[0].uri.fsPath+"/manifest/package.xml").then(data =>{
					console.log('Opened '+ data.fileName);
					vscode.window.showTextDocument(data);
				});
			});
		}
		

	}

	private fetchChildren(metadataType){
		console.log('Invoked fetchChildren');
		let mType=metadataType.id;
		//Modified for UI Changes - starts
		//let node = metadataType.original;
		let node = metadataType;
		//Modified for UI Changes - ends
		console.log('Invoked fetchChildren '+JSON.stringify(node) );

		if(!node.inFolder){

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Processing Metadata : "+mType,
				cancellable: true
			}, (progress, token) => {
				
				token.onCancellationRequested(() => {
					console.log("User canceled the long running operation");
				});
	
				
	
				var p = new Promise<void>(resolve => {
					let sfdxCmd ="sf org list metadata --api-version "+this.VERSION_NUM+" --json -m "+mType;
					let foo: child.ChildProcess = child.exec(sfdxCmd,{
						maxBuffer: 1024 * 1024 * 8,
						cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
					});

					let bufferOutData='';

				foo.stdout.on("data",(dataArg : any)=> {
					console.log('stdout: ' + dataArg);
					bufferOutData+=dataArg;
					
					/*let data = JSON.parse(dataArg);
					let depArr=[];
					let results = data.result;
					this._panel.webview.postMessage({ command: 'listmetadata', results : results , metadataType : mType});
					resolve();*/
				});
		
				foo.stderr.on("data",(data : any)=> {
					console.log('stderr: ' + data);
					//vscode.window.showErrorMessage(data);
					resolve(undefined);
				});
		
				foo.stdin.on("data",(data : any)=> {
					console.log('stdin: ' + data);
					//vscode.window.showErrorMessage(data);
					resolve(undefined);
				});
				
				foo.on('exit',(code,signal)=>{
					console.log('exit code '+code);
					console.log('bufferOutData '+bufferOutData);
					
					let data = JSON.parse(bufferOutData);
					let depArr=[];
					let results = data.result;
					
					// Fetch additional metadata details including LastModifiedBy
					this.enrichMetadataWithDetails(results, mType).then(enrichedResults => {
						this._panel.webview.postMessage({ command: 'listmetadata', results : enrichedResults , metadataType : mType});
						resolve();
					}).catch(err => {
						console.error('Error enriching metadata:', err);
						// Fall back to original results if enrichment fails
						this._panel.webview.postMessage({ command: 'listmetadata', results : results , metadataType : mType});
						resolve();
					});
				});
					
				});
	
				return p;
				
			});

			




		}else{
				//get the folder

		let folderType = this.reportFolderMap[mType];
		let sfdxCmd ="sf org list metadata --json --api-version "+this.VERSION_NUM+" -m "+folderType;

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Processing Metadata : "+folderType,
			cancellable: true
		}, (progress, token) => {
			token.onCancellationRequested(() => {
				console.log("User canceled the long running operation")
			});

			

			var p = new Promise(resolve => {
				let foo: child.ChildProcess = child.exec(sfdxCmd,{
					maxBuffer: 1024 * 1024 * 6,
					cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
					});
				
				let bufferOutData='';

				foo.stdout.on("data",(dataArg : any)=> {
					console.log('stdout: ' + dataArg);
					bufferOutData+=dataArg;

					/*let data = JSON.parse(dataArg);
					let folderNames=[];
					let results = data.result;
					
					if(!results || results.length==0){
						//no folders
						this._panel.webview.postMessage({ command: 'listmetadata', results : results , metadataType : mType});
						return;
					}else if(!Array.isArray(results)){
						//1 folder
						folderNames.push(results.fullName);
					}else{
						//many folders
						for(let i=0;i<results.length;i++){
							folderNames.push(results[i].fullName);
						}
					}
		
				//get the components inside each folder
				this.getComponentsInsideFolders(folderNames,mType,0,[]);
				resolve();*/
		
				});
		
				foo.stderr.on("data",(data : any)=> {
					console.log('stderr: ' + data);
					//vscode.window.showErrorMessage(data);
					resolve(undefined);
				});
		
				foo.stdin.on("data",(data : any)=> {
					console.log('stdin: ' + data);
					resolve(undefined);
				});
				
				foo.on('exit',(code,signal)=>{
					console.log('exit code '+code);
					console.log('bufferOutData '+bufferOutData);
					
					let data = JSON.parse(bufferOutData);
					let folderNames=[];
					let results = data.result;
					
					if(!results || results.length==0){
						//no folders
						this._panel.webview.postMessage({ command: 'listmetadata', results : results , metadataType : mType});
						return;
					}else if(!Array.isArray(results)){
						//1 folder
						folderNames.push(results.fullName);
					}else{
						//many folders
						for(let i=0;i<results.length;i++){
							folderNames.push(results[i].fullName);
						}
					}
		
				//get the components inside each folder
				this.getComponentsInsideFolders(folderNames,mType,0,[]);
				resolve(undefined);

				});
				
			});

			return p;
			
		});

		}

	}

	private enrichMetadataWithDetails(results: any, metadataType: string): Promise<any> {
		console.log('Invoked enrichMetadataWithDetails');
		
		// Map metadata types to their corresponding Salesforce object names
		const metadataTypeToObject: {[key: string]: string} = {
			'ApexClass': 'ApexClass',
			'ApexComponent': 'ApexComponent',
			'ApexPage': 'ApexPage',
			'ApexTrigger': 'ApexTrigger',
			'CustomObject': 'CustomObject',
			'Flow': 'Flow',
			'Layout': 'Layout',
			'Profile': 'Profile',
			'PermissionSet': 'PermissionSet',
			'CustomField': 'CustomField',
			'ValidationRule': 'ValidationRule',
			'WorkflowRule': 'WorkflowRule',
			'LightningComponentBundle': 'LightningComponentResource'
		};

		const objectName = metadataTypeToObject[metadataType];
		
		// If we don't have a mapping or no results, return original results
		if (!objectName || !results || results.length === 0) {
			return Promise.resolve(results);
		}

		return new Promise((resolve, reject) => {
			// Build array of fullNames for SOQL query
			let fullNames: string[] = [];
			if (!Array.isArray(results)) {
				fullNames = [results.fullName];
			} else {
				fullNames = results.map((r: any) => r.fullName);
			}

			// Limit to first 100 to avoid query limits
			if (fullNames.length > 100) {
				console.log('Too many records, limiting to first 100');
				fullNames = fullNames.slice(0, 100);
			}

			// Build SOQL query with proper escaping
			const namesForQuery = fullNames.map(name => `'${name.replace(/'/g, "\\'")}'`).join(',');
			const soqlQuery = `SELECT Name, LastModifiedById, LastModifiedBy.Name, LastModifiedDate FROM ${objectName} WHERE Name IN (${namesForQuery})`;
			
			console.log('Executing SOQL query: ' + soqlQuery);

			const sfdxCmd = `sf data query --query "${soqlQuery.replace(/"/g, '\\"')}" --json`;
			
			let foo: child.ChildProcess = child.exec(sfdxCmd, {
				maxBuffer: 1024 * 1024 * 8,
				cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
			});

			let bufferOutData = '';

			foo.stdout.on("data", (dataArg: any) => {
				console.log('stdout enrichMetadata: ' + dataArg);
				bufferOutData += dataArg;
			});

			foo.stderr.on("data", (data: any) => {
				console.log('stderr enrichMetadata: ' + data);
			});

			foo.on('exit', (code, signal) => {
				console.log('enrichMetadata exit code ' + code);
				
				if (code !== 0 || !bufferOutData) {
					// If query fails, return original results
					console.log('SOQL query failed, returning original results');
					resolve(results);
					return;
				}

				try {
					const queryData = JSON.parse(bufferOutData);
					console.log('Query result:', queryData);

					if (queryData.status !== 0 || !queryData.result || !queryData.result.records) {
						resolve(results);
						return;
					}

					// Create a map of metadata details by name
					const detailsMap: {[key: string]: any} = {};
					queryData.result.records.forEach((record: any) => {
						detailsMap[record.Name] = {
							lastModifiedById: record.LastModifiedById,
							lastModifiedByName: record.LastModifiedBy ? record.LastModifiedBy.Name : 'Unknown',
							lastModifiedDate: record.LastModifiedDate
						};
					});

					// Enrich the results with the additional details
					let enrichedResults;
					if (!Array.isArray(results)) {
						const details = detailsMap[results.fullName] || { lastModifiedById: null, lastModifiedByName: 'Unknown', lastModifiedDate: null };
						enrichedResults = {
							...results,
							...details
						};
					} else {
						enrichedResults = results.map((r: any) => {
							const details = detailsMap[r.fullName] || { lastModifiedById: null, lastModifiedByName: 'Unknown', lastModifiedDate: null };
							return {
								...r,
								...details
							};
						});
					}

					resolve(enrichedResults);
				} catch (err) {
					console.error('Error parsing query results:', err);
					resolve(results);
				}
			});
		});
	}

	public fetchAllChildren(selectedMetadata,skippedMetadataTypes,index){
		
			console.log('Invoked fetchAllChildren');
			if(!selectedMetadata || selectedMetadata.length==0){
				return;
			}

			if(index==selectedMetadata.length){//end condition
				let mpKeys=[];
				for(let key in this.reportFolderMap){
					mpKeys.push(key);
				}
				vscode.window.showInformationMessage(this.infoMsg+skippedMetadataTypes.join());//Modified for #18
				return;

			}
			

			let mType=selectedMetadata[index];
			
	
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Processing Metadata : "+mType,
				cancellable: true
			}, (progress, token) => {
				
				token.onCancellationRequested(() => {
					console.log("User canceled the long running operation");
				});
	
				
	
				var p = new Promise(resolve => {
					let sfdxCmd ="sf org list metadata --json --api-version "+this.VERSION_NUM+" -m "+mType;
					let foo: child.ChildProcess = child.exec(sfdxCmd,{
						maxBuffer: 1024 * 1024 * 6,
						cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
					});

					let bufferOutData='';

				foo.stdout.on("data",(dataArg : any)=> {
					console.log('stdout: ' + dataArg);
					bufferOutData+=dataArg;
					
					/*let data = JSON.parse(dataArg);
					let depArr=[];
					let results = data.result;
					this._panel.webview.postMessage({ command: 'listmetadata', results : results , metadataType : mType});
					resolve();*/
				});
		
				foo.stderr.on("data",(data : any)=> {
					console.log('stderr: ' + data);
					//vscode.window.showErrorMessage(data);
					resolve(undefined);
				});
		
				foo.stdin.on("data",(data : any)=> {
					console.log('stdin: ' + data);
					//vscode.window.showErrorMessage(data);
					resolve(undefined);
				});
				
				foo.on('exit',(code,signal)=>{
					console.log('exit code '+code);
					console.log('bufferOutData '+bufferOutData);
					
					let data = JSON.parse(bufferOutData);
					let depArr=[];
					let results = data.result;
					this._panel.webview.postMessage({ command: 'listmetadata', results : results , metadataType : mType});
					resolve(undefined);
					this.fetchAllChildren(selectedMetadata,skippedMetadataTypes,++index);//recurse through other metadata
				});
					
				});
	
				return p;
				
			});

	}
	public getComponentsInsideFolders(folderNames,mType,index,resultsArr){
		 		if(index==folderNames.length){
					this._panel.webview.postMessage({ command: 'listmetadata', results : resultsArr , metadataType : mType});
					return;
				}


				vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: "Processing Metadata : "+mType+":"+folderNames[index],
					cancellable: true
				}, (progress, token) => {
					token.onCancellationRequested(() => {
						console.log("User canceled the long running operation")
					});
		
					
		
					var p = new Promise(resolve => {
						let sfdxCmd ="sf org list metadata --json --api-version "+this.VERSION_NUM+" -m "+mType+" --folder "+folderNames[index];
						let foo: child.ChildProcess = child.exec(sfdxCmd,{
							maxBuffer: 1024 * 1024 * 6,
							cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
						});

						let bufferOutData='';

						foo.stdout.on("data",(dataArg : any)=> {
							console.log('stdout: ' + dataArg);
							bufferOutData+=dataArg;

							/*let data = JSON.parse(dataArg);
							let depArr=[];
							let results = data.result;
			
							if(results){
								if(!Array.isArray(results)){
									//1 folder
									resultsArr.push(results);
								}else{
									//many folders
									for(let i=0;i<results.length;i++){
										resultsArr.push(results[i]);
									}
								}
						}
							
							resolve();
							console.log('After resolve getComponentsInsideFolders');
							this.getComponentsInsideFolders(folderNames,mType,++index,resultsArr);*/
						
			
						});
				
						foo.stderr.on("data",(data : any)=> {
							console.log('stderr: ' + data);
							//vscode.window.showErrorMessage(data);
							resolve(undefined);
						});
				
						foo.stdin.on("data",(data : any)=> {
							console.log('stdin: ' + data);
							resolve(undefined);
						});
						
						foo.on('exit',(code,signal)=>{
							console.log('exit code '+code);
							console.log('bufferOutData '+bufferOutData);

							let data = JSON.parse(bufferOutData);
							let depArr=[];
							let results = data.result;
			
							if(results){
								if(!Array.isArray(results)){
									//1 folder
									resultsArr.push(results);
								}else{
									//many folders
									for(let i=0;i<results.length;i++){
										resultsArr.push(results[i]);
									}
								}
						}
							
							resolve(undefined);
							console.log('After resolve getComponentsInsideFolders');
							this.getComponentsInsideFolders(folderNames,mType,++index,resultsArr);


						});
						
					});
		
					return p;
					
				});

		
	}


	public dispose() {
		CodingPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {

		this._panel.title = 'Choose Metadata Components';
		this._panel.webview.html = this._getHtmlForWebview();

		//Commented for UI Changes - starts
		/*this.readExistingPackageXML().then(mpExistingPackageXML=>{
			this.getMetadataTypes(mpExistingPackageXML);
		}).catch(err=>{
			console.log(err);
		});*/
		//Commented for Ui Changes - ends
	

	}

	//Added for UI Changes - starts
	private handleInitLoadRequest(){
		this.readExistingPackageXML().then(mpExistingPackageXML=>{
			this.getMetadataTypes(mpExistingPackageXML);
		}).catch(err=>{
			console.log(err);
		});
	}

	private handleUpdatePackageXml(metadataTypes){
		const mpPackage =this.buildSelectedMetadataMap(metadataTypes);
		if(mpPackage.size==0){
			vscode.window.showErrorMessage("Please select components for package.xml");
			return;
		}
		this.generatePackageXML(mpPackage,false);
	}

	private handleCopyToClipboard(metadataTypes){
		const mpPackage =this.buildSelectedMetadataMap(metadataTypes);
		if(mpPackage.size==0){
			vscode.window.showErrorMessage("Please select components for package.xml");
			return;
		}
		this.generatePackageXML(mpPackage,true);
	}

	private openUrl(url){
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
	}

	private fetchMyComponents() {
		console.log('Invoked fetchMyComponents');
		
		// Get current user ID
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Fetching your components...",
			cancellable: true
		}, (progress, token) => {
			token.onCancellationRequested(() => {
				console.log("User canceled the operation");
			});

			return new Promise<void>(resolve => {
				// Get the current user's ID using sf org display user
				let userCmd = `sf org display user --json`;
				
				console.log('=== DEBUGGING fetchMyComponents ===');
				console.log('Executing command:', userCmd);
				console.log('Working directory:', vscode.workspace.workspaceFolders[0].uri.fsPath);
				
				let userExec: child.ChildProcess = child.exec(userCmd, {
					maxBuffer: 1024 * 1024 * 8,
					cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
				});

				let userBuffer = '';
				let errorBuffer = '';

				userExec.stdout.on("data", (dataArg: any) => {
					console.log('stdout received:', dataArg);
					userBuffer += dataArg;
				});

				userExec.stderr.on("data", (dataArg: any) => {
					console.log('stderr received:', dataArg);
					errorBuffer += dataArg;
				});

				userExec.on('exit', (code, signal) => {
					console.log('=== EXIT EVENT ===');
					console.log('Exit code:', code);
					console.log('Signal:', signal);
					console.log('stdout buffer length:', userBuffer.length);
					console.log('stderr buffer:', errorBuffer);
					console.log('Full stdout buffer:', userBuffer);
					
					if (code !== 0) {
						console.error('Command failed with exit code:', code);
						vscode.window.showErrorMessage(`Failed to retrieve user info. Exit code: ${code}. Error: ${errorBuffer}`);
						this._panel.webview.postMessage({ 
							command: 'myComponentsResponse', 
							components: [] 
						});
						resolve();
						return;
					}
					
					if (!userBuffer) {
						console.error('No data received from command');
						vscode.window.showErrorMessage('No data returned from user query');
						this._panel.webview.postMessage({ 
							command: 'myComponentsResponse', 
							components: [] 
						});
						resolve();
						return;
					}

					try {
						const userData = JSON.parse(userBuffer);
						console.log('=== PARSED USER DATA ===');
						console.log('Full userData object:', JSON.stringify(userData, null, 2));
						console.log('userData.status:', userData.status);
						console.log('userData.result:', userData.result);
						
						// sf org display user returns result with id, username, etc directly
						if (userData.status === 0 && userData.result && userData.result.id) {
							const userId = userData.result.id;
							const userName = userData.result.name || 'Unknown';
							const username = userData.result.username;
							
							console.log('=== USER INFO EXTRACTED ===');
							console.log('User ID:', userId);
							console.log('User Name:', userName);
							console.log('Username:', username);
							
							vscode.window.showInformationMessage(`Found user: ${userName} (${username}), ID: ${userId}`);
							
							if (userId) {
								this.fetchMyComponentsWithQuery(userId);
							} else {
								console.error('userId is null or undefined');
								vscode.window.showErrorMessage('Could not determine current user ID (userId is empty)');
								this._panel.webview.postMessage({ 
									command: 'myComponentsResponse', 
									components: [] 
								});
							}
						} else {
							console.error('=== VALIDATION FAILED ===');
							console.error('userData.status === 0?', userData.status === 0);
							console.error('userData.result exists?', !!userData.result);
							console.error('userData.result.id exists?', !!(userData.result && userData.result.id));
							
							vscode.window.showErrorMessage('No user information returned. Check VS Code Developer Tools console for details.');
							this._panel.webview.postMessage({ 
								command: 'myComponentsResponse', 
								components: [] 
							});
						}
						resolve();
					} catch (err) {
						console.error('=== JSON PARSE ERROR ===');
						console.error('Error:', err);
						console.error('Buffer content:', userBuffer);
						vscode.window.showErrorMessage('Error parsing user information: ' + err + '. Check console for details.');
						this._panel.webview.postMessage({ 
							command: 'myComponentsResponse', 
							components: [] 
						});
						resolve();
					}
				});
			});
		});
	}

	private fetchMyComponentsWithQuery(userId: string) {
		console.log('Fetching components for user ID:', userId);
		
		// All metadata types to retrieve - use same approach as All Components
		const metadataTypes = [
			'ApexClass', 
			'ApexTrigger', 
			'ApexPage', 
			'ApexComponent',
			'LightningComponentBundle',
			'Flow',
			'CustomObject',
			'Layout',
			'CustomTab',
			'CustomApplication',
			'Queue',
			'Group',
			'EmailTemplate',
			'StaticResource',
			'CustomLabel',
			'ExternalDataSource',
			'NamedCredential',
			'RemoteSiteSetting',
			'ContentAsset',
			'AuraDefinitionBundle',
			'CustomMetadata',
			'Report',
			'Dashboard',
			'PermissionSet',
			'Profile'
		];
		
		const allComponents: any[] = [];
		let completedQueries = 0;
		const totalQueries = metadataTypes.length + 3; // +3 for CustomField, ValidationRule, WorkflowRule

		const sendResponse = () => {
			console.log(`Total components found: ${allComponents.length}`);
			this._panel.webview.postMessage({ 
				command: 'myComponentsResponse', 
				components: allComponents 
			});
			
			if (allComponents.length === 0) {
				vscode.window.showInformationMessage('No components found that were last modified by you.');
			}
		};

		// Process each metadata type using sf org list metadata (like All Components)
		metadataTypes.forEach(metadataType => {
			const listCmd = `sf org list metadata --api-version ${this.VERSION_NUM} --json -m ${metadataType}`;
			console.log(`Listing ${metadataType} metadata`);
			
			let listProc: child.ChildProcess = child.exec(listCmd, {
				maxBuffer: 1024 * 1024 * 8,
				cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
			});

			let listBuffer = '';

			listProc.stdout.on("data", (dataArg: any) => {
				listBuffer += dataArg;
			});

			listProc.stderr.on("data", (data: any) => {
				console.log(`stderr for ${metadataType} list: ` + data);
			});

			listProc.on('exit', (code) => {
				if (code === 0 && listBuffer) {
					try {
						const listData = JSON.parse(listBuffer);
						if (listData.status === 0 && listData.result) {
							// Enrich with details and filter by user
							this.enrichMetadataWithDetails(listData.result, metadataType).then(enrichedResults => {
								// Filter by userId - only keep components modified by the current user
								const filteredResults = Array.isArray(enrichedResults) 
									? enrichedResults.filter((r: any) => r.lastModifiedById === userId)
									: (enrichedResults.lastModifiedById === userId ? [enrichedResults] : []);
								
								// Add to components with proper structure
								filteredResults.forEach((result: any) => {
									allComponents.push({
										id: `${metadataType}.${result.fullName}`,
										metadataType: metadataType,
										componentName: result.fullName,
										lastModifiedByName: result.lastModifiedByName || 'Unknown',
										lastModifiedDate: result.lastModifiedDate || result.lastModifiedDate
									});
								});
								
								console.log(`Found ${filteredResults.length} ${metadataType} components for user`);
								completedQueries++;
								if (completedQueries === totalQueries) {
									sendResponse();
								}
							}).catch(err => {
								console.error(`Error enriching ${metadataType}:`, err);
								completedQueries++;
								if (completedQueries === totalQueries) {
									sendResponse();
								}
							});
						} else {
							completedQueries++;
							if (completedQueries === totalQueries) {
								sendResponse();
							}
						}
					} catch (err) {
						console.error(`Error parsing ${metadataType} list:`, err);
						completedQueries++;
						if (completedQueries === totalQueries) {
							sendResponse();
						}
					}
				} else {
					completedQueries++;
					if (completedQueries === totalQueries) {
						sendResponse();
					}
				}
			});
		});

		// Special handling for CustomField (query from Tooling API)
		// Query includes NamespacePrefix and ManageableState to determine if it's custom or standard
		const customFieldQuery = `SELECT DeveloperName, NamespacePrefix, ManageableState, TableEnumOrId, EntityDefinition.QualifiedApiName, LastModifiedById, LastModifiedBy.Name, LastModifiedDate FROM CustomField WHERE LastModifiedById = '${userId}' ORDER BY LastModifiedDate DESC`;
		const customFieldCmd = `sf data query --query "${customFieldQuery.replace(/"/g, '\\"')}" --use-tooling-api --json`;
		
		console.log('Querying CustomField via Tooling API');
		
		let customFieldProc: child.ChildProcess = child.exec(customFieldCmd, {
			maxBuffer: 1024 * 1024 * 8,
			cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
		});

		let customFieldBuffer = '';

		customFieldProc.stdout.on("data", (dataArg: any) => {
			customFieldBuffer += dataArg;
		});

		customFieldProc.stderr.on("data", (data: any) => {
			console.log(`stderr for CustomField: ` + data);
		});

		customFieldProc.on('exit', (code) => {
			completedQueries++;
			if (code === 0 && customFieldBuffer) {
				try {
					const queryData = JSON.parse(customFieldBuffer);
					if (queryData.status === 0 && queryData.result && queryData.result.records) {
						queryData.result.records.forEach((record: any) => {
							const lastModifiedByName = record.LastModifiedBy ? record.LastModifiedBy.Name : 'Unknown';
							// Use EntityDefinition.QualifiedApiName for the object API name, fallback to TableEnumOrId if not available
							const objectName = (record.EntityDefinition && record.EntityDefinition.QualifiedApiName) ? record.EntityDefinition.QualifiedApiName : record.TableEnumOrId || 'Unknown';
							
							// Build the field API name
							let fieldName = record.DeveloperName || 'Unknown';
							
							// Add namespace prefix if exists
							if (record.NamespacePrefix) {
								fieldName = `${record.NamespacePrefix}__${fieldName}`;
							}
							
							// Add __c suffix if it's a custom field (ManageableState exists or no standard indicator)
							// Standard fields typically don't have ManageableState or it's null
							if (record.ManageableState || !fieldName.includes('__')) {
								fieldName = `${fieldName}__c`;
							}
							
							allComponents.push({
								id: `CustomField.${objectName}.${fieldName}`,
								metadataType: 'CustomField',
								componentName: `${objectName}.${fieldName}`,
								lastModifiedByName: lastModifiedByName,
								lastModifiedDate: record.LastModifiedDate
							});
						});
						console.log(`Found ${queryData.result.records.length} CustomField components`);
					}
				} catch (err) {
					console.error('Error parsing CustomField query:', err);
				}
			}
			if (completedQueries === totalQueries) {
				sendResponse();
			}
		});

		// Special handling for ValidationRule (query from Tooling API)
		const validationRuleQuery = `SELECT ValidationName, EntityDefinition.QualifiedApiName, LastModifiedById, LastModifiedBy.Name, LastModifiedDate FROM ValidationRule WHERE LastModifiedById = '${userId}' ORDER BY LastModifiedDate DESC`;
		const validationRuleCmd = `sf data query --query "${validationRuleQuery.replace(/"/g, '\\"')}" --use-tooling-api --json`;
		
		console.log('Querying ValidationRule via Tooling API');
		
		let validationRuleProc: child.ChildProcess = child.exec(validationRuleCmd, {
			maxBuffer: 1024 * 1024 * 8,
			cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
		});

		let validationRuleBuffer = '';

		validationRuleProc.stdout.on("data", (dataArg: any) => {
			validationRuleBuffer += dataArg;
		});

		validationRuleProc.stderr.on("data", (data: any) => {
			console.log(`stderr for ValidationRule: ` + data);
		});

		validationRuleProc.on('exit', (code) => {
			completedQueries++;
			if (code === 0 && validationRuleBuffer) {
				try {
					const queryData = JSON.parse(validationRuleBuffer);
					if (queryData.status === 0 && queryData.result && queryData.result.records) {
						queryData.result.records.forEach((record: any) => {
							const lastModifiedByName = record.LastModifiedBy ? record.LastModifiedBy.Name : 'Unknown';
							const objectName = record.EntityDefinition ? record.EntityDefinition.QualifiedApiName : 'Unknown';
							allComponents.push({
								id: `ValidationRule.${objectName}.${record.ValidationName}`,
								metadataType: 'ValidationRule',
								componentName: `${objectName}.${record.ValidationName}`,
								lastModifiedByName: lastModifiedByName,
								lastModifiedDate: record.LastModifiedDate
							});
						});
						console.log(`Found ${queryData.result.records.length} ValidationRule components`);
					}
				} catch (err) {
					console.error('Error parsing ValidationRule query:', err);
				}
			}
			if (completedQueries === totalQueries) {
				sendResponse();
			}
		});

		// Special handling for WorkflowRule (query from Tooling API)
		const workflowRuleQuery = `SELECT Name, TableEnumOrId, LastModifiedById, LastModifiedBy.Name, LastModifiedDate FROM WorkflowRule WHERE LastModifiedById = '${userId}' ORDER BY LastModifiedDate DESC`;
		const workflowRuleCmd = `sf data query --query "${workflowRuleQuery.replace(/"/g, '\\"')}" --use-tooling-api --json`;
		
		console.log('Querying WorkflowRule via Tooling API');
		
		let workflowRuleProc: child.ChildProcess = child.exec(workflowRuleCmd, {
			maxBuffer: 1024 * 1024 * 8,
			cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
		});

		let workflowRuleBuffer = '';

		workflowRuleProc.stdout.on("data", (dataArg: any) => {
			workflowRuleBuffer += dataArg;
		});

		workflowRuleProc.stderr.on("data", (data: any) => {
			console.log(`stderr for WorkflowRule: ` + data);
		});

		workflowRuleProc.on('exit', (code) => {
			completedQueries++;
			if (code === 0 && workflowRuleBuffer) {
				try {
					const queryData = JSON.parse(workflowRuleBuffer);
					if (queryData.status === 0 && queryData.result && queryData.result.records) {
						queryData.result.records.forEach((record: any) => {
							const lastModifiedByName = record.LastModifiedBy ? record.LastModifiedBy.Name : 'Unknown';
							allComponents.push({
								id: `WorkflowRule.${record.Name}`,
								metadataType: 'WorkflowRule',
								componentName: record.Name,
								lastModifiedByName: lastModifiedByName,
								lastModifiedDate: record.LastModifiedDate
							});
						});
						console.log(`Found ${queryData.result.records.length} WorkflowRule components`);
					}
				} catch (err) {
					console.error('Error parsing WorkflowRule query:', err);
				}
			}
			if (completedQueries === totalQueries) {
				sendResponse();
			}
		});
	}

	private buildPackageFromMyComponents(components: any[]) {
		console.log('Building package.xml from my components');
		
		// Group components by metadata type
		const mpPackage = new Map<string, string[]>();
		
		components.forEach(comp => {
			const metadataType = comp.metadataType;
			const componentName = comp.componentName;
			
			if (!mpPackage.has(metadataType)) {
				mpPackage.set(metadataType, []);
			}
			
			const members = mpPackage.get(metadataType);
			if (members && !members.includes(componentName)) {
				members.push(componentName);
			}
		});
		
		this.generatePackageXML(mpPackage, false);
	}

	private copyMyComponentsToClipboard(components: any[]) {
		console.log('Copying my components to clipboard');
		
		// Group components by metadata type
		const mpPackage = new Map<string, string[]>();
		
		components.forEach(comp => {
			const metadataType = comp.metadataType;
			const componentName = comp.componentName;
			
			if (!mpPackage.has(metadataType)) {
				mpPackage.set(metadataType, []);
			}
			
			const members = mpPackage.get(metadataType);
			if (members && !members.includes(componentName)) {
				members.push(componentName);
			}
		});
		
		this.generatePackageXML(mpPackage, true);
	}

	private buildSelectedMetadataMap(metadataTypes){
		const mpPackage = new Map();

		if(!metadataTypes || metadataTypes.length==0){
			return mpPackage;
		}

		metadataTypes.forEach(metadataType => {
			if(metadataType.isSelected){
				//Add to Map
				if(this.regExpArr.includes(metadataType.id)){				
					//accepts *
					mpPackage.set(metadataType.id,['*']);
				}else{
					const childrenArr=metadataType.children.map(child=>child.text);
					mpPackage.set(metadataType.id,childrenArr);
				}
			}else if (metadataType.isIndeterminate){
				const childrenArr=[];
				metadataType.children.forEach(child=>{
					if(child.isSelected){
						childrenArr.push(child.text);
					}
				});
				mpPackage.set(metadataType.id,childrenArr);
			}
		});

		return mpPackage;
	}
	//Added for UI Changes - ends

private readExistingPackageXML(){
	console.log('Read existing packge.xml');
	let mpExistingPackageXML={};
	let parser = new xml2js.Parser();
	
	return new Promise((resolve,reject)=>{
		fs.readFile(vscode.workspace.workspaceFolders[0].uri.fsPath+"/manifest/package.xml", function(err, data) {
			if(err){
				console.error(err);
				resolve(mpExistingPackageXML);
			}
				parser.parseString(data, function (err, result) {
					if(err){
						console.error(err);
						resolve(mpExistingPackageXML);
						//return;
					}
					console.log('Existing package.xml');	
					console.log(JSON.stringify(result));
					///mpExistingPackageXML=this.putExistingPackageXMLInMap(result);
					if(!result || !result.Package || !result.Package.types){
						resolve(mpExistingPackageXML);
					}
				
					let types=result.Package.types;
					for(let i=0;i<types.length;i++){
						let type=types[i];
				
						let name=type.name[0];
						let members=type.members;

						//Commented for UI Changes - starts
						//for setting undetermined state
						/*if(members && !members.includes("*")){
							members.push("*loading..");
						}*/
						//Commented for UI Changes - ends
						mpExistingPackageXML[name]=members;
				
					}
					
						console.log(mpExistingPackageXML);
				
					resolve(mpExistingPackageXML);
				});
		});

	});

		


}	

private getMetadataTypes(mpExistingPackageXML){
	console.log("getMetadataTypes invoked");
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "Processing Metadata",
		cancellable: true
	}, (progress, token) => {
		token.onCancellationRequested(() => {
			console.log("User canceled the long running operation")
		});

		console.log("vscode.workspace.workspaceFolders[0].uri.fsPath "+vscode.workspace.workspaceFolders[0].uri.fsPath);

		var p = new Promise(resolve => {
			var foo: child.ChildProcess = child.exec('sf org list metadata-types --api-version '+this.VERSION_NUM+' --json',{
				maxBuffer: 1024 * 1024 * 6,
				cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
			});
			let bufferOutData='';
			foo.stdout.on("data",(dataArg : any)=> {
				
				console.log('dataArg '+dataArg);
				bufferOutData+=dataArg;
				/*let data = JSON.parse(dataArg);
				let depArr=[];
				let metadataObjectsArr = data.result.metadataObjects;
	
				for(let index=0;index<metadataObjectsArr.length;index++){
					let obj=metadataObjectsArr[index];
					console.log(obj.xmlName);
					depArr.push(obj.xmlName);
				}
				this._panel.webview.postMessage({ command: 'metadataObjects', metadataObjects: metadataObjectsArr});
				resolve();*/
			});
	
			foo.stderr.on("data",(data : any)=> {
				console.log('stderr: ' + data);
				//vscode.window.showErrorMessage(data);
				resolve(undefined);
			});
	
			foo.stdin.on("data",(data : any)=> {
				console.log('stdin: ' + data);
				resolve(undefined);
			});

			foo.on("exit", (code: number, signal: string) => {
				console.log("exited with code "+code);
				console.log("bufferOutData "+bufferOutData);
				resolve(undefined);
				let data = JSON.parse(bufferOutData);
				let depArr=[];
				let metadataObjectsArr = data.result.metadataObjects;
	
				for(let index=0;index<metadataObjectsArr.length;index++){
					let obj=metadataObjectsArr[index];
					console.log(obj.xmlName);
					depArr.push(obj.xmlName);
				}
				this._panel.webview.postMessage({ command: 'metadataObjects', metadataObjects: metadataObjectsArr,
																					'mpExistingPackageXML' :mpExistingPackageXML});
			
			});
			console.log(typeof foo.on); 
				
			
		});

		return p;
		
	});
}
	private _getHtmlForWebview() {

		//Added for UI Changes - starts
		const manifest = require(path.join(this._extensionPath,'client', 'build', 'asset-manifest.json'));
		const entrypoints=manifest['entrypoints'];
		const scriptEntryPoints=[];
		const styleEntryPoints=[];

		entrypoints.forEach(entrypoint => {
			if(entrypoint.endsWith('.js')){
				scriptEntryPoints.push(entrypoint);
			}else{
				styleEntryPoints.push(entrypoint);
			}
		});


		const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath,'client', 'build', scriptEntryPoints[0]));
		//const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
		const scriptUri = this._panel.webview.asWebviewUri(scriptPathOnDisk);

		const runtimeScriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath,'client', 'build', scriptEntryPoints[1]));
		//const runtimeScriptUri = runtimeScriptPathOnDisk.with({ scheme: 'vscode-resource' });
		const runtimeScriptUri = this._panel.webview.asWebviewUri(runtimeScriptPathOnDisk);

		const staticScriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath,'client', 'build', scriptEntryPoints[2]));
		//const staticScriptUri = staticScriptPathOnDisk.with({ scheme: 'vscode-resource' });
		const staticScriptUri = this._panel.webview.asWebviewUri(staticScriptPathOnDisk);

		const stylePathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'client','build', styleEntryPoints[0]));
		//const styleUri = stylePathOnDisk.with({ scheme: 'vscode-resource' });
		const styleUri = this._panel.webview.asWebviewUri(stylePathOnDisk);
		console.log(`scriptUri ${scriptUri}`);
		console.log(`styleUri ${styleUri}`);
		//Added for UI Changes - ends
		//Commented for UI Changes - starts
		/*
		// Local path to main script run in the webview
		const scriptPathOnDisk = vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'main.js')
		);

		// And the uri we use to load this script in the webview
		const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
		*/	
		//Commented for UI Changes - ends
		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		 // Base CSP directive
		 const cspSource = this._panel.webview.cspSource;

		 // Define the allowed resources path
		 const resourcePathUri = this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionPath, '')));

		return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">

                <!--
                Use a content security policy to only allow loading images from https or from our extension directory,
                and only allow scripts that have a specific nonce.
                -->
                <!--<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}';">-->
				<!--Commented for UI Changes -->
				<!--
				<meta
				http-equiv="Content-Security-Policy"
				content="default-src 'none'; img-src 'vscode-resource:' https:; script-src 'vscode-resource:' https:; style-src 'vscode-resource:' https:;"
			  	/>
			   	-->
			 	<!-- Added for UI Changes--> 
			  	<meta http-equiv="Content-Security-Policy" content="default-src; 
			  connect-src vscode-resource: https: ${cspSource};
			  img-src vscode-resource: https: ${cspSource} ${resourcePathUri}; style-src 'unsafe-inline' vscode-resource: https: ${cspSource}; 
			  script-src 'self' 'unsafe-inline' 'unsafe-eval' vscode-resource: https: ${cspSource}">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/themes/default/style.min.css" />
				
				<title>Add Components</title>
				<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
    			<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
				<link rel="stylesheet" type="text/css" href="${styleUri}"><!--Added for Ui Changes -->
            	</head>
						<body>
					<!-- Commented for UI Changes - starts -->
					<!--	<table border="0" width="100%">
						<tr>
						<td><h3>Choose Metadata Components for Package.xml</h3></td>
						<td>
						<button id="buildBtn">Update Package.xml</button>&nbsp;
						<button id="copyBtn">Copy to Clipboard</button>&nbsp;
						<button id="selectAllBtn">Select All</button>&nbsp;
						<button id="clearAllBtn">Clear All</button>
						</td>
						</tr>
						</table>
						<hr>
				<div id="jstree">
				
			  </div> 

			  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js"></script>
			  <script src="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/jstree.min.js"></script>
			  -->

			  <!-- Commented for UI Changes - ends -->
			  <!-- Added for UI Changes - starts -->
			  <noscript>You need to enable JavaScript to run this app.</noscript>
			  <div id="root"></div>
			  <script>
			  window.acquireVsCodeApi = acquireVsCodeApi;
			  </script>
			  <script  src="${scriptUri}"></script>
			  <script  src="${runtimeScriptUri}"></script>
			  <script  src="${staticScriptUri}"></script>
			  <!-- Added for UI Changes - ends -->
            </body>
            </html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
