var status;

//set the status value and update the browser action
function setStatus(value)
{
	status = value;
	if(status == 1)
	{
		chrome.browserAction.setBadgeText({text:"ON"});	
		chrome.browserAction.setBadgeBackgroundColor({color:[103,163,82,255]});
	}
	else
	{
		chrome.browserAction.setBadgeText({text:"OFF"});	
		chrome.browserAction.setBadgeBackgroundColor({color:[185,188,193,255]});
	}
}

//initialize the status value on load of background.html
function initStatus(){
	if(typeof(localStorage['glee_status']) != "undefined")
	{
		setStatus(localStorage['glee_status']);
	}
	else
		setStatus(1);
}

//Toggle status value and store it in local storage
function toggleStatus(tab){
	if(typeof(localStorage['glee_status']) != "undefined")
	{
		status = localStorage['glee_status'];
	}
	else
		status = 1;
	if(status == 1)
		setStatus(0);
	else
		setStatus(1);
	localStorage['glee_status'] = status;
	
	//get all the windows and their tabs to propagate the change in status
	chrome.windows.getAll({populate:true}, function(windows){
		for( i=0; i<windows.length; i++)
		{
			//set the status in all the tabs open in the window
			for(j=0;j<windows[i].tabs.length;j++)
			{
				chrome.tabs.sendRequest(windows[i].tabs[j].id, {value:"initStatus",status:status},function(response){
				});
			}
		}
	});
}

//React when a browser action's icon is clicked 
chrome.browserAction.onClicked.addListener(function(tab) {
	toggleStatus(tab);
});

//Add listener to respond to requests from content script
chrome.extension.onRequest.addListener(function(request,sender,sendResponse){
	if(request.value == "createTab")
	{
		chrome.tabs.create({url:request.url,selected:request.selected},null);
		sendResponse({});
	}
	else if(request.value == "sendRequest")
	{
		var req = new XMLHttpRequest();
		req.open(request.method,request.url, true);
		req.onreadystatechange = function(){
			if(req.readyState == 4)
			{
				sendResponse({data:req.responseText});
			}
		}
		req.send();
	}
	else if(request.value == "getBookmarks")
	{
		var bookmarks = [];
		chrome.bookmarks.search(request.text,function(results){
			for(i=0;i<results.length;i++)
			{
				if(results[i].url)
				{
					//exclude bookmarks whose URLs begin with 'javascript:' i.e. bookmarklets
					if(results[i].url.indexOf("javascript:") != 0)
						bookmarks[bookmarks.length] = results[i];
				}
			}
			sendResponse({bookmarks:bookmarks});
		});
	}
	else if(request.value == "getBookmarklet")
	{
		chrome.bookmarks.search(request.text,function(results){
			var found = false;
			for(i=0;i<results.length;i++)
			{
				if(results[i].url)
				{
					//check if it is a bookmarklet i.e. if it begins with 'javscript:'. If it is, send the response
					//Also match only titles
					if(results[i].url.indexOf("javascript:") == 0 && results[i].title.toLowerCase().indexOf(request.text.toLowerCase()) != -1)
					{
						sendResponse({bookmarklet:results[i]});
						found = true;
						break;
					}
				}
			}
			//otherwise, return null if no bookmarklet is found
			if(!found)
				sendResponse({bookmarklet:null});
		});
	}
	else if(request.value == "getOptions")
	{
		//Bookmark search status option
		var bookmark_search = localStorage["glee_bookmark_search"];
		//gleeBox position
		var position = localStorage["glee_position"];
		//gleeBox size
		var size = localStorage["glee_size"];
		//search engine
		var search = localStorage["glee_search"];
		//disabled domains
		if(localStorage["glee_domains"]) 
			domains = localStorage["glee_domains"].split(",");
		else
			domains = null;
		//scrolling animation
		var animation = localStorage["glee_scrolling_animation"];
		//theme
		var theme = localStorage["glee_theme"];
		//hyper mode
		var hyper = localStorage["glee_hyper"];
		//custom scraper commands
		if(localStorage["glee_scraper_names"])
		{
			var scraperName = localStorage["glee_scraper_names"].split("`");
			var scraperSel = localStorage["glee_scraper_selectors"].split("`");
			var scrapers = [];
			var len = scraperName.length;
			//last element is an empty string only containing a ,
			for(var i=0;i < len-1; i++)
			{
				if(i > 0)
				{
					//remove the , that is used by localStorage to separate elements
					scraperName[i] = scraperName[i].slice(1,scraperName[i].length);
					scraperSel[i] = scraperSel[i].slice(1,scraperSel[i].length);
				}
				scrapers[i] = { command:scraperName[i], selector:scraperSel[i], cssStyle:"GleeReaped", nullMessage: "Could not find any elements"};
			}
		}
		
		//esp status
		var espStatus = localStorage["glee_esp_status"];
		
		var espModifiers = null;
		//esp modifiers
		if(localStorage["glee_esp_urls"])
		{
			var espURL = localStorage["glee_esp_urls"].split(".NEXT.");
			var espSel = localStorage["glee_esp_selectors"].split(".NEXT.");
			var espModifiers = [];
			var len = espURL.length;
			//last element is an empty string only containing a ,
			for(var i=0;i < len-1; i++)
			{
				if(i > 0)
				{
					//remove the , that is used by localStorage to separate elements
					espURL[i] = espURL[i].slice(1,espURL[i].length);
					espSel[i] = espSel[i].slice(1,espSel[i].length);
				}
				espModifiers[i] = { url:espURL[i], selector:espSel[i] };
			}
		}
		
		sendResponse({status:status, bookmark_search:bookmark_search, position:position, size:size, domains:domains, animation:animation, theme:theme,scrapers:scrapers, hyper:hyper, search:search, espStatus:espStatus, espModifiers:espModifiers});

	}
	else if(request.value == "updateOption")
	{
		switch(request.option_value)
		{
			case "off"		:
			case "small"	:
			case "top"		: value = 0; break;
			
			case "on"		:
			case "medium"	:
			case "med"		:
			case "middle"	:
			case "mid"		: value = 1; break;
			
			case "large"	:
			case "bottom"	: value = 2; break;
			
			case 'default'	: value = "GleeThemeDefault"; break;
			case 'white'	: value = "GleeThemeWhite"; break;
			case 'console'	: value = "GleeThemeConsole"; break;
			case 'greener'	: value = "GleeThemeGreener"; break;
			case 'ruby'		: value = "GleeThemeRuby"; break;
			case 'glee'		: value = "GleeThemeGlee"; break;
		}

		switch(request.option)
		{
			case "scroll"	: localStorage["glee_scrolling_animation"] = value;
							  sendResponse({animation:value});
							  break;

			case "bsearch"	: localStorage["glee_bookmark_search"] = value;
							  sendResponse({bookmark_search:value});
							  break;
							
			case "hyper"	: localStorage["glee_hyper"] = value;
							  sendResponse({hyper:value});
							  break;

			case "size"		: localStorage["glee_size"] = value;
							  sendResponse({size:value});
							  break;
			
			case "pos"		:
			case "position"	: localStorage["glee_position"] = value;
							  sendResponse({position:value});
							  break;

			case "theme"	: localStorage["glee_theme"] = value;
							  sendResponse({theme:value});
							  break;
		}
	}
});