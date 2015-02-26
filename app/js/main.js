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
		var SHistory = function () {
			var self = this;

			var data = localStorage.getItem('history');
			var history;

			if (!data) {
				history = [];
			} else {
				data = JSON.parse(data);

				history = [];

				for (var x in data) {
					history.push(data[x]);
				}

				$.each(history, function (key, item) {
					item.date = new Date(item.date);
					if (item.faviconUrl) {
						item.favicon = $sce.trustAsUrl(item.faviconUrl);
					}
					if(!item.label) {
						item.label = item.url;
					}
				});
			}

			self.getAll = function (callback) {
				callback.call(null, history);
			};

			self.add = function (tab) {
				var item = {
					url: tab.urlInput,
					label: tab.title,
					favicon: tab.favicon,
					faviconUrl: (tab.favicon ? tab.favicon.$$unwrapTrustedValue() : null),
					date: new Date(),
					index: (new Date()).getTime()
				};

				$.each(history, function (key, value) {
					if (value && ((value.url == item.url && value.date.getDay() == item.date.getDay() &&
							value.date.getMonth() == item.date.getMonth() && value.date.getYear() == item.date.getYear()) || value.date.getTime() > item.date.getTime() - 1000)) {
						history.splice(key, 1);
					}
				});

				$timeout(function () {
					history.push(item);
					self.save();
				});
				return item;
			};

			self.save = function () {
				localStorage.setItem('history', JSON.stringify(history));
			};

			self.clearAll = function () {
				$timeout(function () {
					while (history.pop());
					self.save();
				});
			};
		}

		return new SHistory();
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
                        favicon: (tab.favicon ? tab.favicon.$$unwrapTrustedValue() : null)
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

	/* Filters */


	/* Directives */


	/* Controllers */



	/// Main UI

	app.controller('CMainUi', function ($sce, $timeout, SNetwork, SBookmark, SHistory, SFavicon, SPinnedTab, STabSession) {

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
                //$('#webpage').attr('src', url);

                $timeout(function () {
                    tab.url = $sce.trustAsResourceUrl(url);
                    tab.urlInput = url;
                    tab.title = "Loading...";
                    tab.loading = true;
                    tab.favicon = null;

                    if (tab === self.currentTab) {
                        self.updateAdressFake(url);
                        self.closeLaunchpad();
                    }
                });

                $('#urlInput').blur();
            } else {
                tab.special = true;
            }
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

					if (iconUrl && (iconUrl.charAt(0) == '/' || iconUrl.indexOf('./') == 0)) {
						iconUrl = window.location.origin + iconUrl;
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
				self.updateAdressBar();
				self.closeLaunchpad();
			}
		};

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
			self.tabs.push(tab);
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

				self.tabs.splice(index + 1, 0, tab);

				if (autoSelect) {
					self.selectTab(tab);
				}

				self.closeLaunchpad();
			});

		};

		self.closeTab = function (tab) {
			if (self.tabs.length > 1) {
				var index = self.tabs.indexOf(tab);
				var i = index - 1;
				if (index == -1) {
					i = 0;
				}

				if (tab == self.currentTab) {
					console.log('samge -> select new tab');
					$timeout(function () {
						self.selectTab(self.tabs[i]);
					}, 10);
				}

				tab.close();

				$timeout(function () {
					self.tabs.splice(index, 1);
				}, 300);
			}
		};

		self.pinTab = function (tab) {
            if(!tab.special) {
                $timeout(function () {
                    var index = self.tabs.indexOf(tab);
                    if (index != -1) {
                        self.tabs.splice(index, 1);
                    }

                    index = 0;
                    var l = self.tabs.length;
                    for (var i = 0; i < l; i++) {
                        if (self.tabs[i].pinned) {
                            index = i + 1;
                        }
                    }

                    self.tabs.splice(index, 0, tab);
                    tab.pinned = true;

                    savePinnedTabs();
                });
            }
		};

		self.unpinTab = function (tab) {
			$timeout(function () {
				var index = self.tabs.indexOf(tab);
				if (index != -1) {
					self.tabs.splice(index, 1);
				}

				index = 0;
				var l = self.tabs.length;
				for (var i = 0; i < l; i++) {
					if (!self.tabs[i].pinned) {
						index = i;
						break;
					}
				}

				self.tabs.splice(index, 0, tab);
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
            savePinnedTabs();
            saveTabSession();
		});

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

		/* Start animation */

		$('.browser--main-ui').removeClass('hidden');

	});


	/// Web Page

	app.controller('CWebPage', function ($scope, $element, $timeout) {

		// Element

		var element = $element[0];
		var tab = $scope.$parent.tab;
		$scope.tab = tab;
		tab.iframeElement = $(element);
		var window = element.contentWindow;
		tab.window = window;

		var Browser = $scope.$parent.$parent.Browser;

		// Load state management

		var oldState, oldDomain;

		function onLoad() {			
			tab.loading = false;
			Browser.onTabLoad(tab);
		}

		function onDocumentReadyStateChange() {
			var document = window.document;
			if (document) {
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

						if (document.readyState == "complete") {
							// Complete
							tab.loading = false;
							Browser.onTabLoad(tab);
						}
					}


				}

				var body = document.getElementsByTagName('body');

				if (body && body.length > 0) {
					handleClicks();
				}
                
                if (tab.ready) {
                    tab.title = document.title;
                }
			}

		}

		setInterval(onDocumentReadyStateChange, 100);

		$(element).load(onLoad);

		// Close

		tab.close = function () {
			tab.tabElement.addClass('closed');
			clearInterval(onDocumentReadyStateChange, 200);
            if(window) {
                window.removeEventListener('load', onLoad);
            }
		};

		// New tab opening

		function handleClicks() {
			$(element).contents().find('body').off('click', onBodyClick);
			$(element).contents().find('body').click(onBodyClick);
		}

		function onBodyClick(evt) {
			if (evt.which == 1 || evt.which == 2) {

				var link = evt.target;

				if (link.tagName != "a") {

					var closestLink = $(link).closest('a');

					if (closestLink.length > 0) {
						link = closestLink[0];
					} else {
						link = null;
					}

				}

				if (link && link.href && (evt.ctrlKey || evt.which == 2 || link.getAttribute('target') == '_blank')) {
					evt.stopPropagation();
					evt.preventDefault();

					var afterTab = tab;

					if (tab.lastChildrenTab) {
						afterTab = tab.lastChildrenTab;
					}

					Browser.openTab(tab, afterTab, link.href, evt.shiftKey);
					
					return false;
				}

			}
		}

		// Startup page

		if (tab.urlInput) {
			tab.loading = true;
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