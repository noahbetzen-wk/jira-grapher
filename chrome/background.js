chrome.browserAction.onClicked.addListener(function(tab) {
    localStorage.sharedData = tab.url;
    chrome.tabs.create({url: 'graph.html'}); 
});