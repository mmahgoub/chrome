// Recieve message from content script
// If response.showPageActionIcon === true,
// We've got possible songs on page
// Create a new Tab object
function onMessage(e, sender){
    console.log('onMessage', e, sender);
    if(e.type === 'scanDone'){
        if(e.response.showPageActionIcon === true){
            var tab = new Tab(sender, e.response, true);
        }
    }
}
chrome.runtime.onMessage.addListener(this.onMessage);


// Page action was clicked
// get a ref to tab and do a deep scan for songs
function onPageActionClicked(sender){
    chrome.storage.local.get("tab" + sender.id, function(savedTab){
        var props = savedTab["tab" + sender.id];
        var tab = new Tab(props.sender, props.response, false);
        tab.onPageActionClicked();
    });
}
chrome.pageAction.onClicked.addListener(this.onPageActionClicked);


// tab was removed
// remove it from storage
function onTabRemoved(tabId){
    chrome.storage.local.remove("tab" + tabId);
}
chrome.tabs.onRemoved.addListener(this.onTabRemoved);