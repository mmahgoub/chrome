// New Rhapsody object
function Rhapsody(tab){
    this.tab = tab;
}

// Save a song to a playlist
// search for a match
// see if we already have a playlist id
// if we dont have a playlist id search for Exfm playlist on rhapsody
// if we dont have an Exfm playlist on rhapsody create on
Rhapsody.prototype.save = function(title, artist){
    this.getAuth().then(
        function(oAuthObject){
            // Search for song
            this.search(title).then(
                function(json){
                    // Does the song match what Rhapsody gave us?
                    this.determineSearch(json, title, artist).then(
                        function(trackId){
                            // Do we have the playlistId in storage?
                            this.getPlaylistId().then(
                                function(playlistId){
                                    // Add the song to the playlist
                                    this.addToPlaylist(oAuthObject, playlistId, trackId).then(
                                        function(json){
                                            this.tab.sendServiceAction(
                                                true,
                                                'Song saved on Rhapsody',
                                                'save',
                                                'Rhapsody'
                                            );
                                        }.bind(this),
                                        function(error){
                                            this.handleAPIError(error);
                                        }.bind(this)
                                    )
                                }.bind(this),
                                function(){
                                    // Get or create a new playlist
                                    this.getOrCreatePlaylist(oAuthObject, trackId);
                                }.bind(this)
                            )
                        }.bind(this),
                        function(){
                            // No match on Rhapsody
                            this.tab.sendServiceAction(
                                false,
                                'Song not found on Rhapsody',
                                'save',
                                'Rhapsody'
                            );
                        }.bind(this)
                    )
                }.bind(this),
                function(error){
                    // Search error
                    this.tab.sendServiceAction(
                        false,
                        'Error searching for song on Rhapsody',
                        'save',
                        'Rhapsody'
                    );
                }.bind(this)
            );
        }.bind(this),
        this.tab.sendAuthDialog.bind(this.tab, 'Rhapsody')
    )
}

// Search for a song 
Rhapsody.prototype.search = function(title){
	return $.ajax(
	    {
	        'url': constants.RHAPSODY.API_URL + 'search',
	        'type': 'GET',
            'data': {
				'q': title,
				'type': 'track',
				'limit': 10,
				'apikey': keys.RHAPSODY.KEY
			}
        }
    );
}

// does the search result match what we provided it?
Rhapsody.prototype.determineSearch = function(json, title, artist){
    var promise = $.Deferred(); 
    var len = json.length;
    for(var i = 0; i < len; i++){
        var item = json[i];
        if(item.name.toLowerCase() === title.toLowerCase() && 
            item.artist.name.toLowerCase() === artist.toLowerCase())
        {
            promise.resolve(item.id);
            break;
        }
    }
    promise.reject();
    return promise;
}

// check if Rhapsody playlist id is saved
Rhapsody.prototype.getPlaylistId = function(){
    var promise = $.Deferred();
    chrome.storage.sync.get(
        'rhapsodyPlaylistId',
        function(obj){
            if(obj['rhapsodyPlaylistId']){
                promise.resolve(obj['rhapsodyPlaylistId']);
            }
            else{
                promise.reject();
            }
        }
    )
    return promise;
}

// see if we already have a playlist id
// if we dont have a playlist id search for Exfm playlist on Rhapsody
// if we dont have an Exfm playlist on Rhapsody create on
Rhapsody.prototype.getOrCreatePlaylist = function(oAuthObject, trackId){
    // Get playlists from Rhapsody
    this.getPlaylists(oAuthObject).then(
        function(json){
            // Is there a playlist called 'Exfm'?
            this.determinePlaylists(json).then(
                function(playlistId){
                    // Got the playlist. Add the song
                    this.addToPlaylist(oAuthObject, playlistId, trackId).then(
                        function(json){
                            this.tab.sendServiceAction(
                                true,
                                'Song saved on Rhapsody',
                                'save',
                                'Rhapsody'
                            );
                        }.bind(this),
                        function(error){
                            this.tab.sendServiceAction(
                                false,
                                'Error saving song on Rhapsody',
                                'save',
                                'Rhapsody'
                            );
                        }.bind(this)
                    )
                    // Save the playlistId to storage
                    this.savePlaylistId(playlistId);
                }.bind(this),
                function(){
                    // Create the playlist on Rhapsody
                    this.createPlaylist(oAuthObject).then(
                        function(json){
                            // Got the playlist. Add the song
                            this.addToPlaylist(oAuthObject, json.id, trackId).then(
                                function(json){
                                    this.tab.sendServiceAction(
                                        true,
                                        'Song saved on Rhapsody',
                                        'save',
                                        'Rhapsody'
                                    );
                                }.bind(this),
                                function(error){
                                    this.tab.sendServiceAction(
                                        false,
                                        'Error saving song on Rhapsody',
                                        'save',
                                        'Rhapsody'
                                    );
                                }.bind(this)
                            )
                            // Save the playlistId to storage
                            this.savePlaylistId(json.id);
                        }.bind(this),
                        function(){
                            this.tab.sendServiceAction(
                                false,
                                'Error saving song on Rhapsody',
                                'save',
                                'Rhapsody'
                            );
                        }.bind(this)
                    )
                }.bind(this)
            )
        }.bind(this),
        function(){
            
        }
    )
}

// Get logged in user playlists
Rhapsody.prototype.getPlaylists = function(oAuthObject){
	return $.ajax(
	   {
	       'url': constants.RHAPSODY.SECURE_API_URL + 'me/playlists',
	       'type': 'GET',
	       'headers': {
	           'Authorization': 'Bearer ' + oAuthObject.access_token
	       }
        }
    );
}

// Is there a playlist alreayd called Exfm?
Rhapsody.prototype.determinePlaylists = function(json){
    var promise = $.Deferred(); 
    for(var i = 0; i < json.length; i++){
        var playlist = json[i];
        if(playlist.name === constants.RHAPSODY.PLAYLIST_NAME){
            promise.resolve(playlist.id);
            break;
        }
    }
    promise.reject();
    return promise;
}

// Create Exfm playlist
Rhapsody.prototype.createPlaylist = function(oAuthObject, trackId){
    return $.ajax(
	   {
	        'url': constants.RHAPSODY.SECURE_API_URL + 'me/playlists',
	        'type': 'POST',
            'data': {
				'name': constants.RHAPSODY.PLAYLIST_NAME
			 },
             'headers': {
                'Authorization': 'Bearer ' + oAuthObject.access_token
             }
        }
    ); 
}

// Save playlist id to storage
Rhapsody.prototype.savePlaylistId = function(id){
    var obj = {
        'rhapsodyPlaylistId': id
    }
    chrome.storage.sync.set(obj);   
}

// Add to Exfm playlist
Rhapsody.prototype.addToPlaylist = function(oAuthObject, playlistId, trackId){
    return $.ajax(
	    {
	        'url': constants.RHAPSODY.SECURE_API_URL + 'me/playlists/' + playlistId + '/tracks',
	        'type': 'POST',
            'data': {
				'id': trackId
            },
			'headers': {
                'Authorization': 'Bearer ' + oAuthObject.access_token
            }
        }
    );
}

// Did our token expire?
// If so, tell user to re-connect 
// and remove oauth creds and playlistId 
Rhapsody.prototype.handleAPIError = function(xhr){
    if(xhr.responseJSON){
        if(xhr.responseJSON.fault){
            if(xhr.responseJSON.fault.detail.errorcode === constants.RHAPSODY.TOKEN_EXPIRED_ERROR){
                this.disconnect();
                this.tab.sendServiceAction(
                    false,
                    'There was an error. Please re-connect Rhapsody',
                    'save',
                    'Rhapsody'
                );
                return;
            }
        }
    }
    this.tab.sendServiceAction(
        false,
        'Error saving song on Rhapsody',
        'save',
        'Rhapsody'
    );
}

// remove oauth creds
// and paylistId from local storage
Rhapsody.prototype.disconnect = function(){
    chrome.storage.sync.remove('rhapsodyAuth');
    chrome.storage.sync.remove('rhapsodyPlaylistId');
}


// check if user is connected to Rhapsody
// If connected but token is expired
// get a new token
Rhapsody.prototype.getAuth = function(){
    var promise = $.Deferred();
    chrome.storage.sync.get(
        'rhapsodyAuth',
        function(oAuthObj){
            if(oAuthObj['rhapsodyAuth']){
                var now = new Date().getTime();
                if(now < oAuthObj['rhapsodyAuth'].expireTime){
                    promise.resolve(oAuthObj['rhapsodyAuth']);
                }
                else{
                    this.refreshToken(oAuthObj['rhapsodyAuth'], promise);
                }
            }
            else{
                promise.reject();
            }
        }.bind(this)
    )
    return promise;
}

// refresh access token
Rhapsody.prototype.refreshToken = function(oAuthObject, promise){
    $.ajax(
	    {
	        'url': constants.RHAPSODY.ACCESS_URL,
	        'type': 'POST',
            'data': {
				'client_id': keys.RHAPSODY.KEY,
				'client_secret': keys.RHAPSODY.SECRET,
				'response_type': 'code',
				'grant_type': 'refresh_token',
				'refresh_token': oAuthObject.refresh_token
			 }
        }
    ).then(
        function(json){
            if(json.expires_in){
                var now = new Date().getTime();
                json.expireTime = now + (parseInt(json.expires_in) * 1000);
            }
            var obj = {
                'rhapsodyAuth': json
            };
            chrome.storage.sync.set(obj);
            promise.resolve(json);
        },
        function(error){
            this.disconnect();
            promise.reject();
        }.bind(this)
    )
}