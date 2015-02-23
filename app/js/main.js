(function(){
	'user strict';
	
	var app = angular.module('browser', ['ui.router']);
	
	/* Native UI */
	
	var gui = require('nw.gui');
	
	// Tab menu
	
	var tabMenu = new gui.Menu(), tabMenuPinItem, tabMenuTarget;
	
	/* Services */
	
	app.service('SNetwork', function () {
		return {
			tryUrl: function (url, success, error, head) {
				
				if(head == undefined) {
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
	
	app.service('SBookmark', function($timeout, $sce) {
		var SBookmark = function() {
			var self = this;
			
			var data = localStorage.getItem('bookmarks');
			var bookmarks;
			
			if(!data) {
				bookmarks = [];
			} else {
				data = JSON.parse(data);
				bookmarks = $.map(data, function(el) { return el; });
				
				$.each(bookmarks, function(key, item) {
					item.date = new Date(item.date);
					if(item.faviconUrl) {
						item.favicon = $sce.trustAsUrl(item.faviconUrl);
					}
				});
			}
			
			self.getAll = function(callback) {
				callback.call(null, bookmarks);
			};
			
			self.getByUrl = function(url) {
				for(var i = bookmarks.length - 1; i != -1; i--) {
					if(bookmarks[i].url == url) {
						return bookmarks[i];
					}
				}
				return null;
			};
			
			self.toggle = function(tab) {
				var bookmark = self.getByUrl(tab.urlInput);
				console.log(bookmark);
				if(!bookmark) {
					$timeout(function(){
						bookmarks.push({
							url: tab.urlInput,
							label: tab.title,
							favicon: tab.favicon,
							faviconUrl: (tab.favicon?tab.favicon.$$unwrapTrustedValue():null),
							created: new Date(),
							index: bookmarks.length
						});
						self.save();
						tab.bookmarked = true;
					});
				} else {
					$timeout(function(){
						var index = bookmarks.indexOf(bookmark);
						if(index != -1) {
							bookmarks.splice(index, 1);
						}
						tab.bookmarked = false;
					});
				}
			};
			
			self.save = function() {
				localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
			};
		}
		
		return new SBookmark();
	});
	
	app.service('SHistory', function($timeout, $sce) {
		var SHistory = function() {
			var self = this;
			
			var data = localStorage.getItem('history');
			var history;
			
			if(!data) {
				history = [];
			} else {
				data = JSON.parse(data);
				
				history = [];

				for (var x in data) {
					history.push(data[x]);
				}
				
				$.each(history, function(key, item) {
					item.date = new Date(item.date);
					if(item.faviconUrl) {
						item.favicon = $sce.trustAsUrl(item.faviconUrl);
					}
				});
			}
			
			self.getAll = function(callback) {
				callback.call(null, history);
			};
			
			self.add = function(tab) {
				var item = {
					url: tab.urlInput,
					label: tab.title,
					favicon: tab.favicon,
					faviconUrl: (tab.favicon ? tab.favicon.$$unwrapTrustedValue() : null),
					date: new Date(),
					index: (new Date()).getTime()
				};
								
				$.each(history, function(key, value) {
					if(value && ((value.url == item.url && value.date.getDay() == item.date.getDay() &&
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
			
			self.save = function() {
				localStorage.setItem('history', JSON.stringify(history));
			};
			
			self.clearAll = function() {
				$timeout(function(){
					while(history.pop());
					self.save();
				});
			};
		}
		
		return new SHistory();
	});
	
	app.service('SFavicon', function($timeout, $sce) {
		var SFavicon = function() {
			var self = this;
			
			var data = localStorage.getItem('favicons');
			var favicons;
			
			if(!data) {
				favicons = {};
			} else {
				favicons = JSON.parse(data);
				
				$.each(favicons, function(key, item) {
					item.date = new Date(item.date);
				});
			}
			
			self.get = function(pageUrl) {
				return favicons[pageUrl];
			}
			
			self.set = function(pageUrl, faviconUrl) {
				favicons[pageUrl] = {
					pageUrl: pageUrl,
					faviconUrl: faviconUrl,
					date: new Date()
				};
				self.save();
			}
			
			self.save = function() {
				localStorage.setItem('favicons', JSON.stringify(favicons));
			};
		}
		
		return new SFavicon();
	});
	
	app.service('SPinnedTab', function($timeout, $sce) {
		var SPinnedTab = function() {
			var self = this;
			
			var data = localStorage.getItem('pinnedTabs');
			var pinnedTabs;
			
			if(!data) {
				pinnedTabs = {};
			} else {
				pinnedTabs = JSON.parse(data);
			}
			
			self.getAll = function() {
				return pinnedTabs;
			}
			
			self.setAll = function(tabs) {
				pinnedTabs = [];
				$.each(tabs, function(key, tab) {
					if(tab.pinned) {
						pinnedTabs.push({
							url: tab.urlInput,
							favicon: (tab.favicon?tab.favicon.$$unwrapTrustedValue():null)
						});
					}
				})
				self.save();
			}
			
			self.save = function() {
				localStorage.setItem('pinnedTabs', JSON.stringify(pinnedTabs));
			};
		}
		
		return new SPinnedTab();
	});
	
	/* Filters */
	
	
	/* Directives */
	
	
	/* Controllers */
	
    
    /// Title bar
	
	app.controller('CWindowTitleBar', function($scope) {
		
	});
    
    
    
	/// Main UI
	
	app.controller('CMainUi', function($scope, $sce, $timeout, SNetwork, SBookmark, SHistory, SFavicon, SPinnedTab) {
		
		var win = gui.Window.get();
		
		$scope.userAgent = "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0 Nux/0.1";
		
		$scope.favorites = [
			
		];
		
		SBookmark.getAll(function(list) {
			$timeout(function(){
				$scope.favorites = list;
			});
		});
		
		$scope.history = [
			
		];
		
		SHistory.getAll(function(list) {
			$timeout(function(){
				$scope.history = list;
			});
		});
		
		$scope.downloads = [
			{
				name: "icon.png",
				progress: 0.3,
				time: "3s"
			},
			{
				name: "wallpaper-1920x1080.jpg"
			},
			{
				name: "wode-webkit.zip"
			}
		];
		
		$scope.tabs = [
			
		];
		
		
		$scope.currentTab = $scope.tabs[0];
		
		//var tabWindow = $('.webpage')[0].get(0).contentWindow;
		
		$scope.openUrl = function(tab, url) {
			if (url.indexOf("://") == -1 && url.indexOf(".") == -1) {
				url = "https://duckduckgo.com?q=" + url;
			}

			if (url.indexOf('://') == -1) {
				url = 'http://' + url;
			}
			console.log('open ' + url);
			//$('#webpage').attr('src', url);
			
			$timeout(function() {
				tab.url = $sce.trustAsResourceUrl(url);
				tab.urlInput = url;
				tab.title = "Chargement...";

				$scope.displayNoFavicon(tab);
				
				if(tab === $scope.currentTab) {
					$scope.updateAdressFake(url);
					$scope.closeLaunchpad();
				}
			});
			
			$('#urlInput').blur();
		};

		var oldUrl = null, oldDomain = null, oldTitle = null;

		function checkAdressChange() {
			if($scope.currentTab.window) {
				var location = $scope.currentTab.window.location;
				if (location && location.href != oldUrl) {
					oldUrl = location.href;
					oldTitle = $scope.currentTab.window.document.title;
					console.log("location changed: " + oldUrl);

					$timeout(function() {
						$scope.updateAdressBar(location);
						$scope.currentTab.bookmarked = (SBookmark.getByUrl($scope.currentTab.urlInput) != null);
						$scope.currentTab.title = $scope.currentTab.window.document.title;

						if(location.origin != oldDomain) {
							$scope.displayNoFavicon($scope.currentTab);
						}
					});

					oldDomain = location.origin;
				} else if($scope.currentTab.window.document && oldTitle != $scope.currentTab.window.document.title) {
					$timeout(function() {
						oldTitle = $scope.currentTab.window.document.title;
						$scope.currentTab.title = $scope.currentTab.window.document.title;
						$scope.currentTab.historyItem = SHistory.add($scope.currentTab);
					});
				}
			}
		}

		setInterval(checkAdressChange, 200);

		$scope.updateAdressBar = function(location) {
			var url = location.href;
			$scope.currentTab.urlInput = url;
			$scope.updateAdressFake(url);
			
			win.title = "Nux - " + $scope.currentTab.title;
		};

		$scope.updateAdressFake = function(url){
			var reg = /([a-z]+:\/\/)([a-z0-9_%.-]+)(\/?.*)/i;
			url = url.match(reg);
			if(url) {
				$scope.currentTab.fakeUrl = {
					prefix: url[1],
					domain: url[2],
					suffix: url[3]
				};
			}
		};

		$scope.updateFavicon = function(tab) {
			//console.log(window);
			var window = tab.window;
			if(window) {
				
				var iconUrl = null, rel;
				
				/*if(window.location) {
					var favicon = SFavicon.get(window.location.origin);
					if(favicon && favicon.date.getTime() > (new Date()).getTime() - 1000 * 3600 * 24 * 2) { // 2 jours
						iconUrl = favicon.faviconUrl;
					}
				}*/
				
				if(window.document) {
					var links = window.document.getElementsByTagName('link');
					//console.log(links);
					$.each(links, function(key, value) {
						rel = value.getAttribute('rel');
						if(rel) {
							rel = rel.toLowerCase();
						}
						if(rel == 'icon' || rel == 'shortcut icon') {
							iconUrl = value.getAttribute('href');
							return false;
						}
					});

					if(iconUrl && iconUrl.charAt(0) == '/') {
						iconUrl = window.location.origin + iconUrl;
					}

					console.log("icon", iconUrl);
				}

				if(iconUrl) {
					SNetwork.tryUrl(iconUrl, function () {
						$scope.displayFavicon(tab, iconUrl);
					}, function () {
						$scope.tryDefaultFavicon(tab);
					}, true);
				} else {
					$scope.tryDefaultFavicon(tab);
				}
			}
		};

		$scope.tryDefaultFavicon = function(tab) {

			var iconUrl;
			
			if(tab.window.location) {
				iconUrl = tab.window.location.origin + "/favicon.ico";
			} else {
				iconUrl = tab.urlInput + "/favicon.ico";
			}

			console.log(iconUrl);

			var img = $('#faviconImg');

			SNetwork.tryUrl(iconUrl, function () {
				$scope.displayFavicon(tab, iconUrl);
			}, function () {
				if(tab.window.location) {
					iconUrl = tab.window.location.origin + "/favicon.png";
				} else {
					iconUrl = tab.urlInput + "/favicon.png";
				}

				SNetwork.tryUrl(iconUrl, function () {
					$scope.displayFavicon(tab, iconUrl);
				}, function () {
					$scope.displayNoFavicon(tab);
				}, true);
			}, true);

		};

		$scope.displayNoFavicon = function(tab) {
			$timeout(function() {
				tab.favicon = null;
			});
		};

		$scope.displayFavicon = function(tab, iconUrl) {
			$timeout(function() {
				tab.favicon = $sce.trustAsUrl(iconUrl);
				/*if(tab.window.location) {
					SFavicon.set(tab.window.location.origin, iconUrl);
				}*/
				if(tab.historyItem) {
					tab.historyItem.favicon = tab.favicon;
					tab.historyItem.faviconUrl = tab.favicon.$$unwrapTrustedValue();
				}
				SHistory.save();
			});
		};
		
		/* Actions */

		$scope.back = function() {
			$scope.currentTab.window.history.back();
			$scope.closeLaunchpad();
		};

		$scope.forward = function() {
			$scope.currentTab.window.history.forward();
			$scope.closeLaunchpad();
		};

		$scope.refresh = function(tab) {
			if(tab == undefined) {
				tab = $scope.currentTab;
			}
			tab.window.location.reload();
			$scope.closeLaunchpad();
		};

		$scope.openLaunchpad = function() {
			$('.browser--frame').addClass('dim');
			$('.browser--launchpad').removeClass('hidden');

			// Flash fix
			if($scope.currentTab.window) {
				var elems = $scope.currentTab.window.document.getElementsByTagName('embed');
				$.each(elems, function(key, elem) {
					elem.style.visibility = "hidden";
				});
			}
		};

		$scope.closeLaunchpad = function() {
			$('.browser--frame').removeClass('dim');
			$('.browser--launchpad').addClass('hidden');

			// Flash fix
			if($scope.currentTab.window) {
				var elems = $scope.currentTab.window.document.getElementsByTagName('embed');
				$.each(elems, function(key, elem) {
					elem.style.visibility = "visible";
				});
			}
		};
		
		$scope.bookmark = function() {
			SBookmark.toggle($scope.currentTab);
		};
		
		$scope.historyClearAll = SHistory.clearAll;
		
		$scope.addon = function() {
			
			$scope.closeLaunchpad();
		};
		
		$scope.help = function() {
			
			$scope.closeLaunchpad();
		};
		
		$scope.settings = function() {
			
			$scope.closeLaunchpad();
		};
		
		$scope.showSource = function() {
			
			$scope.closeLaunchpad();
		};
		
		$scope.openDevTools = function() {
			var iframe = $('.browser--frame .webpage.current').get(0);
			
			win.showDevTools(iframe);
			
			$scope.closeLaunchpad();
		};
		
		$scope.openAppDevTools = function() {
			win.showDevTools();
		};
		
		$scope.reloadWindow = function() {
			win.reloadDev();
		};
		
		$scope.minimizeWindow = function() {
			win.minimize();
		};
		
		$scope.maximizeWindow = function() {
			if(!$scope.windowIsMaximized) {
				win.maximize();
			} else {
				win.unmaximize();
			}
		};
		
		$scope.closeWindow = function() {
			win.close();
		};
		
		/* Keyboard shortcuts */
		
		
		
		/* Url input */

		$('#urlInput').keyup(function (evt) {
			var e = $(evt.currentTarget);
			switch(evt.which) {
				case 13:
					if($scope.currentTab.urlInput && $scope.currentTab.urlInput.length > 0) {
						$scope.openUrl($scope.currentTab, $scope.currentTab.urlInput);
					}
					break;
				case 27: 
					var window = $('#webpage').get(0).contentWindow;
					if(window) {
						$scope.updateAdressBar(window.location);
					}
					break;
			}
		});

		var urlInputFocus = false;

		$('#urlInput').click(function(evt) {
			var e = $(evt.currentTarget);
			if(!urlInputFocus) {
				urlInputFocus = true;
				e.select();
			}
		});

		$('#urlInput').focusin(function(evt) {
			$scope.openLaunchpad();
			$('#urlInput').removeClass('hidden');
			$('#urlInputFake').addClass('hidden');
		});

		$('#urlInput').focusout(function(evt) {
			urlInputFocus = false;
			this.selectionStart = this.selectionEnd = -1;
			$scope.updateAdressFake($('#urlInput').val());
			$('#urlInput').addClass('hidden');
			$('#urlInputFake').removeClass('hidden');
		});
		
		/* Tabs */
		
		$scope.onTabLoad = function(tab) {
			tab.title = tab.window.document.title;
			$scope.updateFavicon(tab);
		};
		
		$scope.onTabDocumentReady = function(tab) {
			
			var window = tab.window;
			
			$timeout(function() {
				if(tab == $scope.currentTab) {
					$scope.updateAdressBar(window.location);
				}
				
				tab.title = window.document.title;
				tab.historyItem = SHistory.add(tab);
				$scope.updateFavicon(tab);
			});
			
		};
		
		$scope.selectTab = function(tab) {
			$scope.currentTab = tab;
			if(tab.window) {
				$scope.updateAdressBar(tab.window.location);
			}
			$scope.closeLaunchpad();
		};
		
		$scope.addTab = function(tab) {
			if(tab == undefined) {
				tab = {
					url: null,
					urlInput: 'duckduckgo.com',
					fakeUrl: null,
					favicon: null,
					title: null,
					bookmarked: false,
					historyItem: null
				};
			}
			$scope.tabs.push(tab);
			$scope.selectTab(tab);
			$scope.closeLaunchpad();
		};
		
		$scope.openTab = function(sourceTab, afterTab, url, autoSelect) {
			$timeout(function() {
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

				var l = $scope.tabs.length;

				// Insert after last pinned tab
				if(afterTab.pinned) {
					for(var i = 0; i < l; i++) {
						if(!$scope.tabs[i].pinned) {
							index = i - 1;
							break;
						}
					}

				} else {
					// Insert after source tab
					index = $scope.tabs.indexOf(afterTab);
				}

				if(index == -1) {
					index = l - 1;	
				}
				
				sourceTab.lastChildrenTab = tab;
				tab.parentTab = sourceTab;

				$scope.tabs.splice(index + 1, 0, tab);

				if(autoSelect) {
					$scope.selectTab(tab);
				}

				$scope.closeLaunchpad();
			});
			
		};
		
		$scope.closeTab = function(tab) {
			if($scope.tabs.length > 1) {
				var index = $scope.tabs.indexOf(tab);
				var i = index - 1;
				if(index == 0){
					i = 1;
				}
				$timeout(function() {
					$scope.selectTab($scope.tabs[i]);
				});
				tab.close();
				
				$timeout(function() {
					$scope.tabs.splice(index, 1);
				}, 300);
			}
		};
		
		$scope.pinTab = function(tab) {
			$timeout(function() {
				var index = $scope.tabs.indexOf(tab);
				if(index != -1) {
					$scope.tabs.splice(index, 1);
				}
				
				index = 0;
				var l = $scope.tabs.length;
				for(var i = 0; i < l; i++) {
					if($scope.tabs[i].pinned) {
						index = i + 1;
					}
				}
				
				$scope.tabs.splice(index, 0, tab);
				tab.pinned = true;
			});
		};
		
		$scope.unpinTab = function(tab) {
			$timeout(function() {
				var index = $scope.tabs.indexOf(tab);
				if(index != -1) {
					$scope.tabs.splice(index, 1);
				}
				
				index = 0;
				var l = $scope.tabs.length;
				for(var i = 0; i < l; i++) {
					if(!$scope.tabs[i].pinned) {
						index = i;
						break;
					}
				}
				
				$scope.tabs.splice(index, 0, tab);
				tab.pinned = false;
			});
		};
		
		$scope.moveTabTo = function(tab, position) {
			$timeout(function() {
				var index = $scope.tabs.indexOf(tab);
				if(index != -1) {
					$scope.tabs.splice(index, 1);
				}
				
				$scope.tabs.splice(position, 0, tab);
			});
		};
		
		/* Tab Menu */
		
		tabMenu.append(new gui.MenuItem({
			label: 'Actualiser',
			click: function(evt) {
				if(tabMenuTarget) {
					$scope.refresh(tabMenuTarget);
				}
			}
		}));
		
		tabMenu.append(tabMenuPinItem = new gui.MenuItem({ 
			label: 'Epingler',
			click: function(evt) {
				if(tabMenuTarget) {
					if(tabMenuTarget.pinned) {
						$scope.unpinTab(tabMenuTarget);
					} else {
						$scope.pinTab(tabMenuTarget);
					}
				}
			} 
		}));
		
		tabMenu.append(new gui.MenuItem({
			type: 'separator'
		}));
		
		tabMenu.append(new gui.MenuItem({
			label: 'Fermer',
			click: function(evt) {
				if(tabMenuTarget) {
					$scope.closeTab(tabMenuTarget);
				}
			}
		}));
		
		/* Window */
		
		$scope.windowIsMaximized = false;
		$scope.windowHasFocus = true;
		
		win.on('maximize', function() {
			$timeout(function() {
				$scope.windowIsMaximized = true;
			});
		});
		
		win.on('unmaximize', function() {
			$timeout(function() {
				$scope.windowIsMaximized = false;
			});
		});
		
		win.on('focus', function() {
			$timeout(function() {
				$scope.windowHasFocus = true;
			});
		});
		
		win.on('blur', function() {
			$timeout(function() {
				$scope.windowHasFocus = false;
			});
		});
		
		win.on('close', function() {
			SBookmark.save();
			SHistory.save();
			SPinnedTab.setAll($scope.tabs);
			SPinnedTab.save();
		});
		
		/* Pinned tabs */
		
		var pinnedTabs = SPinnedTab.getAll();
		$.each(pinnedTabs, function(key, tab) {
			$scope.addTab({
				url: null,
				urlInput: tab.url,
				fakeUrl: null,
				favicon: (tab.favicon?$sce.trustAsUrl(tab.favicon):null),
				title: null,
				bookmarked: false,
				historyItem: null,
				pinned: true
			});
		});
		
		/* Session restoration */
		
		$scope.addTab();
		
		// TODO
		
		/* Start animation */
		
		$('.browser--main-ui').removeClass('hidden');
		
	});
	
    
    /// Web Page
	
	app.controller('CWebPage', function($scope, $element, $timeout) {	
		
		// Element
		
		var element = $element[0];
		$scope.tab = $scope.$parent.tab;
		$scope.tab.iframeElement = $(element);
		var window = element.contentWindow;
		$scope.tab.window = window;
		
		// Load state management
		
		var oldState;
		
		function onLoad() {
			$scope.tab.loading = false;
			$scope.$parent.$parent.onTabLoad($scope.tab);
		}
		
		function onDocumentReadyStateChange() {
			var document = window.document;
			if(document) {
				if(document.readyState != oldState) {
					console.log($scope.tab.urlInput + ' ' + oldState + ' -> ' + document.readyState);
					oldState = document.readyState;

					if(document.readyState == "loaded" || document.readyState == "interactive" || document.readyState == "complete") {
						$scope.$parent.$parent.onTabDocumentReady($scope.tab);

						if(document.readyState == "complete") {
							$scope.tab.loading = false;
							$scope.$parent.$parent.onTabLoad($scope.tab);
						}
					}
				}
				
				if(document.readyState == "uninitialized" || document.readyState == "loading") {
					$scope.tab.loading = true;
					$scope.tab.title = "Chargement...";
				} else {
					$scope.tab.title = document.title;
				}
				
				if(document.getElementsByTagName('body')[0]) {
					handleClicks();
				}
			}
			
		}
		
		//document.addEventListener('readystatechange', onDocumentReadyStateChange);
		
		setInterval(onDocumentReadyStateChange, 200);
		
		window.addEventListener('load', onLoad);
		
		// Close
		
		$scope.tab.close = function() {
			$scope.tab.tabElement.addClass('closed');
			clearInterval(onDocumentReadyStateChange, 200);
			window.removeEventListener('load', onLoad);
		};
		
		// New tab opening
		
		function handleClicks() {
			$(element).contents().find('body').off('click', onBodyClick);
			$(element).contents().find('body').click(onBodyClick);
		}
		
		function onBodyClick(evt) {
			console.log('body click ', evt.which);
			
			if((evt.which == 1 && evt.ctrlKey) ||
			   evt.which == 2) {
				evt.stopPropagation();
				evt.preventDefault();

				var link = evt.target;
				
				if(link.tagName != "a") {
					
					var closestLink = $(link).closest('a');
					
					if(closestLink.length > 0) {
						link = closestLink[0];
					} else {
						link = null;
					}
					
				}
				
				if(link && link.href) {

					var afterTab = $scope.tab;

					if($scope.tab.lastChildrenTab) {
						afterTab = $scope.tab.lastChildrenTab;
					}

					$scope.$parent.$parent.openTab($scope.tab, afterTab, link.href, evt.shiftKey);
				}
				
				return false;
			}
		}
		
		// Startup page
		
		if($scope.tab.urlInput) {
			$scope.tab.loading = true;
			$scope.$parent.$parent.openUrl($scope.tab, $scope.tab.urlInput);
		}
		
	});
    
    
    
    /// Tab
		
	app.controller('CTab', function($scope, $element, $timeout) {	
		
		// Element
		
		var element = $element[0];
		$scope.tab = $scope.$parent.tab;
		$scope.tab.tabElement = $(element);
		
		$(element).click(function(evt) {
			if(evt.which == 2 && !$scope.tab.pinned) {
				$scope.$parent.$parent.closeTab($scope.tab);
			}
		});
		
		$(element).on('contextmenu', function(evt) {
			tabMenuTarget = $scope.tab;
			
			if($scope.tab.pinned) {
				tabMenuPinItem.label = 'Relâcher';
			} else {
				tabMenuPinItem.label = 'Epingler';
			}
			
			tabMenu.popup(evt.pageX, evt.pageY);
		});
		
	});
	
	
})();