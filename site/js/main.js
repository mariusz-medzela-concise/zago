$(document).ready(function(){
    $('#menuButton button').on('tap', function(){
       $(this).click();
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var app = angular.module('app', ['ui.router', 'ngSanitize']);

app.config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider , $urlRouterProvider) {

        $urlRouterProvider.otherwise('/home');

        $stateProvider
        .state('home', { 
            url: '/home',
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
        });
}]);

app.run(function($rootScope, $state, Storage) {

    $rootScope.$on('$stateChangeStart', function(event, to, toParams, from, fromParams){

        // If the Site Data is missing, stop navigation and retreive data
        // Cache timer for Storage (24hrs: 86400000 1hr: 3600000 1min: 60000)
        var newTimestamp = new Date().getTime();
        // Set Time of User Entry (default to 24hr reset)
        Storage.entryTimestamp = (Storage.entryTimestamp && Storage.entryTimestamp > (newTimestamp - 86400000)) ? Storage.entryTimestamp : newTimestamp;
        // If the Storage Site object is empty or older than X, reload Wordpress data tree (default to 1hr reset)
        if (!Storage.site || !Storage.siteTimestamp || (Storage.siteTimestamp < newTimestamp - 3600000)) {
            event.preventDefault();
            $rootScope.pageReady = false;

            $rootScope.getRawData().then(function(data){
                // Assign Data Tree in appropriate variables and formats
                var site = data.data;
                $rootScope.site = $rootScope.getPosts(site);
                Storage.site = JSON.stringify($rootScope.site);
                Storage.siteTimestamp = newTimestamp;

                // Continue to Destination
                $state.go(to.name, toParams);
            });
        }
        
    });

    $rootScope.$on( "$stateChangeSuccess", function(event, to, toParams, from, fromParams) {
        
        if ($rootScope.functionQue) { $rootScope.functionQue(); }
        
        $rootScope.functionQue = null;
        $rootScope.previousState = from.name;
        $rootScope.thisState = to.name;
        $rootScope.pageReady = true;
        $rootScope.toggleMenu(true);

        // Add/Remove page class to footer element
        document.getElementsByTagName('footer')[0].className = '';
        if (to.name == 'home') { document.getElementsByTagName('footer')[0].classList.add('homePage'); }
        if (to.name == 'love') { document.getElementsByTagName('footer')[0].classList.add('lovePage'); }
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Factories / Services / Directives
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Declare sessionStorage
app.factory('Storage', function(){
    var db = window.localStorage;
    return db;
});

// javaScript created styles
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

// I provide a utility class for preloading image objects.
app.factory("Preloader", function( $q, $rootScope, Storage ) {

    var checkPrompt = function(){
        if (!Storage.prompted) {
            document.getElementById('menuPrompt').classList.add('bounce');
        }
    };

    Preloader.preload = function( images ) {
        if (images.length) {
            console.info('Preloader Running');
            // I keep track of the state of the loading images.
            $rootScope.isLoading = true;
            $rootScope.isSuccessful = false;
            $rootScope.percentLoaded = 0;

            // I am the image SRC values to preload and display./

            // Preload the images; then, update display when returned.
            this.preloadImages( images ).then(
                function handleResolve( imageLocations ) {

                    // Loading was successful.
                    $rootScope.isLoading = false;
                    $rootScope.isSuccessful = true;

                    console.info( "Preload Successful" );

                    checkPrompt();
                },
                function handleReject( imageLocation ) {

                    // Loading failed on at least one image.
                    $rootScope.isLoading = false;
                    $rootScope.isSuccessful = false;

                    console.error( "Image Failed", imageLocation );
                    console.info( "Preload Failure" );

                },
                function handleNotify( event ) {

                    $rootScope.percentLoaded = event.percent;

                    // console.info( "Percent loaded:", event.percent );

                }
            );
        } else {
            console.info('No images to preload..');
            checkPrompt();
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

app.directive('grid', function($compile) {

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

            // Create Section element
            var sec = document.createElement('section');
            sec.setAttribute('data-id', data.id);
            // Create wrapper element for img & overlay
            var imgWrap = document.createElement('div');
            imgWrap.setAttribute('class', 'imgWrapper');
            // Create Img Element
            var img = document.createElement('img');
            img.setAttribute('ng-src', data.content.featured_image);
            imgWrap.appendChild(img);
            // Create Overlay
            var ovrly = document.createElement('div');
            ovrly.setAttribute('class', 'overlay');
            // Create Title Elements
            var h2 = document.createElement('h2');
            h2.innerHTML = data.title;
            var h3 = document.createElement('h3');
            var h3Text;
            switch(view) {
                case 'projects':
                    h3Text = data.content.client;
                    imgWrap.appendChild(ovrly);
                    break;
                case 'team':
                    h3Text =  data.content.position;
                    if (data.content.linkedin_url) {
                        var anchorWrap = document.createElement('div');
                        anchorWrap.setAttribute('class', 'anchorWrapper');
                        var anchor = document.createElement('a');
                        anchor.setAttribute('href', data.content.linkedin_url);
                        anchor.setAttribute('target', '_blank');
                        anchorWrap.appendChild(anchor);
                        imgWrap.appendChild(anchorWrap);
                    }
                    break;
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
        $('.projectWrapper .grid section > *').hover(
            function(){
                $(this.parentNode).children('.imgWrapper').children('.overlay').addClass('open');
            },
            function(){
                $(this.parentNode).children('.imgWrapper').children('.overlay').removeClass('open');
            }
        ).click(function(){
            var project = this.parentNode.dataset.id;
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
        // scope: {
        //     content:'='
        // }
    };
});

app.directive('socialButtons', function() {
    return {
        restrict: "A",
        templateUrl: 'pieces/social_buttons.html'
    };
});

Array.prototype.getUnique = function(){
   var u = {}, a = [];
   for(var i = 0, l = this.length; i < l; ++i){
      if(u.hasOwnProperty(this[i])) {
         continue;
      }
      a.push(this[i]);
      u[this[i]] = 1;
   }
   return a;
}

Array.prototype.shuffle = function() {
    for (var i = this.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = this[i];
        this[i] = this[j];
        this[j] = temp;
    }
    return this;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.controller('AppCtrl', function($scope, $location, $anchorScroll, $rootScope, $q, $http, $state, Storage, $stateParams){

    // App Wide Functions
    ////////////////////////////////////////////////////////////////////////////////////

    $scope.route = function(route, turnMenuOff, params) {

        var turnOff = turnMenuOff ? turnMenuOff : false;
        var menuOpen = $('#mainNav').hasClass('menu-open');

        $scope.toggleMenu(turnOff);
        // pause for menu animation if routing while menu was open
        if (menuOpen) {
            setTimeout(function(){
                $state.go(route, params);
            }, 500);
        } else {
            $state.go(route, params);
        }

    };

    $scope.viewProject = function(id){
        $scope.route('project', true, {'project':id});
    };

    $rootScope.toggleMenu = function(turnOff){

        var content = document.getElementById('pageContent');
        var prompt = document.getElementById('menuPrompt');

        function close(){
            $('#mainNav').removeClass('menu-open');
            $('button#menuButton').removeClass('active-menu');
            $('body').removeClass('hidden');
            content.classList.remove('menu-open');
            content.removeEventListener('click', close, true); // (bug) Doesn't remove until content area is actually clicked
            document.body.removeEventListener('touchmove', prevent, true);
            document.height = 'auto';
        };

        function open(){
            $('#mainNav').addClass('menu-open');
            $('button#menuButton').addClass('active-menu');
            $('body').addClass('hidden');
            content.classList.add('menu-open');
            content.addEventListener('click', close, true);
            document.body.addEventListener('touchmove', prevent, true);
            document.height = window.innerHeight;

            // If first time user opens menu, hide menuPrompt
            if (!Storage.prompted) {
                Storage.prompted = true;
                hidePrompt();
            };
        };

        var turnOff = turnOff ? turnOff : false;

        if ($('#mainNav').hasClass('menu-open') || turnOff) { close(); }
        else { open(); }
    };

    // General function to time-throttle high-frequency functionality
    $rootScope.throttle = function(fn, threshhold, scope) {
        threshhold || (threshhold = 250);
        var last,
        deferTimer;
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
    }

    // ScrollToTop click functionality
    $scope.scrollTop = function() {
        $("html, body").animate({ scrollTop: 0 }, 200);
    };

    // Show/Hide ScrollToTop button functionality
    var scrollTopBtn = document.getElementById('scrollTop');
    var showScroll = function() {
        if (window.pageYOffset > 200) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }
    }; window.onscroll =  $rootScope.throttle(showScroll, 200);

    // Situational & Helper Functions
    ////////////////////////////////////////////////////////////////////////////////////

    // Named function to preventDefault event actions
    var prevent = function(e){ 
        e.preventDefault();
    };

    var sorter = function(a,b) {
        if ( a.order < b.order )
            return -1;
        if ( a.order > b.order )
            return 1;
        return 0;
    }

    // Function to hide menuPrompt
    var hidePrompt = function(){
        var prompt = document.getElementById('menuPrompt');
        prompt.classList.add('hiding');
        setTimeout(function(){
            prompt.classList.add('hidden');
        }, 500);
    }
    // hide menuPrompt if user has already opened menu
    if (Storage.prompted) {
        hidePrompt();
    }

    $rootScope.colors = ['#00ffff','#ffff00','#ff00ff','#00ff00'];

    // Loading Functions
    ////////////////////////////////////////////////////////////////////////////////////

    $rootScope.getRawData = function(){

        var reqUrl = 'http://admin.zagollc.com/wp-json/posts?filter[posts_per_page]=1000';
        var deferred = $q.defer();
        deferred.resolve($http.get(reqUrl));
        return deferred.promise;
    };

    $rootScope.getPosts = function(rawData){

        // Get image attachments from WP object
        // function getAttachmentByID(aid, loc) {
        //     for (var i = 0; i < loc.length; ++i) {
        //         if (loc[i].id == aid) {
        //             return loc[i].url;
        // }   }   }

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
            return arr;
        };

        // Custom Function to unserialize PHP array
        function unserialize(data) {
            //  discuss at: http://phpjs.org/functions/unserialize/
            //  original by: Arpad Ray (mailto:arpad@php.net)
            //  note: We feel the main purpose of this function should be to ease the transport of data between php & js
            //  note: Aiming for PHP-compatibility, we have to translate objects to arrays

            var that = this,
            utf8Overhead = function(chr) {
            // http://phpjs.org/functions/unserialize:571#comment_95906
            var code = chr.charCodeAt(0);
            if (code < 0x0080) {
                return 0;
            }
            if (code < 0x0800) {
                return 1;
            }
            return 2;
            };
            error = function(type, msg, filename, line) {
                throw new that.window[type](msg, filename, line);
            };
            read_until = function(data, offset, stopchr) {
                var i = 2,
                buf = [],
                chr = data.slice(offset, offset + 1);

                while (chr != stopchr) {
                    if ((i + offset) > data.length) {
                        error('Error', 'Invalid');
                    }
                    buf.push(chr);
                    chr = data.slice(offset + (i - 1), offset + i);
                    i += 1;
                }
                return [buf.length, buf.join('')];
            };
            read_chrs = function(data, offset, length) {
                var i, chr, buf;

                buf = [];
                for (i = 0; i < length; i++) {
                    chr = data.slice(offset + (i - 1), offset + i);
                    buf.push(chr);
                    length -= utf8Overhead(chr);
                }
                return [buf.length, buf.join('')];
            };
            _unserialize = function(data, offset) {
                var dtype, dataoffset, keyandchrs, keys, contig,
                length, array, readdata, readData, ccount,
                stringlength, i, key, kprops, kchrs, vprops,
                vchrs, value, chrs = 0,
                typeconvert = function(x) {
                    return x;
                };

                if (!offset) {
                    offset = 0;
                }
                dtype = (data.slice(offset, offset + 1))
                .toLowerCase();

                dataoffset = offset + 2;

                switch (dtype) {
                    case 'i':
                    typeconvert = function(x) {
                        return parseInt(x, 10);
                    };
                    readData = read_until(data, dataoffset, ';');
                    chrs = readData[0];
                    readdata = readData[1];
                    dataoffset += chrs + 1;
                    break;
                    case 'b':
                    typeconvert = function(x) {
                        return parseInt(x, 10) !== 0;
                    };
                    readData = read_until(data, dataoffset, ';');
                    chrs = readData[0];
                    readdata = readData[1];
                    dataoffset += chrs + 1;
                    break;
                    case 'd':
                    typeconvert = function(x) {
                        return parseFloat(x);
                    };
                    readData = read_until(data, dataoffset, ';');
                    chrs = readData[0];
                    readdata = readData[1];
                    dataoffset += chrs + 1;
                    break;
                    case 'n':
                    readdata = null;
                    break;
                    case 's':
                    ccount = read_until(data, dataoffset, ':');
                    chrs = ccount[0];
                    stringlength = ccount[1];
                    dataoffset += chrs + 2;

                    readData = read_chrs(data, dataoffset + 1, parseInt(stringlength, 10));
                    chrs = readData[0];
                    readdata = readData[1];
                    dataoffset += chrs + 2;
                    if (chrs != parseInt(stringlength, 10) && chrs != readdata.length) {
                        error('SyntaxError', 'String length mismatch');
                    }
                    break;
                    case 'a':
                    readdata = {};

                    keyandchrs = read_until(data, dataoffset, ':');
                    chrs = keyandchrs[0];
                    keys = keyandchrs[1];
                    dataoffset += chrs + 2;

                    length = parseInt(keys, 10);
                    contig = true;

                    for (i = 0; i < length; i++) {
                        kprops = _unserialize(data, dataoffset);
                        kchrs = kprops[1];
                        key = kprops[2];
                        dataoffset += kchrs;

                        vprops = _unserialize(data, dataoffset);
                        vchrs = vprops[1];
                        value = vprops[2];
                        dataoffset += vchrs;

                        if (key !== i)
                            contig = false;

                        readdata[key] = value;
                    }

                    if (contig) {
                        array = new Array(length);
                        for (i = 0; i < length; i++)
                            array[i] = readdata[i];
                        readdata = array;
                    }

                    dataoffset += 1;
                    break;
                    default:
                    error('SyntaxError', 'Unknown / Unhandled data type(s): ' + dtype);
                    break;
                }
                return [dtype, dataoffset - offset, typeconvert(readdata)];
            };

            return _unserialize((data + ''), 0)[2];
        }

        // Structure Site Posts object 
        function postTree(Site){
            var tree = {
                'home' : {
                    'blurb' : [],
                    'banners' : [],
                    'sections': [],
                    'images': []
                },
                'project': {
                    'blurb' : [],
                    'projects': [],
                    'images': []
                },
                'team' : {
                    'blurb': [],
                    'members': [],
                    'images': []
                }
            };

            // Categorize Posts into Site object
            for (var i = 0; i < Site.length; ++i) {
                // Assign Current Post to variable
                var post = Site[i];

                // Check if Post has been given 2 Categories (bad)
                if (post.terms.category.length == 1 && post.status == 'publish') {

                    // General temp Post Object
                    var temp = {
                        'id' : post.ID,
                        'title' : ternValue(post.title),
                        'order' : ternValue(post.acf.arrangement),
                        'body' : ternValue(post.content),
                        'content' : { }
                    };
                    
                    var images = [];

                    // Populate temp Post Object according to Post Type
                    //////////////////////////////////////////////////////////////////////////////
                    if (post.terms.category[0].slug == 'home-hero-banner') {
                        
                        temp.content = {
                            'image_id' : ternValue(post.acf.banner_image.id),
                            'image_url': ternValue(post.acf.banner_image.url),
                            'image_caption' : ternValue(post.acf.banner_caption)
                        };

                        tree.home.images.push(temp.content.image_url);
                        tree.home.banners.push(temp);
                        continue;
                    }

                    if (post.terms.category[0].slug == 'home-section') {
                        temp.content = {
                            'image_id' : ternValue(post.acf.banner_image.id),
                            'image_url': ternValue(post.acf.banner_image.url),
                            'image_caption' : ternValue(post.acf.banner_caption),
                            'keywords' : post.acf.keywords ? splitCSV(post.acf.keywords) : null
                        };

                        tree.home.images.push(temp.content.image_url);
                        tree.home.sections.push(temp);
                        continue;
                    }

                    if (post.terms.category[0].slug == 'home-blurb') {
                        temp.content = {
                            'power_words' : post.acf.power_words ? splitCSV(post.acf.power_words) : null
                        };

                        tree.home.blurb.push(temp);
                        continue;
                    }

                    if (post.terms.category[0].slug == 'projects-blurb') {
                        temp.content = {

                        };

                        tree.project.blurb.push(temp);
                        continue;
                    }

                    if (post.terms.category[0].slug == 'project') {

                        temp.content = {
                            'case_study' : post.acf.case_study,
                            'client' : ternValue(post.acf.client),
                            'services' : ternValue(post.acf.services),
                            'project' : ternValue(post.acf.project),
                            'project_url' : ternValue(post.acf.project_url),
                            'featured_image' : (post.acf.featured_image && post.acf.featured_image.url) ? post.acf.featured_image.url : (post.acf.images[0].image.url || null),
                            'images' : [],
                            'related_projects' : {}

                        };

                        // Get project images from featured image
                        if (post.acf.featured_image && post.acf.featured_image.url) { temp.content.images.push(post.acf.featured_image.url); }
                        // Get project images outside of repeater array
                        if (post.acf.images && post.acf.images.length) {
                            for (var d = 0; post.acf.images.length > d; d++) {
                                temp.content.images.push(post.acf.images[d].image.url);
                            };
                            // Strip out duplicate urls
                            temp.content.images = temp.content.images.getUnique();
                        }

                        // Strip duplicate image urls from the preloader array
                        tree.project.images.push(temp.content.featured_image);
                        tree.project.images = tree.project.images.getUnique();

                        tree.project.projects.push(temp);

                        // Sort projects object via arrangement parameter
                        tree.project.projects.sort(sorter);

                        continue;
                    }

                    if (post.terms.category[0].slug == 'team-blurb') {
                        temp.content = {
                        };

                        tree.team.blurb.push(temp);
                        continue;
                    }

                    if (post.terms.category[0].slug == 'team-member') {
                        temp.content = {
                            'position' : ternValue(post.acf.position),
                            'linkedin_url' : ternValue(post.acf.linkedin_url),
                            'featured_image' : (post.acf.profile_picture && post.acf.profile_picture.url) ? post.acf.profile_picture.url : null
                        };

                        tree.team.images.push(temp.content.featured_image);
                        tree.team.members.push(temp);
                        continue;
                    }
                }
            }

            return tree;
        };

        return postTree(rawData);

    };

});

app.controller('ErrorCtrl', function($scope, $rootScope, $state, Storage){

});

app.controller('HeaderCtrl', function($scope, $rootScope, $state, Storage){

});

app.controller('HomeCtrl', function($scope, $rootScope, $state, Storage, Preloader){

    $scope.pageView = "homePage";

    var posts = JSON.parse(Storage.site).home;

    $scope.hero = posts.banners[0];
    $scope.blurb = posts.blurb[0];
    $scope.sections = posts.sections;
    Preloader.preload(posts.images, Preloader, $rootScope);
});

app.controller('ProjectsCtrl', function($scope, $rootScope, $state, Storage, Preloader, Styling){

    $scope.pageView = "projectsOverviewPage";

    var posts = JSON.parse(Storage.site).project;

    $scope.blurb = posts.blurb[0];
    $scope.projects = posts.projects;

    Preloader.preload(posts.images, Preloader, $rootScope);

    (function randomizeHoverColors(){
        colors = $rootScope.colors.shuffle();
        var styles = '';
        for (var i = 0; colors.length > i; i++) {
            styles = styles.concat('.projectWrapper .grid section:nth-of-type('+(i+1)+') .imgWrapper .overlay{background-color:'+colors[i]+'}');
        };
        Styling.add(styles);
    })();

});

app.controller('ProjectDetailCtrl', function($scope, $rootScope, $state, $stateParams, Storage, Preloader){

    $scope.pageView = "projectPage";

    var posts = JSON.parse(Storage.site).project;

    // Get CURRENT, NEXT & PERVIOUS project IDs based on SITE TREE position
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
    }   }

    // Redirect back to projects overview page if project or site tree doesn't exist, else preload images
    if (!$scope.project) { $scope.route('projects', true); }
    else { Preloader.preload($scope.project.content.images, Preloader, $rootScope); }

});

app.controller('TeamCtrl', function($scope, $rootScope, $state, $stateParams, Preloader, Storage){

    $scope.pageView = "teamPage";

    var posts = JSON.parse(Storage.site).team;
    $scope.blurb = posts.blurb[0];
    $scope.members = posts.members.shuffle();
    Preloader.preload(posts.images, Preloader, $rootScope);

});

app.controller('LoveCtrl', function($scope, $rootScope, $state, $stateParams, Preloader, Storage){

    $scope.pageView = "lovePage";

});








