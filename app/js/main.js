console.log('nw.js', process.versions['node-webkit']);
console.log('chromium', process.versions['chromium']);
console.log('chrome', chrome);


(function () {
	'use strict';

	var app = angular.module('browser', ['ui.router']);

	/* Native UI */

	var gui = require('nw.gui');

    var win = gui.Window.get();
    
    // Native menus
    
    
	// Tab menu

	var tabMenu = new gui.Menu(),
		tabMenuPinItem,
        menuTargetTab;
    
	// LaunchLink menu

	var launchLinkMenu = new gui.Menu(),
		menuTargetLaunchLink,
		menuTargetLaunchLinkType;
    
    /* Theme */
    
    var lightWeightThemeStylesheet;
    
	/* Services */

	app.service('SNetwork', function () {
		return {
			tryUrl: function (url, success, error, head) {

				if (head == undefined) {
					head = true;
				}

				var options = {
					url: url,
					success: success,
					error: error,
					timeout: 1000
				};

				if (head) {
					options.type = 'HEAD';
				}

				$.ajax(options);
			}
		};
	});
	
	var LinkStorageService = function($timeout, $sce, storageId, options) {
		var self = this;
		
		var defaultOptions = {
			replaceRecent: false
		};
		
		$.each(defaultOptions, function(key, value) {
			if(!options[key]) {
				options[key] = value;
			}
		});

		var data = localStorage.getItem(storageId);
		var storedLinks;

		if (!data) {
			storedLinks = [];
		} else {
			storedLinks = JSON.parse(data);

			$.each(storedLinks, function (key, item) {
				item.created = new Date(item.created);
				
				if (item.faviconUrl) {
					item.favicon = $sce.trustAsUrl(item.faviconUrl);
				}
				
				if(!item.label) {
					item.label = item.url;
				}
			});
		}

		self.getAll = function (callback) {
			callback.call(null, storedLinks);
		};

		self.add = function (tab) {
			var item;
			if(tab.ready && !tab.special && tab.urlInput != "about:blank") {
				item = {
					url: tab.urlInput,
					label: (tab.title?tab.title:tab.urlInput),
					favicon: tab.favicon,
					faviconUrl: (tab.favicon ? tab.favicon.$$unwrapTrustedValue() : null),
					created: new Date(),
					index: (new Date()).getTime(),
                    count: 1
				};
				
				var addItem = true;

				if(options.replaceRecent) {
					$.each(storedLinks, function (key, value) {
						if (value && 
							value.url == item.url && 
							value.created.getDay() == item.created.getDay() &&
							value.created.getMonth() == item.created.getMonth() &&
							value.created.getYear() == item.created.getYear()
						   ) {
							addItem = false;
							value.label = item.label;
							value.favicon = item.favicon;
							value.faviconUrl = item.faviconUrl;
							value.created = item.created;
                            value.count ++;
						}
					});
				}
				
				$timeout(function () {
					if(addItem) {
						storedLinks.push(item);
					}
					self.save();
				});
			}
			
			return item;
		};

		self.save = function () {
			localStorage.setItem(storageId, JSON.stringify(storedLinks));
		};

		self.clearAll = function () {
			$timeout(function () {
				while (storedLinks.pop());
				self.save();
			});
		};
	};

	app.service('SBookmark', function ($timeout, $sce) {
		var SBookmark = function () {
			var self = this;

			var data = localStorage.getItem('bookmarks');
			var bookmarks;

			if (!data) {
				bookmarks = [];
			} else {
				data = JSON.parse(data);
				bookmarks = $.map(data, function (el) {
					return el;
				});

				$.each(bookmarks, function (key, item) {
					item.date = new Date(item.date);
					if (item.faviconUrl) {
						item.favicon = $sce.trustAsUrl(item.faviconUrl);
					}
				});
			}

			self.getAll = function (callback) {
				callback.call(null, bookmarks);
			};

			self.getByUrl = function (url) {
				for (var i = bookmarks.length - 1; i != -1; i--) {
					if (bookmarks[i].url == url) {
						return bookmarks[i];
					}
				}
				return null;
			};

			self.toggle = function (tab) {
				var bookmark = self.getByUrl(tab.urlInput);
				console.log(bookmark);
				if (!bookmark) {
					$timeout(function () {
						bookmarks.push({
							url: tab.urlInput,
							label: tab.title,
							favicon: tab.favicon,
							faviconUrl: (tab.favicon ? tab.favicon.$$unwrapTrustedValue() : null),
							created: new Date(),
							index: bookmarks.length
						});
						self.save();
						tab.bookmarked = true;
					});
				} else {
					removeBookmark(bookmark);
				}
			};
			
			self.removeByUrl = function(url) {
				var bookmark = self.getByUrl(url);
				if(bookmark) {
					removeBookmark(bookmark);
				}
			};

			self.clearAll = function () {
				$timeout(function () {
					while (bookmarks.pop());
					self.save();
				});
			};

			self.save = function () {
				localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
			};
			
			function removeBookmark(bookmark) {
				$timeout(function () {
					var index = bookmarks.indexOf(bookmark);
					if (index != -1) {
						bookmarks.splice(index, 1);
					}
					tab.bookmarked = false;
				});
			}
		}

		return new SBookmark();
	});

	app.service('SHistory', function ($timeout, $sce) {
		return new LinkStorageService(
			$timeout, $sce,
			'history', 
			{
				replaceRecent: true
			}
		);
	});

	app.service('SFavicon', function ($timeout, $sce) {
		var SFavicon = function () {
			var self = this;

			var data = localStorage.getItem('favicons');
			var favicons;

			if (!data) {
				favicons = {};
			} else {
				favicons = JSON.parse(data);

				$.each(favicons, function (key, item) {
					item.date = new Date(item.date);
				});
			}

			self.get = function (pageUrl) {
				return favicons[pageUrl];
			}

			self.set = function (pageUrl, faviconUrl) {
				favicons[pageUrl] = {
					pageUrl: pageUrl,
					faviconUrl: faviconUrl,
					date: new Date()
				};
				self.save();
			}

			self.save = function () {
				localStorage.setItem('favicons', JSON.stringify(favicons));
			};
		}

		return new SFavicon();
	});
    
    var TabStorageService = function(storageId, savePinnedMode) {
        var self = this;

        var data = localStorage.getItem(storageId);
        var savedTabs;

        if (!data) {
            savedTabs = [];
        } else {
            savedTabs = JSON.parse(data);
        }

        self.getAll = function () {
            return savedTabs;
        }

        self.setAll = function (tabs) {
            savedTabs = [];
            $.each(tabs, function (key, tab) {
                if(!tab.pinned) {
                    tab.pinned = false;
                }
                if (!tab.special && tab.pinned == savePinnedMode) {
                    savedTabs.push({
                        url: tab.urlInput,
                        favicon: (tab.favicon ? tab.favicon.$$unwrapTrustedValue() : null),
                        index: tab.index
                    });
                }
            })
            self.save();
        }

        self.save = function () {
            localStorage.setItem(storageId, JSON.stringify(savedTabs));
        };
    };

	app.service('SPinnedTab', function () {
		return new TabStorageService('pinnedTabs', true);
	});

	app.service('STabSession', function () {
		return new TabStorageService('tabs', false);
	});
    
    app.service('SConfig', function() {
        var SConfig = function() {
            var self = this;
            
            var configData;
            var data = localStorage.getItem('config');
            
            if(data) {
                configData = JSON.parse(data);
            } else {
                configData = {};
            }
            
            self.getConfig = function(key, defaultValue) {
                if(configData[key] == undefined) {
                    return defaultValue;
                } else {
                    return configData[key];
                }
            };
            
            self.setConfig = function(key, value) {
                configData[key] = value;
                self.save();
            };
            
            self.clearAll = function() {
                configData = {};
            }
            
            self.save = function() {
                localStorage.setItem('config', JSON.stringify(configData));
            };
            
        };
        
        return new SConfig();
    });

	/* Filters */


	/* Directives */


	/* Controllers */



	/// Main UI

	app.controller('CMainUi', function ($sce, $timeout, SNetwork, SBookmark, SHistory, SFavicon, SPinnedTab, STabSession, SConfig) {

		var self = this;
        
        self.dev = true;

		self.userAgent = "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0 Nux/0.1";
        
        //self.homePage = "https://duckduckgo.com/";
        self.homePage = "special:home";
        
        self.searchUrl = "https://duckduckgo.com?q=";
        
        self.newTabPlaceholder = "Search the web or enter a website address...";
        
        // Favorites

		self.favorites = [];

		SBookmark.getAll(function (list) {
			$timeout(function () {
				self.favorites = list;
			});
		});
        
        // History

		self.history = [];

		SHistory.getAll(function (list) {
			$timeout(function () {
				self.history = list;
			});
		});
        
        // Downloads

		self.downloads = [
			{
				name: "test.png",
				progress: 0.3,
				time: "3s"
            },
			{
				name: "test-1920x1080.jpg"
            },
			{
				name: "test-wode-webkit.zip"
            }
        ];
        
        // Tabs

		self.tabs = [];
        
        // Basic browsing

		self.openUrl = function (tab, url) {
			$timeout(function () {
				if(url) {
					if(url.indexOf("special:") == 0) {
						tab.special = true;

						url = url.replace("special:", "./pages/");
						url += ".html";
					} else {
						tab.special = false;

						if (url.indexOf("://") == -1 && url.indexOf(".") == -1) {
							url = self.searchUrl + url;
						}

						if (url.indexOf('://') == -1) {
							url = 'http://' + url;
						}

					}

					console.log('open ' + url);
					
					tab.url = $sce.trustAsResourceUrl(url);
					tab.urlInput = url;
					tab.title = "Loading...";
					tab.loading = true;
					tab.favicon = null;

					if (tab === self.currentTab) {
						self.updateAdressFake(url);
						self.closeLaunchpad();
					}

					$('#urlInput').blur();
				} else {
					tab.special = true;
				}
            });
		};

		self.updateAdressBar = function () {
			var url;
            
            console.log('special', self.currentTab.special);
            
            if(self.currentTab.special) {
                url = null;
                self.currentTab.fakeUrl = {
					prefix: self.newTabPlaceholder
				};
            } else {
                if(self.currentTab.window && self.currentTab.window.location) {
                    url = self.currentTab.window.location.href;
                }

                if(!url) {
                    url = self.currentTab.urlInput;
                }
            }
            
			self.currentTab.urlInput = url;
			self.updateAdressFake(url);

			win.title = "Nux - " + self.currentTab.title;
		};

		self.updateAdressFake = function (url) {
            if(url) {
                var reg = /([a-z]+:\/\/)([a-z0-9_%.-]+)(\/?.*)/i;
                url = url.match(reg);
                if (url) {
                    self.currentTab.fakeUrl = {
                        prefix: url[1],
                        domain: url[2],
                        suffix: url[3]
                    };
                }
            }
		};

		self.updateFavicon = function (tab) {
			//console.log(window);
			var window = tab.window;
			if (window) {

				var iconUrl = null,
					rel;

				/*if(window.location) {
					var favicon = SFavicon.get(window.location.origin);
					if(favicon && favicon.date.getTime() > (new Date()).getTime() - 1000 * 3600 * 24 * 2) { // 2 jours
						iconUrl = favicon.faviconUrl;
					}
				}*/

				if (window.document) {
					var links = window.document.getElementsByTagName('link');
					//console.log(links);
					$.each(links, function (key, value) {
						rel = value.getAttribute('rel');
						if (rel) {
							rel = rel.toLowerCase();
						}
						if (rel == 'icon' || rel == 'shortcut icon') {
							iconUrl = value.getAttribute('href');
							return false;
						}
					});

					if (iconUrl){
						if(iconUrl.indexOf('//') == 0) {
							iconUrl = 'http:' + iconUrl;
						} else if(iconUrl.charAt(0) == '/' || iconUrl.indexOf('./') == 0) {
							iconUrl = window.location.origin + iconUrl;
						}
					}

					console.log("icon", iconUrl);
				}

				if (iconUrl) {
					SNetwork.tryUrl(iconUrl, function () {
						self.displayFavicon(tab, iconUrl);
					}, function () {
						self.tryDefaultFavicon(tab);
					}, true);
				} else {
					self.tryDefaultFavicon(tab);
				}
			}
		};

		self.tryDefaultFavicon = function (tab) {

			var iconUrl;

			if (tab.window.location) {
				iconUrl = tab.window.location.origin + "/favicon.ico";
			} else {
				iconUrl = tab.urlInput + "/favicon.ico";
			}

			console.log(iconUrl);

			var img = $('#faviconImg');

			SNetwork.tryUrl(iconUrl, function () {
				self.displayFavicon(tab, iconUrl);
			}, function () {
				if (tab.window.location) {
					iconUrl = tab.window.location.origin + "/favicon.png";
				} else {
					iconUrl = tab.urlInput + "/favicon.png";
				}

				SNetwork.tryUrl(iconUrl, function () {
					self.displayFavicon(tab, iconUrl);
				}, function () {
					tab.favicon = null;
				}, true);
			}, true);

		};

		self.displayFavicon = function (tab, iconUrl) {
			$timeout(function () {
				tab.favicon = $sce.trustAsUrl(iconUrl);
				/*if(tab.window.location) {
					SFavicon.set(tab.window.location.origin, iconUrl);
				}*/
				if (tab.historyItem) {
					tab.historyItem.favicon = tab.favicon;
					tab.historyItem.faviconUrl = tab.favicon.$$unwrapTrustedValue();
				}
				SHistory.save();
			});
		};

		/* Actions */

		self.back = function () {
			if(self.currentTab.window.history) {
				self.currentTab.window.history.back();
			}
			self.closeLaunchpad();
		};

		self.forward = function () {
			if(self.currentTab.window.history) {
				self.currentTab.window.history.forward();
			}
			self.closeLaunchpad();
		};

		self.refresh = function (tab) {
			if (tab == undefined) {
				tab = self.currentTab;
			}
			tab.window.location.reload();
			self.closeLaunchpad();
		};

		self.openLaunchpad = function () {
			urlInputFocusState();

			self.launchpadOpened = true;

			// Flash fix
			if (self.currentTab.window) {
				var elems = self.currentTab.window.document.getElementsByTagName('embed');
				$.each(elems, function (key, elem) {
					elem.style.visibility = "hidden";
				});
			}
		};

		self.closeLaunchpad = function () {
			urlInputBlurState();

			self.launchpadOpened = false;

			// Flash fix
			if (self.currentTab.window) {
				var elems = self.currentTab.window.document.getElementsByTagName('embed');
				$.each(elems, function (key, elem) {
					elem.style.visibility = "visible";
				});
			}
		};

		self.bookmark = function () {
            if(!self.currentTab.special && self.currentTab.ready) {
                SBookmark.toggle(self.currentTab);
            }
		};

		self.historyClearAll = SHistory.clearAll;

		self.addon = function () {

			self.closeLaunchpad();
		};

		self.help = function () {

			self.closeLaunchpad();
		};

		self.settings = function () {

			self.closeLaunchpad();
		};

		self.showSource = function () {

			self.closeLaunchpad();
		};

		self.openDevTools = function () {
			var iframe = $('.browser--frame .webpage.current').get(0);

			win.showDevTools(iframe);

			self.closeLaunchpad();
		};

		self.openAppDevTools = function () {
			win.showDevTools();
		};

		self.reloadWindow = function () {
			win.reloadDev();
		};
        
        self.toggleTheme = function() {
            var body = $('html');
            if(body.hasClass('light')) {
                body.removeClass('light');
                body.addClass('dark');
                SConfig.setConfig('theme', 'dark');
            } else {
                body.removeClass('dark');
                body.addClass('light');
                SConfig.setConfig('theme', 'light');
            }
        };

		self.minimizeWindow = function () {
			win.minimize();
		};

		self.maximizeWindow = function () {
			if (!self.windowIsMaximized) {
				win.maximize();
			} else {
				win.unmaximize();
			}
		};

		self.closeWindow = function () {
			win.close();
		};
		
		self.clearAllData = function () {
			if(confirm("Reset the browser and clear all data (including bookmarks, history, etc.)?")) {
				SHistory.clearAll();
				SBookmark.clearAll();
				SPinnedTab.setAll([]);
				STabSession.setAll([]);
                SConfig.clearAll();
				self.reloadWindow();
			}
		}

		/* Url input */

		$('#urlInput').keyup(function (evt) {
			var e = $(evt.currentTarget);
			switch (evt.which) {
			case 13:
				if (self.currentTab.urlInput && self.currentTab.urlInput.length > 0) {
					self.openUrl(self.currentTab, self.currentTab.urlInput);
				}
				break;
			case 27:
                self.updateAdressBar();
				break;
			}
		});

		var urlInputFocus = false;

		self.onUrlInputClick = function (evt) {
			var e = $(evt.currentTarget);
			if (!urlInputFocus) {
                urlInputFocus = true;
                self.openLaunchpad();
                e.select();
			}
		};
        
        function urlInputFocusState() {
            $('#urlInput').removeClass('hidden');
			$('#urlInputFake').addClass('hidden');
        }
        
        function urlInputBlurState() {
            urlInputFocus = false;
            var urlInput = $('#urlInput');
            urlInput[0].selectionStart = urlInput[0].selectionEnd = -1;
            urlInput.addClass('hidden');
            $('#urlInputFake').removeClass('hidden');
        }
            

		$('#urlInput').focusin(function (evt) {
			urlInputFocusState();
		});

		$('#urlInput').focusout(function (evt) {
            if(!self.launchpadOpened) {
                urlInputBlurState();
            }
		});
		
		self.getTypingSuggestions = function(input) {
			var suggestions = [];
			var reg = new RegExp(input, "ig");
			$.each(self.favorites, function(key, item) {
				if((item.url && item.url.match(reg)) || (item.label && item.label.match(reg))) {
					suggestions.push(item);
				}
			});
		};

		/* Tabs */

		self.onTabLoad = function (tab) {
			updateTab(tab);
		};

		self.onTabDocumentReady = function (tab) {
            updateTab(tab);
		};
        
        function updateTab(tab) {
            var window = tab.window;

			$timeout(function () {
				if (tab == self.currentTab) {
					self.updateAdressBar();
				}
                
                if(tab.url && !tab.special) {
                    if(!tab.pinned) {
                        tab.historyItem = SHistory.add(tab);
                    }
                    self.updateFavicon(tab);
                }
			});
        }

		self.selectTab = function (tab) {
			console.log('select tab', tab.urlInput);
			if(tab) {
				self.currentTab = tab;
                tab.requireAttention = false;
				self.updateAdressBar();
				self.closeLaunchpad();
			}
		};
        
        function getNextTabIndex() {
            var index = -1;
            $.each(self.tabs, function(key, tab) {
                if(tab.index > index) {
                    index = tab.index;
                }
            });
            return index +1;
        }
        
        function getLastPinnedTabIndex() {
            var index = -1;
            $.each(self.tabs, function(key, tab) {
                if(tab.pinned && tab.index > index) {
                    index = tab.index;
                }
            });
            return index;
        }
        
        function insertTab(tab, index) {
            $.each(self.tabs, function(key, t) {
                if(t.index >= index) {
                    t.index ++;
                }
            });
            
            tab.index = index;
            if(self.tabs.indexOf(tab) == -1) {
                self.tabs.push(tab);
            }
        }

		self.addTab = function (tab) {
            var emptyTab = (tab == undefined);
			if (emptyTab) {
				tab = {
					url: null,
					urlInput: null,
					fakeUrl: null,
					favicon: null,
					title: null,
					bookmarked: false,
					historyItem: null,
                    special: true
				};
			}
			insertTab(tab, getNextTabIndex());
			self.selectTab(tab);
            if(emptyTab) {
                self.openLaunchpad();
                $('#urlInput').focus();
            } else {
                self.closeLaunchpad();
            }
		};

		self.openTab = function (sourceTab, afterTab, url, autoSelect) {
			$timeout(function () {
				var tab = {
					url: null,
					urlInput: url,
					fakeUrl: null,
					favicon: null,
					title: null,
					bookmarked: false,
					historyItem: null
				};
				var index = -1;

				var l = self.tabs.length;

				// Insert after last pinned tab
				if (afterTab.pinned) {
					for (var i = 0; i < l; i++) {
						if (!self.tabs[i].pinned) {
							index = i - 1;
							break;
						}
					}

				} else {
					// Insert after source tab
					index = self.tabs.indexOf(afterTab);
				}

				if (index == -1) {
					index = l - 1;
				}

				sourceTab.lastChildrenTab = tab;
				tab.parentTab = sourceTab;
                
                insertTab(tab, index + 1);

				if (autoSelect) {
					self.selectTab(tab);
				}

				self.closeLaunchpad();
			});

		};

		self.closeTab = function (tab) {
			if (self.tabs.length > 1) {
				var index = self.tabs.indexOf(tab);

				if (tab == self.currentTab) {
                    var i = index - 1;
                    if (i == -1) {
                        i = 1;
                    }

                    var tabToSelect = self.tabs[i];
					$timeout(function () {
						self.selectTab(tabToSelect);
					}, 10);
				}

				tab.close();

				$timeout(function () {
                    index = self.tabs.indexOf(tab);
					self.tabs.splice(index, 1);
				}, 300);
			}
		};

		self.pinTab = function (tab) {
            if(!tab.special) {
                $timeout(function () {
                    insertTab(tab, getLastPinnedTabIndex() + 1);
                    tab.pinned = true;

                    savePinnedTabs();
                });
            }
		};

		self.unpinTab = function (tab) {
			$timeout(function () {
                insertTab(tab, getLastPinnedTabIndex() + 1);
				tab.pinned = false;
                
                savePinnedTabs();
			});
		};

		self.moveTabTo = function (tab, position) {
			$timeout(function () {
				var index = self.tabs.indexOf(tab);
				if (index != -1) {
					self.tabs.splice(index, 1);
				}

				self.tabs.splice(position, 0, tab);
			});
		};
        
        function savePinnedTabs() {
			SPinnedTab.setAll(self.tabs);
        }
        
        function saveTabSession() {
            STabSession.setAll(self.tabs);
        }
        
        // Auto tab saving
        setInterval(saveTabSession, 5000);

		/* Tab Menu */

		tabMenu.append(new gui.MenuItem({
			label: 'Refresh',
			click: function (evt) {
				if (menuTargetTab) {
					self.refresh(menuTargetTab);
				}
			}
		}));

		tabMenu.append(tabMenuPinItem = new gui.MenuItem({
			label: 'Pin',
			click: function (evt) {
				if (menuTargetTab) {
					if (menuTargetTab.pinned) {
						self.unpinTab(menuTargetTab);
					} else {
						self.pinTab(menuTargetTab);
					}
				}
			}
		}));

		tabMenu.append(new gui.MenuItem({
			type: 'separator'
		}));

		tabMenu.append(new gui.MenuItem({
			label: 'Close',
			click: function (evt) {
				if (menuTargetTab) {
					self.closeTab(menuTargetTab);
				}
			}
		}));

		/* LaunchLink Menu */

		launchLinkMenu.append(new gui.MenuItem({
			label: 'Open in new tab',
			click: function (evt) {
				if (menuTargetLaunchLink) {
					$timeout(function() {
						self.addTab({
							url: null,
							urlInput: menuTargetLaunchLink.url,
							fakeUrl: null,
							favicon: null,
							title: null,
							bookmarked: false,
							historyItem: null
						});
					});
				}
			}
		}));
		
		launchLinkMenu.append(new gui.MenuItem({
			label: 'Delete',
			click: function (evt) {
				if (menuTargetLaunchLink) {
					if(menuTargetLaunchLinkType == "bookmark") {
						SBookmark.removeByUrl(menuTargetLaunchLink.url);
					}
				}
			}
		}));

		/* Window */

		self.windowIsMaximized = false;
		self.windowHasFocus = true;

		win.on('maximize', function () {
			$timeout(function () {
				self.windowIsMaximized = true;
			});
		});

		win.on('unmaximize', function () {
			$timeout(function () {
				self.windowIsMaximized = false;
			});
		});

		win.on('focus', function () {
			$timeout(function () {
				self.windowHasFocus = true;
			});
		});

		win.on('blur', function () {
			$timeout(function () {
				self.windowHasFocus = false;
			});
		});

		win.on('close', function () {
			SBookmark.save();
			SHistory.save();
            SConfig.save();
            savePinnedTabs();
            saveTabSession();
		});
		
		win.on('new-win-policy', function(frame, url, policy) {
			console.log(frame, url, policy);
			policy.ignore();
			
			var tab = frame.tab;
			if(tab) {
				var afterTab = tab;

				if (tab.lastChildrenTab) {
					afterTab = tab.lastChildrenTab;
				}

				self.openTab(tab, afterTab, url, false);
			}
		});
		
		/* Page change */
		
		window.addEventListener('beforeunload', function(evt) {
			console.warn("LEAVING APP PAGE", evt);
			
			evt.returnValue = "You are leaving the app page!";
			
			return "You are leaving the app page!";
		}, true);
		
		/* Web Requests */
		
		/*var filter = {
			urls: ["<all_urls>"],
			types: ["main_frame"]
		};
		
		function onBeforeRequest(details) {
			console.log("onBeforeRequest", details);
		}
		
		chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, filter, ["blocking"]);*/

		/* Keyboard shortcuts */
		
		// Refresh
		gui.App.registerGlobalHotKey(new gui.Shortcut({
			key: "F5",
			active: function () {
				if(self.windowHasFocus) {
					self.refresh();
				}
			},
			failed: function (msg) {
				console.log(msg);
			}
		}));
		
		// Focus address bar
		gui.App.registerGlobalHotKey(new gui.Shortcut({
			key: "Ctrl+L",
			active: function () {
				if(self.windowHasFocus) {
					$timeout(function() {
						self.openLaunchpad();
						try {
							$('#urlInput').select().focus();
						} catch(e) {
							console.error(e);
						}
					});
				}
			},
			failed: function (msg) {
				console.log(msg);
			}
		}));

		// New Tab
		gui.App.registerGlobalHotKey(new gui.Shortcut({
			key: "Ctrl+T",
			active: function () {
				if(self.windowHasFocus) {
					$timeout(function() {
						self.addTab();
					});
				}
			},
			failed: function (msg) {
				console.log(msg);
			}
		}));

		// Close current tab
		gui.App.registerGlobalHotKey(new gui.Shortcut({
			key: "Ctrl+W",
			active: function () {
				if(self.windowHasFocus) {
					$timeout(function() {
						self.closeTab(self.currentTab);
					});
				}
			},
			failed: function (msg) {
				console.log(msg);
			}
		}));

		/* Pinned tabs */

		var pinnedTabs = SPinnedTab.getAll();
		$.each(pinnedTabs, function (key, tab) {
			self.addTab({
				url: null,
				urlInput: tab.url,
				fakeUrl: null,
				favicon: (tab.favicon ? $sce.trustAsUrl(tab.favicon) : null),
				title: null,
				bookmarked: false,
				historyItem: null,
				pinned: true
			});
		});

		/* Session restoration */
        
        var tabSession = STabSession.getAll();
        if(tabSession.length > 0) {
            $.each(tabSession, function (key, tab) {
                self.addTab({
                    url: null,
                    urlInput: tab.url,
                    fakeUrl: null,
                    favicon: (tab.favicon ? $sce.trustAsUrl(tab.favicon) : null),
                    title: null,
                    bookmarked: false,
                    historyItem: null,
                    pinned: false
                });
            });
        } else {
            self.addTab({
                url: null,
                urlInput: self.homePage,
                fakeUrl: null,
                favicon: null,
                title: null,
                bookmarked: false,
                historyItem: null
            });
        }
        
        /* Theme */

        var body = $('html');
        if(SConfig.getConfig('theme', 'light') === 'light') {
            body.removeClass('dark');
            body.addClass('light');
        } else {
            body.removeClass('light');
            body.addClass('dark');
        }
        
        lightWeightThemeStylesheet = $('<style/>');
        $('head').append(lightWeightThemeStylesheet);

		/* Start animation */

		$('.browser--main-ui').removeClass('hidden');

	});


	/// Web Page

	app.controller('CWebPage', function ($scope, $element, $timeout, SBookmark) {

		// Element

		var element = $element[0];
		var tab = $scope.$parent.tab;
		element.tab = tab;
		$scope.tab = tab;
		tab.iframeElement = $(element);
		var window = element.contentWindow;
		tab.window = window;

		var Browser = $scope.$parent.$parent.Browser;
		
		var titleRegEx = /\(\s*([0-9]+)\s*\)/i;

		// Load state management

		var oldState, oldDomain, oldTitle;

		function onLoad() {		
            console.log('loaded');	
			tab.loading = false;
			tab.ready = true;
            tab.bookmarked = SBookmark.getByUrl(tab.url) != null;
			Browser.onTabLoad(tab);
		}
        
        function onUnload() {
            console.log('unloaded');
            tab.loading = true;
			tab.ready = false;
            tab.bookmarked = false;
            oldTitle = null;
        }
		
		var tick = 0;

		function onDocumentReadyStateChange() {
			var document = window.document;
			if (document) {
                $timeout(function() {
                    if (document.readyState != oldState) {
                        console.log(tab.urlInput + ' ' + oldState + ' -> ' + document.readyState);
                        oldState = document.readyState;

                        if (document.readyState == "uninitialized" || document.readyState == "loading") {
                            // Loading
                            tab.ready = false;
                            tab.loading = true;
                            tab.title = "Loading...";
                            if (location.origin != oldDomain) {
                                oldDomain = location.origin;
                                tab.favicon = null;
                            }
                        } else if (document.readyState == "loaded" || document.readyState == "interactive" || document.readyState == "complete") {
                            // Ready
                            tab.imageMode = (window.document.contentType.indexOf("image") != -1);
                            tab.ready = true;
                            Browser.onTabDocumentReady(tab);
                        }


                    }

                    if (tab.ready && document.title != oldTitle) {
                        if(tab.pinned && Browser.currentTab != tab) {
                            tab.requireAttention = true;
                        }

                        tab.title = document.title;
                        oldTitle = document.title;
						
						var match = document.title.match(titleRegEx);
						if(match && match.length > 1) {
							tab.count = parseInt(match[1]);
							if(tab.count > 9) {
								tab.count = "+";
							}
						} else {
							tab.count = null;
						}
                    }
                    
					if(tick % 50 == 0) {
						$(document).off('InstallBrowserTheme', onThemeInstall);
						$(document).on('InstallBrowserTheme', onThemeInstall);
						$(document).off('PreviewBrowserTheme', onThemePreview);
						$(document).on('PreviewBrowserTheme', onThemePreview);
						$(document).off('ResetBrowserThemePreview', onThemeResetPreview);
						$(document).on('ResetBrowserThemePreview', onThemeResetPreview);
					}
                });
				
				tick ++;
			}

		}
                         
        function onThemeInstall(evt) {
            var themeData = JSON.parse(evt.target.getAttribute('data-browsertheme'));
            console.log('InstallBrowserTheme', themeData);
            applyTheme(themeData);
        }
                         
        function onThemePreview(evt) {
            var themeData = JSON.parse(evt.target.getAttribute('data-browsertheme'));
            console.log('PreviewBrowserTheme', themeData);
            applyTheme(themeData);
        }
        
        function applyTheme(themeData) {
            lightWeightThemeStylesheet.html("\
                body { background-image: url(" + themeData.headerURL + ") !important; }\
                body, a, input, .browser--address-bar-fake, .browser--launchpad .box, .browser--tab { color: " + themeData.textcolor + " !important; }\
.browser--tab-bar .no-tab, .browser--tab, .browser--tab.closed { border-bottom: solid 1px " + themeData.accentcolor + " !important;  }\
.browser--tab.selected { border: solid 1px " + themeData.accentcolor + " !important; border-bottom: 1px solid transparent !important; }\
.browser--main-ui, .browser--main-ui.focus { border: solid 1px " + themeData.accentcolor + " !important; }\
            ");
        }
                         
        function onThemeResetPreview(evt) {
            lightWeightThemeStylesheet.html("");
        }

		setInterval(onDocumentReadyStateChange, 300);

		$(element).load(onLoad);
        $(window).unload(onUnload);

		// Close

		tab.close = function () {
			tab.tabElement.addClass('closed');
			clearInterval(onDocumentReadyStateChange, 200);
            if(window) {
                window.removeEventListener('load', onLoad);
            }
		};

		// Startup page

		if (tab.urlInput) {
			tab.loading = true;
			tab.ready = false;
			Browser.openUrl(tab, tab.urlInput);
		}

	});



	/// Tab

	app.controller('CTab', function ($scope, $element, $timeout) {

		var element = $element[0];
		var tab = $scope.$parent.tab
		$scope.tab = tab;
		tab.tabElement = $(element);

		var Browser = $scope.$parent.$parent.Browser;

		$(element).click(function (evt) {
			if(evt.which == 1) {
				$timeout(function() {
					Browser.selectTab(tab);
				});
			} else if (evt.which == 2 && !tab.pinned) {
				Browser.closeTab(tab);
			}
		});

		$(element).on('contextmenu', function (evt) {
			menuTargetTab = tab;

			if (tab.pinned) {
				tabMenuPinItem.label = 'Unpin';
			} else {
				tabMenuPinItem.label = 'Pin';
			}

			tabMenu.popup(evt.pageX, evt.pageY);
		});

	});
    
    /// Favorite
    
    app.controller('CBookmarkItem', function ($scope, $element, $timeout) {

		var element = $element[0];
		var item = $scope.$parent.link;

		var Browser = $scope.$parent.$parent.Browser;
        
        $(element).on('contextmenu', function (evt) {
			menuTargetLaunchLink = item;
			menuTargetLaunchLinkType = "bookmark";
			
			launchLinkMenu.popup(evt.pageX, evt.pageY);
		});
        
    });


})();
