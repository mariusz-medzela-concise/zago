$(document).ready(function(){

    // Simulate click action on touch screen tap (hopefully)
    // @BUG not sure if this is really working or not
    $('button#menuButton').on('tap', function(){ $(this).click(); });

    // function to display Modernizr classes (append to end of DOM)    
    function cssTester(){
        var HTMLclasses= $('html')[0].classList;
        var wrap = document.createElement('div');
        wrap.classList.add('tester_classes');
        for (var i = 0; HTMLclasses.length > i; i++) {
            var sect = document.createElement('div');
            sect.innerHTML = HTMLclasses[i];
            wrap.appendChild(sect);
        };
        document.body.appendChild(wrap);
    };

    // cssTester();   

});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var app = angular.module('app', ['ui.router', 'ngSanitize', 'duScroll']);

app.config(['$stateProvider', '$urlRouterProvider', '$locationProvider',
    function($stateProvider , $urlRouterProvider, $locationProvider) {

        $urlRouterProvider.otherwise('/');

        $stateProvider
        .state('home', { 
            url: '/',
            templateUrl: 'partials/home.html',
            controller: 'HomeCtrl'
        })
        .state('projects', { 
            url: '/projects',
            templateUrl: 'partials/projects.html',
            controller: 'ProjectsCtrl'
        })
        .state('project', {
            url: '/projects/:project',
            templateUrl: 'partials/project.html',
            controller: 'ProjectDetailCtrl'
        })
        .state('team', { 
            url: '/team',
            templateUrl: 'partials/team.html',
            controller: 'TeamCtrl'
        })
        .state('love', { 
            url: '/zagolovesyou',
            templateUrl: 'partials/love.html',
            controller: 'LoveCtrl'
        })
        .state('error', { 
            url: '/error',
            templateUrl: 'partials/error.html',
            controller: 'ErrorCtrl'
        })
        .state('legacy', { 
            url: '/legacy',
            templateUrl: 'partials/legacy.html',
            controller: 'LegacyCtrl'
        });

        $locationProvider.html5Mode(true);
}]);

app.run(function($rootScope, $state, SiteLoader, Storage, Functions, $window) {

    $rootScope.$on('$stateChangeStart', function(event, to, toParams, from, fromParams){


        
        // If the Site Data is missing, stop navigation and retreive data
        // Cache timer for Storage (24hrs: 86400000 1hr: 3600000 1min: 60000)
        //////////////////////////////////////////////////////////////////////////
        var newTimestamp = new Date().getTime();
        // Set Time of User Entry (default to 24hr reset)
        Storage.dailyTimestamp = (Storage.dailyTimestamp && Storage.dailyTimestamp > (newTimestamp - 86400000)) ? Storage.dailyTimestamp : newTimestamp;
        // If the Storage Site object is empty or older than X, reload Wordpress data tree (default to 1hr reset)
        if (!Storage.site || !Storage.dataTimestamp || (Storage.dataTimestamp < newTimestamp - 3600000)) {
            event.preventDefault();
            SiteLoader.getRawData().then(function(data){
                var site, posts;
                // If object returned is some fucked up IE shit (ie String), parse it
                site = data.responseText || data.data;
                if (typeof site == 'string') { site = JSON.parse(site); }
                // Get & Store Posts Tree
                posts = SiteLoader.getPosts(site);
                Storage.site = JSON.stringify(posts);
                Storage.dataTimestamp = newTimestamp;
                $rootScope.site = posts;

                // Continue to Destination
                $state.go(to.name, toParams);
            });
        }

        // Remove page-specific event listeners
        Functions.removeListeners();
        
    });

    $rootScope.$on( "$stateChangeSuccess", function(event, to, toParams, from, fromParams) {


    });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Factories / Services / Directives
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.factory('Storage', function(){
    var db = window.localStorage;
    // Test that LocalStorage works, return Angular object if disabled
    // @BUG this needs to be much more extensive (search for existing Angular storage factory/service)
    try {
        db.testKey = '1';
        delete db.testKey;
        return db; }
    catch (error) {
        return {}; }
});

app.factory('SiteLoader', function($http, $q, $rootScope){

    // Wordpress API call for site post data
    var reqUrl = 'http://admin.zagollc.com/wp-json/posts?filter[posts_per_page]=1000';

    // Custom sorter function to arrange post tree via 'order' property
    function sorter(a,b) {
        if ( a.order < b.order ) return -1;
        if ( a.order > b.order ) return 1;
        return 0;
    }

    return {
        // Call for Site Data, when a promise
        'getRawData' : function(){

            // $rootScope.isLoading = true; // @LOADER

            var deferred = $q.defer();
            // If some fucked up IE feature exists, use it
            if(window.XDomainRequest){
                var xdr = new XDomainRequest();
                xdr.open("get", reqUrl);
                xdr.onprogress = function () { };
                xdr.ontimeout = function () { };
                xdr.onerror = function () { };
                xdr.onload = function() {
                  deferred.resolve(xdr);                  
                }
                setTimeout(function () {xdr.send();}, 0);
            // Otherwise, use implementation of every other browser in existence
            } else {
                deferred.resolve($http.get(reqUrl));
            }
            return deferred.promise;
        },

        // Parse raw site data into data tree to be used with App
        'getPosts' : function(rawData){

            console.log(rawData);

            function ternValue(object, i) {
                if (i) {
                    var index = i || 0;
                    return object ? object[index] : null; }
                else {
                    return object ? object : null; }
            }

            function splitCSV(str) {
                // Remove whitespace and split by ','
                var arr = str.replace(/, /g,',').split(",");

                // Remove empty pieces
                for(var i = arr.length; i >= 0; i--) {
                    if(arr[i] === ""){
                        arr.splice(i, 1);
                    }
                }

                return arr;
            };

            function aspectRatio(width, height){
                return (height / width);
            }

            // Structure Site Posts object 
            function postTree(Site){
                var tree = {
                    'home' : {
                        'blurb' : [],
                        'banners' : [],
                        'sections': [],
                        'images': [],
                        'preloaded': false
                    },
                    'project': {
                        'blurb' : [],
                        'projects': [],
                        'images': [],
                        'preloaded': false
                    },
                    'team' : {
                        'blurb': [],
                        'members': [],
                        'images': [],
                        'preloaded': false
                    }
                };

                // Categorize Posts into Site object
                for (var i = 0; Site.length > i; i++) {
                    // Assign Current Post to variable
                    var post = Site[i];

                    // Check if Post has been given 2 Categories (bad)
                    if (post.terms.category.length == 1 && post.status == 'publish') {

                        // General temp Post Object
                        var temp = {
                            'id' : post.ID,
                            'title' : ternValue(post.title),
                            'order' : ternValue(post.acf.arrangement),
                            'body' : post.acf.content ? post.acf.content : post.content,
                            'content' : { }
                        };
                        
                        var images = [];

                        // Populate temp Post Object according to Post Type
                        //////////////////////////////////////////////////////////////////////////////
                        if (post.terms.category[0].slug == 'home-hero-banner') {
                            
                            temp.content = {
                                'banner_caption' : ternValue(post.acf.banner_caption),
                                'images' : []
                            };

                            for (var h = 0; post.acf.banner_images.length > h; h++) {
                                var obj = {
                                    'url' : post.acf.banner_images[h].image.url,
                                    'alt' : ternValue(post.acf.banner_images[h].alt),
                                    'order' : ternValue(post.acf.banner_images[h].arrangement),
                                    'position' : ternValue(post.acf.banner_images[h].positioning),
                                    'aspectRatio' : aspectRatio(post.acf.banner_images[h].image.width, post.acf.banner_images[h].image.height)
                                }

                                temp.content.images.push(obj);
                                tree.home.images.push(obj.url);
                            }

                            tree.home.banners.push(temp);
                            continue;
                        }

                        if (post.terms.category[0].slug == 'home-section' && tree.home.sections.length < 4) {
                            temp.content = {
                                'id' : ternValue(post.acf.banner_image.id),
                                'alt' : ternValue(post.acf.banner_image.alt),
                                'url': ternValue(post.acf.banner_image.url),
                                'caption' : ternValue(post.acf.banner_caption),
                                'position' : ternValue(post.acf.positioning),
                                'aspectRatio' : aspectRatio(post.acf.banner_image.width, post.acf.banner_image.height)
                            };

                            tree.home.images.push(temp.content.image_url);
                            tree.home.sections.push(temp);
                            continue;
                        }

                        if (post.terms.category[0].slug == 'home-blurb') {
                            temp.body = ternValue(post.content);

                            tree.home.blurb.push(temp);
                            continue;
                        }

                        if (post.terms.category[0].slug == 'projects-blurb') {
                            temp.body = ternValue(post.content);

                            tree.project.blurb.push(temp);
                            continue;
                        }

                        if (post.terms.category[0].slug == 'project') {

                            temp.content = {
                                'case_study' : post.acf.case_study,
                                'client' : ternValue(post.acf.client),
                                'services' : ternValue(splitCSV(post.acf.services)),
                                'project' : ternValue(splitCSV(post.acf.project)),
                                'other_details' : ternValue(post.acf.other_details),
                                'project_url' : ternValue(post.acf.project_url),
                                'social_media' : ternValue(post.acf.social_media),
                                'read_about' : ternValue(post.acf.read_about),
                                'related_projects' : ternValue(post.acf.related_projects),
                                'featured_image' : {},
                                'image_sections' : [],
                                'images' : []
                            };

                            for ( var q = 0; temp.content.other_details.length > q; q++){
                                temp.content.other_details[q].details = splitCSV(temp.content.other_details[q].details);
                            }

                            // Get project images outside of repeater array                       
                            if (post.acf.images && post.acf.images.length) {
                                for (var d = 0; post.acf.images.length > d; d++) {
                                    var obj = {
                                        'url' : post.acf.images[d].image.url,
                                        'alt' : post.acf.images[d].image.alt,
                                        'label' : post.acf.images[d].label,
                                        'order' : post.acf.images[d].arrangement,
                                        'half' : post.acf.images[d].half,
                                        'position' : ternValue(post.acf.images[d].positioning),
                                        'aspectRatio' : aspectRatio(post.acf.images[d].image.width, post.acf.images[d].image.height)
                                    };

                                    // Skip first image (featured image)
                                    if (d > 0) { temp.content.image_sections.push(obj); }
                                    else { temp.content.featured_image = obj; }

                                    temp.content.images.push(obj);
                                }
                            }

                            tree.project.images.push(temp.content.featured_image.url);
                            tree.project.projects.push(temp);
                            // Sort projects object via arrangement parameter
                            tree.project.projects.sort(sorter);

                            continue;
                        }

                        if (post.terms.category[0].slug == 'team-blurb') {
                            temp.body = ternValue(post.content);

                            tree.team.blurb.push(temp);
                            continue;
                        }

                        if (post.terms.category[0].slug == 'team-member') {
                            temp.content = {
                                'position' : ternValue(post.acf.position),
                                'accounts' : ternValue(post.acf.accounts),
                                'featured_image' : (post.acf.profile_picture && post.acf.profile_picture.url) ? post.acf.profile_picture.url : null,
                                'funny_picture' : (post.acf.funny_picture && post.acf.funny_picture.url) ? post.acf.funny_picture.url : null,
                                'images' : {
                                    'featured' : post.acf.profile_picture,
                                    'funny'    : post.acf.funny_picture
                                }
                            };

                            tree.team.images.push(temp.content.featured_image);
                            temp.content.funny_picture ? tree.team.images.push(temp.content.funny_picture) : '';
                            
                            tree.team.members.push(temp);
                            continue;
                        }
                    }
                }

                // Retrieve and Store each project's Related Projects info
                // For each project in Site Tree once tree has been compiled
                var projects = tree.project.projects;
                for (var o = 0; projects.length > o; o++) {
                    var related = projects[o].content.related_projects || [];
                    var details = [];
                    // For each Related Project of currently selected project
                    for (var p = 0; related.length > p; p++) {
                        // Loop thru each project again and find ID match
                        for (var r = 0; projects.length > r; r++) {
                            if (related[p] == projects[r].id) {
                                var obj = {
                                    'id' : projects[r].id,
                                    'title' : projects[r].title,
                                    'client' : projects[r].content.client,
                                    'image' : projects[r].content.featured_image
                                };
                                details.push(obj);
                                projects[o].content.images.push(obj.image.url);
                                break;
                    }   }   }
                    // Assign/Push new Related Pojects obj into tree
                    projects[o].content.related_projects = details;
                }
                console.log(tree);
                return tree;
            };

            $rootScope.isLoading = false;
            return postTree(rawData);
        }
    }
});

app.factory('Styling', function(){
    var div = document.createElement('style');
    div.id = "stylesheet";
    div.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(div);

    return {
        'add' : function(str){ div.innerHTML = div.innerHTML.concat(str); },
        'clear' : function(){ div.innerHTML = ''; }
    }
});

app.factory("Preloader", function( $q, $rootScope, $timeout, Storage ) {

    //////////////////////////////////////////////////////////////////////
    // Custom function to preload array of images [internet find]
    //////////////////////////////////////////////////////////////////////

    Preloader.preload = function( images ) {
        return;  // @LOADER
        // Track whether css transition timing has had chance to finish
        //////////////////////////////////////////////////////////////////////
        var transitionComplete = false;
        var transitionTiming = 750; // CSS transition timing (500ms)
        $timeout(function(){ transitionComplete = true; }, transitionTiming);

        function checkTransition(wasSuccessful) {
            if (transitionComplete) { 
                $rootScope.isLoading = false;
                $rootScope.isSuccessful = wasSuccessful;
                $rootScope.$emit('$viewContentLoaded');

            } else { $timeout(function(){ checkTransition(wasSuccessful); }, 50); }
        };

        if (images.length) {
            // I keep track of the state of the loading images.
            $rootScope.isLoading = true;
            $rootScope.isSuccessful = false;
            $rootScope.percentLoaded = 0;
            console.log('Preloading Images');

            // Preload the images; then, update display when returned.
            // Trigger Angular's onload/compile event upon completion ($emit -> $viewContentLoaded)
            this.preloadImages( images ).then(
                function handleResolve( imageLocations ) {

                    // Loading was successful.
                    checkTransition(true);

                    console.log('Preloading Complete');
                },
                function handleReject( imageLocation ) {

                    // Loading failed on at least one image.
                    checkTransition(false);

                    console.log('Preloading Rejected');

                },
                function handleNotify( event ) {

                    $rootScope.percentLoaded = event.percent;

                    console.info( "Percent loaded:", event.percent );

                }
            );
        }

    };

    // I manage the preloading of image objects. Accepts an array of image URLs.
    function Preloader( imageLocations ) {

        // I am the image SRC values to preload.
        this.imageLocations = imageLocations;

        // As the images load, we'll need to keep track of the load/error
        // counts when announing the progress on the loading.
        this.imageCount = this.imageLocations.length;
        this.loadCount = 0;
        this.errorCount = 0;

        // I am the possible states that the preloader can be in.
        this.states = {
            PENDING: 1,
            LOADING: 2,
            RESOLVED: 3,
            REJECTED: 4
        };

        // I keep track of the current state of the preloader.
        this.state = this.states.PENDING;

        // When loading the images, a promise will be returned to indicate
        // when the loading has completed (and / or progressed).
        this.deferred = $q.defer();
        this.promise = this.deferred.promise;

    }


    // ---
    // STATIC METHODS.
    // ---


    // I reload the given images [Array] and return a promise. The promise
    // will be resolved with the array of image locations.
    Preloader.preloadImages = function( imageLocations ) {

        var preloader = new Preloader( imageLocations );

        return( preloader.load() );

    };


    // ---
    // INSTANCE METHODS.
    // ---


    Preloader.prototype = {

        // Best practice for "instnceof" operator.
        constructor: Preloader,


        // ---
        // PUBLIC METHODS.
        // ---


        // I determine if the preloader has started loading images yet.
        isInitiated: function isInitiated() {

            return( this.state !== this.states.PENDING );

        },


        // I determine if the preloader has failed to load all of the images.
        isRejected: function isRejected() {

            return( this.state === this.states.REJECTED );

        },


        // I determine if the preloader has successfully loaded all of the images.
        isResolved: function isResolved() {

            return( this.state === this.states.RESOLVED );

        },


        // I initiate the preload of the images. Returns a promise.
        load: function load() {

            // If the images are already loading, return the existing promise.
            if ( this.isInitiated() ) {

                return( this.promise );

            }

            this.state = this.states.LOADING;

            for ( var i = 0 ; i < this.imageCount ; i++ ) {

                this.loadImageLocation( this.imageLocations[ i ] );

            }

            // Return the deferred promise for the load event.
            return( this.promise );

        },


        // ---
        // PRIVATE METHODS.
        // ---


        // I handle the load-failure of the given image location.
        handleImageError: function handleImageError( imageLocation ) {

            this.errorCount++;

            // If the preload action has already failed, ignore further action.
            if ( this.isRejected() ) {

                return;

            }

            this.state = this.states.REJECTED;

            this.deferred.reject( imageLocation );

        },


        // I handle the load-success of the given image location.
        handleImageLoad: function handleImageLoad( imageLocation ) {

            this.loadCount++;

            // If the preload action has already failed, ignore further action.
            if ( this.isRejected() ) {

                return;

            }

            // Notify the progress of the overall deferred. This is different
            // than Resolving the deferred - you can call notify many times
            // before the ultimate resolution (or rejection) of the deferred.
            this.deferred.notify({
                percent: Math.ceil( this.loadCount / this.imageCount * 100 ),
                imageLocation: imageLocation
            });

            // If all of the images have loaded, we can resolve the deferred
            // value that we returned to the calling context.
            if ( this.loadCount === this.imageCount ) {

                this.state = this.states.RESOLVED;

                this.deferred.resolve( this.imageLocations );

            }

        },


        // I load the given image location and then wire the load / error
        // events back into the preloader instance.
        // --
        // NOTE: The load/error events trigger a $digest.
        loadImageLocation: function loadImageLocation( imageLocation ) {

            var preloader = this;

            // When it comes to creating the image object, it is critical that
            // we bind the event handlers BEFORE we actually set the image
            // source. Failure to do so will prevent the events from proper
            // triggering in some browsers.
            var image = $( new Image() )
                .load(
                    function( event ) {

                        // Since the load event is asynchronous, we have to
                        // tell AngularJS that something changed.
                        $rootScope.$apply(
                            function() {

                                preloader.handleImageLoad( event.target.src );

                                // Clean up object reference to help with the
                                // garbage collection in the closure.
                                preloader = image = event = null;

                            }
                        );

                    }
                )
                .error(
                    function( event ) {

                        // Since the load event is asynchronous, we have to
                        // tell AngularJS that something changed.
                        $rootScope.$apply(
                            function() {

                                preloader.handleImageError( event.target.src );

                                // Clean up object reference to help with the
                                // garbage collection in the closure.
                                preloader = image = event = null;

                            }
                        );

                    }
                )
                .prop( "src", imageLocation )
            ;

        }

    };


    // Return the factory instance.
    return( Preloader );
});

app.factory("Functions", function( $q, $rootScope, $state, Preloader, Storage, $document, $timeout ) {
    
    //////////////////////////////////////////////////////////////////////
    // Methods, Properties and Values Used/Shared throughout entire site
    //////////////////////////////////////////////////////////////////////


    // Data Elements
    ////////////////////////////////////////////////////////////////
    var eventListeners = []; // Stor
    var preloadedImages = []; // Store preloaded pageView src's so image loading isn't repeatede page-specific eventListeners for removal in stateChange

    // DOM Elements
    ////////////////////////////////////////////////////////////////
    var dom = getDOM();

    function getDOM(){
        var dom = {
            'body' : document.body,
            'content' : document.getElementById('pageContent'),
            'footer' : document.getElementById('footer'),
            'menuBtn' : document.getElementById('menuButton'),
            'mainNav' : document.getElementById('mainNav'),
            'mainMenu' : document.getElementById('menuWrapper'),
            'sectionNav' : document.getElementById('sectionNav'),
            'scrollTopBtn' : document.getElementById('scrollTop'),
            'siteID' : document.getElementById('siteID'),
            'prompt' : document.getElementById('menuPrompt')
        };

        return dom;
    };

    $rootScope.$on('$viewContentLoaded', function(){
        // Checks to see that image preloading isn't still processing
        if (!$rootScope.isLoading) {
            dom = getDOM();
            checkPrompt();
        }
    });

    // Helper Functions
    ////////////////////////////////////////////////////////////////

    function prevent(e){ 
        e.preventDefault();
    };

    function stopProp(e){ 
        e.stopPropagation();
    };

    function reloadSite(){
        setTimeout(function(){
            Storage.clear();
            location.reload();
            return;
        }, 100);
    };

    function checkPrompt(){
        // If user hasn't been prompted/clicked the menu, show prompt (else hide)
        if (!Storage.prompted) { 
            dom.prompt.classList.remove('bounce');
            $timeout(function(){ dom.prompt.classList.add('bounce'); }); // $timeout to let class removal trigger first
        } else { hidePrompt(); }
    };

    function hidePrompt(){
        // Function to hide menuPrompt
        dom.prompt.classList.add('hiding');
        setTimeout(function(){
            dom.prompt.classList.add('hidden');
        }, 500);
    };

    // AAAAARRRRRRGHGHGHGHGGHGH
    // // @BUG
    // function disableScroll(set){
    //     if (set) {
    //         dom.body.classList.add('hidden');
    //         dom.body.addEventListener('touchmove', prevent, true);
    //         // dom.mainNav.addEventListener('touchmove', stopProp);
    //         $(dom.body).css('height', window.innerHeight+'px');
    //     } else {
    //         dom.body.classList.remove('hidden');
    //         dom.body.removeEventListener('touchmove', prevent, true);
    //         // dom.mainNav.removeEventListener('touchmove', stopProp);
    //         $(dom.body).css('height', '');
    //     }
    // };

    // Object Menthods
    ////////////////////////////////////////////////////////////////
    return {
    
        'checkPrompt' : checkPrompt,

        'hidePrompt' : hidePrompt,

        'reloadSite' : reloadSite,

        // 'disableScroll' : disableScroll,

        'anchorTo' : function(anchor) {
                var elem = document.getElementById(anchor);
                var menuHeight = dom.sectionNav.scrollHeight;
                $document.scrollToElement(elem, menuHeight, '500');
            },

        'hideAppElements' : function(){
            dom.siteID.style.display = 'none';
            dom.mainNav.style.display = 'none';
            dom.menuBtn.style.display = 'none';
            dom.prompt.style.display = 'none';
            dom.footer.style.display = 'none';
            },

        'preloadImages' : function(posts, src) {
                // @BUG this function is only half-way thought out
                if (posts.images && !preloadedImages[src]) {
                    // Preload Images if first time, mark preloaded in local array
                    Preloader.preload(posts.images);
                    preloadedImages[src] = true;
                }
            },

        'route' : function(route, turnOff, params) {

                var params = params || {};
                var menuOpen = dom.mainNav.classList.contains('menu-open');
                this.toggleMenu(turnOff);

                // if route is different, or params are different (stringified object comparison), then route to new destination
                if ($state.current.name != route || JSON.stringify($state.params) != JSON.stringify(params)) {
                    // pause for menu animation if routing while menu was open [500ms menu animation, 50ms toggle delay]
                    if (menuOpen) { setTimeout(function(){ $state.go(route, params); }, 550); }
                    else { $state.go(route, params); }
                // If route is same as current view, scrollTop()
                } else { this.scrollTop(); }
            },

        'removeListeners' : function(){
                var arr = eventListeners;
                for (var i = 0; arr.length > i; i++) {
                    arr[i].obj.removeEventListener(arr[i].evt, arr[i].func, arr[i].bub)
                };
                eventListeners = [];
            },

        // Set page-specific event listener's
        //(removed @ $stateChangeStart by Functions.removeListeners)
        'setListener' : function(obj, evt, func, bub){
                obj.addEventListener(evt, func, bub);
                eventListeners.push({
                    'obj' : obj,
                    'evt' : evt,
                    'func': func,
                    'bub' : bub
                });
            },

        'setPageTitle' : function(str) {
                var headTitle = document.getElementsByTagName('title')[0];
                str = str ? (' | ' + str) : '';
                str = ' | Under Construction';
                headTitle.innerHTML = 'Zago' + str;
            },

        'showScroll' : function() {
                // @BUG onload dom timing isn't being caught properly
                if (window.pageYOffset > 200) { dom.scrollTopBtn.classList.add('show'); }
                else { dom.scrollTopBtn.classList.remove('show'); }
            },

        'scrollTop' : function() {
                $document.scrollTo(0, 0, 500);
            },

        'throttle' : function(fn, threshhold, scope) {
                threshhold || (threshhold = 250);
                var last, deferTimer;
                return function () {
                    var context = scope || this;
                    var now = +new Date,
                    args = arguments;
                    if (last && now < last + threshhold) {
                        // hold on to it
                        clearTimeout(deferTimer);
                        deferTimer = setTimeout(function () {
                            last = now;
                            fn.apply(context, args);
                        }, threshhold);
                    } else {
                        last = now;
                        fn.apply(context, args);
                    }
                };
            },

        'toggleMenu' : function(turnOff){

                // Delete tree if Shift key is pressed when menuButton clicked (hidden admin function)
                try {
                    if (event && event.shiftKey && event.target.id == 'menuButton') {
                        reloadSite();
                        return; } }
                catch (error) { }

                function close(){

                        dom.body.classList.remove('hidden');
                        setTimeout(function(){mainNav.classList.remove('menu-open')}, 50); // timeout for Firefox animation fix (pretty glitchy tho)
                        dom.menuBtn.classList.remove('menu-open');
                        dom.content.classList.remove('menu-open');
                        dom.content.removeEventListener('click', close, true); // (bug) Doesn't remove until content area is actually clicked
               
                };

                function open(){

                        setTimeout(function(){mainNav.classList.add('menu-open')}, 50); // timeout for Firefox animation fix (pretty glitchy tho)
                        dom.menuBtn.classList.add('menu-open');
                        dom.content.classList.add('menu-open');
                        dom.content.addEventListener('click', close, true);

                        // If first time user opens menu, hide menuPrompt
                        if (!Storage.prompted) {
                            Storage.prompted = true;
                            hidePrompt();
                        };
             
                };

                // Toggle Logic
                // If turnoff var true, and menu-open, close menu. if menu closed, do nothing
                // if turnoff var false, close menu if open, open if close
                if (turnOff) {
                    if (turnOff && dom.mainNav.classList.contains('menu-open')) {
                        close();
                    }
                } else {
                    if (dom.mainNav.classList.contains('menu-open')) { close(); }
                    else { open(); }
                }
            },

        'viewProject' : function(id){
                this.route('project', true, {'project':id});
            },

        'testFunction' : function(test){
                console.log(test || 'test');
            }
    }
});

////////////////////////////////////////////////////////////////////////////////////

// app.directive('grid', function($compile, $http, $templateCache) {

    //     function newDiv(classes) {
    //         var elem = document.createElement('div');
    //         elem.setAttribute('class', classes || '');

    //         return elem;
    //     };

    //     var getTemplate = function(contentType) {
    //         var baseUrl = '../pieces/';
    //         var templateMap = {
    //             members: 'team_section.html',
    //             projects: 'project_section.html'
    //         };

    //         var templateUrl = baseUrl + templateMap[contentType];
    //         var templateLoader = $http.get(templateUrl, {cache: $templateCache});

    //         return templateLoader;

    //     }

    //     var linker = function(scope, element, attrs) {

    //         function parseSections(sections, template){

    //             var wrapper = newDiv('directiveElement');
    //             var i, gridWrapper, gridSection, section;

    //             for(i = 0; sections.length > i; i++ ) {

    //                 section = newDiv('ngTemplate '+i); // dummy for sections[i] (ngTemplate)

    //                 // for Every 3 sections (or the first) create a new .grid div
    //                 if (i % 3 == 0) {  
    //                     gridSection = newDiv('grid');
    //                     // If its a new set of 6 (or the first)
    //                     if (i % 6 == 0) { 
    //                         // create new .gridWrapper and set .grid to .gridLeft
    //                         gridWrapper = newDiv('gridWrapper');
    //                         wrapper.appendChild(gridWrapper);
    //                         gridSection.classList.add('gridLeft');
    //                     // if its the second set of 3, just set .grid to .gridRight
    //                     } else { gridSection.classList.add('gridRight'); }

    //                     gridWrapper.appendChild(gridSection);
    //                 }

    //                 // Populate/link template data and append to wrap system
    //                 gridSection.appendChild(section);  
    //             };

    //             return wrapper;

    //         };

    //         // Retieve gridType and scope[sections] from element data attribute
    //         var gridType = element[0].dataset.grid;
    //         var sections = scope.$parent[gridType];
    //         var loader = getTemplate(gridType);

    //         var promise = loader.success(function(html) {
    //                     element.html(html);
    //             }).then(function (response) {
                    
    //                 console.log(element);
    //                 element.replaceWith($compile(element.html())(scope));
    //                 console.log(element);
    //             });

    //         // var promise = loader.success(function(html) {
    //         //         element.html(parseSections(sections, html, scope));
    //         //     }).then(function (response) {
                    
    //         //         console.log(element);
    //         //         element.replaceWith($compile(element.html())(scope));
    //         //         console.log(element);
    //         //     });
    //     };

    //     return {
    //         restrict: "E",
    //         link: linker,

    //         scope: {
    //             content:'='
    //         }
    //     };


    // });



app.directive('grid', function($compile) {

        // @BUG This is a really horrible directive to dynamically load the 6-box grid that's
        // used on the projects overview and team page. I could not figure out how to use
        // a modulo repeater function with an Angular template to dynamically produce the grid. This
        // was the best i could come up with at the time. It works, but it's ugly and i don't
        // like it.

        var data, view;
        var linker = function(scope, element, attrs) {
            switch(scope.$parent.pageView) {
                case 'projectsOverviewPage':
                    data = scope.$parent.projects;
                    view = 'projects';
                    break;
                case 'teamPage':
                    data = scope.$parent.members;
                    view = 'team';
                    break;
            }
            // Send to format function and append to element
            element.html(getTemplate(data));
            // Compile for Angular functionality
            $compile(element.contents())(scope);
            addEventListeners(scope);
        }

        var getTemplate = function(data){
            // Template strings
            var newWrapper = function(){
                var temp = document.createElement('div');
                switch(view) {
                    case 'projects':
                        temp.setAttribute('class', 'gridWrapper projectWrapper');
                        break;
                    case 'team':
                        temp.setAttribute('class', 'gridWrapper teamWrapper');
                        break;
                }

                return temp;
            }

            var newGrid = function(i){
                var grid = document.createElement('div');
                grid.setAttribute('class', 'grid');

                // Assign left or right depending on which group of 3
                if (i % 6 == 0) { grid.classList.add('gridLeft') }
                else { grid.classList.add('gridRight') }

                return grid;
            }

            var newSection = function(data){
                console.log(data);
                // Create Section element
                var sec = document.createElement('section');
                sec.setAttribute('data-id', data.id);
                // Create wrapper element for img & overlay
                var imgWrap = document.createElement('div');
                imgWrap.setAttribute('class', 'imgWrapper');
                // Create Img Element
                var img = document.createElement('img');
                img.setAttribute('ng-src', data.content.featured_image.url || data.content.featured_image); // @todo fix projects bug
                // Check and Add class for portrait images
                img.setAttribute('precision-image', true);
                if (data.content.featured_image.aspectRatio) { img.setAttribute('aspect-ratio', data.content.featured_image.aspectRatio); }
                if (data.content.featured_image.position) { 
                    var classes = data.content.featured_image.position;
                    for (var pos = 0; classes.length > pos; pos++) {
                        img.classList.add(classes[pos]);
                    };
                }

                imgWrap.appendChild(img);
                imgWrap.setAttribute('image-loader', true);
                if (data.content.funny_picture) {
                    var img2 = document.createElement('img');
                    img2.setAttribute('ng-src', data.content.funny_picture);
                    img.setAttribute('precision-image', true);
                    imgWrap.appendChild(img2);
                }
                // Create Overlay
                var ovrly = document.createElement('div');
                ovrly.setAttribute('class', 'overlay');
                // Create Title Elements
                var h2 = document.createElement('h2');
                h2.innerHTML = data.title;
                var h3 = document.createElement('h3');
                var h3Text;

                if (view === 'projects') {
                    h3Text = data.content.client;
                    imgWrap.appendChild(ovrly); }
                else if (view === 'team') {

                    h3Text =  data.content.position;

                    if (data.content.accounts && data.content.accounts.length) {

                        var account, anchor;
                        var socialList = document.createElement('ul');
                        socialList.setAttribute('class', 'socialButtons');

                        for (var d = 0; data.content.accounts.length > d; d++) {

                            var linkClass;
                            switch(data.content.accounts[d].account.toLowerCase()) {
                                case 'facebook':
                                    linkClass = 'fb_btn';
                                    break;
                                case 'twitter':
                                    linkClass = 'tw_btn';
                                    break;
                                case 'behance':
                                    linkClass = 'be_btn';
                                    break;
                                case 'pinterest':
                                    linkClass = 'pi_btn';
                                    break;
                                case 'linkedin':
                                    linkClass = 'li_btn';
                                    break;
                                case 'tumblr':
                                    linkClass = 'tr_btn';
                                    break;
                                case 'youtube':
                                    linkClass = 'yt_btn';
                                    break;
                                case 'mail':
                                    linkClass = 'ma_btn';
                                    break;
                                default:
                                    linkClass = 'ot_btn';
                            }

                            account = document.createElement('li');
                            account.setAttribute('class', 'anchorWrapper invert invertHover ' + linkClass);

                            anchor = document.createElement('a');
                            anchor.setAttribute('href', ((data.content.accounts[d].account.toLowerCase() == 'mail') ? 'mailto:' : '') + data.content.accounts[d].url);
                            anchor.setAttribute('target', '_blank');
                            account.appendChild(anchor);
                            socialList.appendChild(account);
                        }

                        imgWrap.appendChild(socialList);
                    }
                }

                h3.innerHTML = h3Text;

                // Append Section Elements together
                sec.appendChild(imgWrap);
                sec.appendChild(h2);
                sec.appendChild(h3);

                return sec;
            }


            var grid, wrapper;
            var allProjects = document.createElement('div');
            // Iterate thru tree, format template
            for (var i = 0; data.length > i; i++) {
                // Create new project section module
                var proj = newSection(data[i]);

                // Create grid if first of a new group of 3
                if (i % 3 == 0) {
                    // if already inside of a grid
                    if (grid) { wrapper.appendChild(grid); }
                    // Finsih last grid, create new one
                    grid = newGrid(i);
                    // Create wrapper if first of a new group of 6
                    if (i % 6 == 0) {
                        // if already inside of a wrapper
                        if (wrapper) { allProjects.appendChild(wrapper); }
                        wrapper = newWrapper(); 
                    }
                }

                // Attach section to grid if no new wrappers or grid are created
                grid.appendChild(proj);

                // Attach grid to wrapper if final loop iteration
                if (i == (data.length - 1)) {
                    wrapper.appendChild(grid);
                    allProjects.appendChild(wrapper);
                }
            };

            return allProjects;
        }

        function addEventListeners(scope){
            // Add a hover effect for the image overlay when img or headers are hovered over
            $('.projectWrapper .grid section > *').click(function(){
                var project;
                try {
                    project = this.parentNode.dataset.id;
                } catch(e) {
                    for (var i = 0; this.parentNode.attributes.length > i; i++) {
                        if (this.parentNode.attributes[i].nodeName = "data-id") {
                            project = this.parentNode.attributes[i].nodeValue;
                            break;
                        }
                    };
                }
                scope.$parent.viewProject(project);
            });
            
        };

        return {
            restrict: "E",
            link: linker,
            scope: {
                content:'='
            }
        };
});

app.directive('officeList', function() {
    
    // Just an abstratced piece of re-used code
    ////////////////////////////////////////////////

    var linker = function(scope, element, attrs) {

        scope.offices = [
            {
                'location': 'New York',
                'address'    : '392 Broadway, 2nd Floor',
                'region'  : 'New York, NY 10013',
                'phone'   : '+1 212 219 1606'
            },
            {
                'location': 'Rio de Janeiro',
                'address'    : 'R Benjamim Batista, 153',
                'region'  : 'Rio de Janeiro, RJ 22461-120',
                'phone'   : '+55 21 3627 7529'
            },
            {
                'location': 'Geneva',
                'address'    : '37 rue Eug&egrave;ne-Marziano',
                'region'  : 'CH-1227 Gen&egrave;ve',
                'phone'   : '+41 22 548 0480'
            }
        ];
    }

    return {
        restrict: "A",
        templateUrl: 'pieces/office_list.html',
        link: linker
    };
});

app.directive('socialButtons', function() {
    
    // Another abstratced piece of re-used code
    ////////////////////////////////////////////////

    var linker = function(scope, element, attrs) {
        scope.socials = [
            {
                'name'  : 'facebook',
                'url'   : 'https://www.facebook.com/zago',
                'class' : 'fb_btn',
                'order' : 0
            },
            {
                'name'  : 'twitter',
                'url'   : 'https://twitter.com/zagonyc',
                'class' : 'tw_btn',
                'order' : 1
            },
            {
                'name'  : 'behance',
                'url'   : 'https://www.behance.net/Zagolovesyou',
                'class' : 'be_btn',
                'order' : 2
            },
            {
                'name'  : 'pinterest',
                'url'   : 'http://www.pinterest.com/zagolovesyou',
                'class' : 'pi_btn',
                'order' : 3
            }, 
            {
                'name'  : 'linkedin',
                'url'   : 'https://www.linkedin.com/company/zago',
                'class' : 'li_btn',
                'order' : 4
            },
            {
                'name'  : 'email',
                'url'   : 'mailto:info@zagollc.com',
                'class' : 'ma_btn',
                'order' : 5
            }  
        ];
    };

    return {
        restrict: "A",
        templateUrl: 'pieces/social_buttons.html',
        link: linker
    };
});

app.directive('homeSections', function() {
    
    // Dynamically grab and set the home section's
    // key words and highlight colors
    ////////////////////////////////////////////////
    
    var linker = function(scope, element, attrs) {
        // scope.banner_caption.first = 
        var words = scope.section.content.caption.trim().split(" ");
        var colors = ['blue', 'yellow', 'pink', 'green'];

        scope.caption = {
            'first' : words[0],
            'last' : words[1] + ' ' + words[2],
            'color' : colors[(scope.$index % 4)]
        }
    }

    return {
        restrict: "A",
        templateUrl: 'pieces/home_sections.html',
        link: linker
    };
});

app.directive('underZ', function() {

    // Add to any element where an "underlined Z" may be used
    
    var linker = function(scope, element, attrs) {
        element[0].innerHTML = scope.str.replaceAll(' Z ', ' <u class="z">Z</u> ');
    }

    return {
        restrict: "A",
        scope: { str: "@" },
        link: linker
    };
});

app.directive('projectNav', function(){

    var linker = function($scope, element, attrs){

    };

    return {
        restrict: 'A',
        templateUrl: '../pieces/project_nav.html',
        replace: true,
        link : linker
    }
});

app.directive('precisionImage', function($timeout, Functions){

    var linker = function($scope, element, attrs){
        // Add Custom Image Positioning classes
        if (attrs.precisionImage) {
            var classes = JSON.parse(attrs.precisionImage);
            for (var i = 0; classes.length > i; i++) {
                element[0].classList.add(classes[i]);
            };
        }

        var image = element[0];
        var wrapper = image.parentNode;

        function checkRatio(){
            if (attrs.aspectRatio / (wrapper.clientHeight / wrapper.clientWidth) > 1) {
                image.classList.add('stretch');
            } else { image.classList.remove('stretch'); }
        };

        var listener = window.addEventListener('resize', Functions.throttle(checkRatio, 100));

        $timeout(checkRatio);

        $scope.$on('$destroy', function(){
            window.removeEventListener('resize', Functions.throttle(checkRatio, 100));
        });

    };

    return {
        restrict: 'A',
        link : linker,
        scope: true
    }
});

app.directive('imageLoader', function(){

    var linker = function(scope, element, attrs){
        var loader = document.createElement('div');
        var wheel = document.createElement('div');
        loader.setAttribute('class', 'loaderBox');
        wheel.setAttribute('class', 'loader');
        loader.appendChild(wheel);
        element[0].appendChild(loader);
        element[0].classList.add('loaderWrapper');
    };

    return {
        restrict: 'A',
        link: linker
    }
});

app.directive('rotateImages', function($interval){
    var linker = function($scope, element, attrs){

        function getImages(){
            var elems = element[0].children;

            var images = [];
            // Get IMG Tags
            for (var r = 0; elems.length > r; r++) {
                if (elems[r].tagName == 'IMG') {
                    images.push(elems[r]);
            }   }

            return images;
        };


        function rotateImages(){
            var images = getImages();
            // @BUG This is acting funny, 95% working, but has some weird issues
            // If img is last in array, set NEXT to first image, else set to next image in array
            $scope.lastBanner = $scope.activeBanner;
            $scope.activeBanner = ($scope.activeBanner + 1) % images.length;
            console.log($scope.activeBanner);
        };

        var timer;
        var waitTiming = 4000; // how long each slide remains active
        $scope.setTimer = function(){
            $scope.activeBanner = 0;
            $scope.lastBanner;
            // Set rotation interval
            timer = $interval(rotateImages, waitTiming);
        };

        $scope.$watch(function(){ return element; }, function(){
            $scope.setTimer();
        });

        $scope.$on('$destroy', function() {
            // Clear old timers
            $interval.cancel(timer);
            $scope.timer = undefined;
        });

    };

    return {
        restrict: 'A',
        link: linker
    }


});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.controller('AppCtrl', function($scope, $rootScope, $timeout, Functions, Storage){

    // App-general Functions
    ////////////////////////////////////////////////////////////////////////////////////
    $scope.route = Functions.route;
    $scope.toggleMenu = Functions.toggleMenu;
    $scope.viewProject = Functions.viewProject;
    $scope.setPageTitle = Functions.setPageTitle;
    $scope.anchorTo = Functions.anchorTo;
    $scope.scrollTop = Functions.scrollTop;
    $scope.colors = ['#00ffff','#ffff00','#ff00ff','#00ff00'];

    // Show/Hide ScrollToTop button functionality
    window.addEventListener('scroll', Functions.throttle(Functions.showScroll, 200));

    // Splash Page configuration
    ////////////////////////////////////////////////////////////////////////////////////
    // (function splashPage() {
    //     // If first time visiting site via mobile, flash splashpage
    //     if (!Storage.splashed && (Modernizr.phone)) {
    //         $scope.showSplash = true;
    //         Functions.disableScroll(true);
    //     }
    // })();

    // // Button to hide splash page and show full site
    // $scope.hideSplash = function() {
    //     Storage.splashed = true;
    //     $scope.showSplash = false;
    //     Functions.disableScroll(false);
    // };

});

app.controller('HomeCtrl', function($scope, $rootScope, $timeout, $interval, Functions, Preloader, Storage){

    $rootScope.pageView = "homePage";
    $scope.setPageTitle();

    var posts = JSON.parse(Storage.site).home;
    $scope.hero = posts.banners[0];
    $scope.blurb = posts.blurb[0];
    $scope.sections = posts.sections;

    // Section Nav scrolling event listener & logic
    ////////////////////////////////////////////////////////////////////////////////////
    $rootScope.$on('$viewContentLoaded', function(){
        // if it IS the homepage
        if ($rootScope.pageView === "homePage") {
            try { // Workaround for $rootScope.$on checking on every view instead of just homePage
                $timeout(function(){ setDimensions(); });
                Functions.setListener(  window, 'resize', Functions.throttle(setDimensions, 10));
                Functions.setListener(window, 'scroll', Functions.throttle(pinMenu, 10)); }
            catch (error) { }
        }
    });

    var pieces; // Get & Set Dimensions and add menu scroll listener once Preloader finishes
    function setDimensions(){ pieces = getDimensions(); pinMenu(); };

    function getDimensions(){
        var dims = {
            'blurb' : document.getElementById('homeBlurb'),
            'nav' : document.getElementById('sectionNav'),
            'sections' : document.getElementById('homeSections').children,
            'links' : [],
            'navPos' : '',
            'endPos' : ''
        };
        
        dims.links = dims.nav.children[0].children;
        dims.navPos = dims.blurb.offsetTop + (dims.blurb.scrollHeight - dims.nav.scrollHeight);
        dims.endPos = dims.sections[dims.sections.length - 1].offsetTop + dims.sections[dims.sections.length-1].scrollHeight;

        return dims;
    };

    function pinMenu() {
        // get current Scroll position (fires every pixel)
        // timeout applies updated isActive variable
        $timeout(function(){
            var winPos = window.pageYOffset;
            var scrollPos = winPos + pieces.nav.scrollHeight + 10;
            // If scroll position is above highest point of nav, release nav
            if (winPos <= pieces.navPos) {
                pieces.nav.classList.remove('pinned');
                $scope.isActive = '';
            // if scroll position is below lowest section point, release active class
            } else if (winPos >= pieces.endPos) {
                pieces.nav.classList.add('pinned');
                $scope.isActive = '';
            // otherwise if scroll position is in section area, pin nav to top and activate actie class
            } else {
                pieces.nav.classList.add('pinned');
                // Check the x/y dimensions against scroll position (including nav height)
                for (var i = 0; pieces.sections.length > i; i++) {
                    // if scroll position is within current section, set active class
                    if (scrollPos > pieces.sections[i].offsetTop && scrollPos < (pieces.sections[i].offsetTop + pieces.sections[i].scrollHeight)) {
                        $scope.isActive = pieces.sections[i].id;
                        break;
                    }
                    // If this is the last iteration of loop (not in any sections) empty isActive class
                    else if (i == (pieces.sections.length - 1)) { $scope.isActive = ''; }
                };
            }
        });
    };

});

app.controller('ProjectsCtrl', function($scope, $rootScope, Storage, Preloader, Styling){

    $rootScope.pageView = "projectsOverviewPage";
    $scope.setPageTitle('Projects');

    var posts = JSON.parse(Storage.site).project;
    $scope.blurb = posts.blurb[0];
    $scope.projects = posts.projects;

    (function randomizeHoverColors(){
        colors = $scope.colors.shuffle();
        var styles = '';
        for (var i = 0; colors.length > i; i++) {
            styles = styles.concat('.projectWrapper .grid section:nth-of-type('+(i+1)+') .imgWrapper .overlay{background-color:'+colors[i]+'}');
        };
        Styling.clear();
        Styling.add(styles);
    })();

});

app.controller('ProjectDetailCtrl', function($scope, $rootScope, $stateParams, Storage, Preloader){

    $rootScope.pageView = "projectPage";

    var posts = JSON.parse(Storage.site).project;

    // Get CURRENT, NEXT & PERVIOUS project IDs based on SITE TREE position (Project Sub-Nav)
    ////////////////////////////////////////////////////////////////////////////////////
    $scope.project = null;
    for (var i = 0; posts.projects.length > i; i++) {
        if (posts.projects[i].id == $stateParams.project) {
            $scope.project = posts.projects[i];
            if (i == 0) { // If THIS project is the first one
                $scope.nextProject = posts.projects[(i+1)];
                $scope.prevProject = posts.projects[(posts.projects.length-1)];
            } else if (i == (posts.projects.length - 1)) { // If THIS project is the last one
                $scope.nextProject = posts.projects[(0)];
                $scope.prevProject = posts.projects[(i-1)];
            } else { // If THIS project is any of the interior ones
                $scope.nextProject = posts.projects[(i+1)];
                $scope.prevProject = posts.projects[(i-1)];
            }

            // if there are less than 3 projects in the site tree
            if (posts.projects.length < 3) {
                if (i == 0) {
                    $scope.nextProject = posts.projects[(1)];
                    $scope.prevProject = posts.projects[(0)]; }
                else {
                    $scope.nextProject = posts.projects[(0)];
                    $scope.prevProject = posts.projects[(1)]; }
            }

            break;
        }
    }

    // If project exists, extract image urls and preload images
    if ($scope.project) {

        $scope.setPageTitle($scope.project.title);

        var sections = $scope.project.content.image_sections;

        // Construct Image Object
        ///////////////////////////////////////////////////////
        $scope.imageSections = [];
        for (var o = 0; sections.length > o; o++) {
            var temp = {
                'label' : sections[o].label,
                'order' : sections[o].order,
                'images' : [{
                    'url' : sections[o].url,
                    'alt' : sections[o].alt,
                    'position' : sections[o].position,
                    'aspectRatio' : sections[o].aspectRatio
                }]
            };

            // If this Image and Next Image are part of a pair
            // Then Advance loop $index ahead by one and pair img urls together
            if (sections[o].half && sections[o+1].half) {
                o++;
                temp.images.push({
                    'url' : sections[o].url,
                    'alt' : sections[o].alt,
                    'position' : sections[o].position,
                    'aspectRatio' : sections[o].aspectRatio
                });
            }

            $scope.imageSections.push(temp);
        };


    ///////////////////////////////////////////////////////
    // Else redirect back to projects overview page if project doesn't exist
    } else { $scope.route('projects', true); }

});

app.controller('TeamCtrl', function($scope, $rootScope, Functions, Preloader, Storage){

    $rootScope.pageView = "teamPage";
    $scope.setPageTitle('The Team');

    var posts = JSON.parse(Storage.site).team;
    $scope.blurb = posts.blurb[0];
    $scope.members = posts.members.shuffle();

});

app.controller('LoveCtrl', function($scope, $rootScope){

    $rootScope.pageView = "lovePage";

});

app.controller('ErrorCtrl', function($scope, $rootScope, $state, Storage){

});

app.controller('LegacyCtrl', function($scope, $rootScope, $state, Functions, Storage){

    $scope.setPageTitle('Outdated Browser');

    // Set Notice Height to Window Height, monitor resize event
    function setBodyHeight(){
        document.getElementById('legacy-notice').style.minHeight = (((window.innerHeight || document.documentElement.clientHeight)-200) + 'px');
    }; setBodyHeight();

    window.addEventListener('resize', setBodyHeight);

    Functions.hideAppElements();

});