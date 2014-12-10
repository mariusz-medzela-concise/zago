angular.module('app').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('index.html',
    "<!DOCTYPE html><html lang=en ng-app=app><head><meta name=viewport content=\"width=device-width,height=device-height,initial-scale=1,maximum-scale=1,user-scalable=no\"><base href=\"/\"><link rel=icon type=image/png href=images/favicon.ico><link rel=stylesheet href=\"css/style.css\"><script src=js/enhance.js></script><script src=js/polyfills.js></script><script src=js/modernizr.js></script><script src=js/mobile-detect.min.js></script><script src=js/mobile-detect-modernizr.js></script><script src=js/modernizr-script.js></script><script src=js/overthrow.min.js></script><script src=js/jquery-1.8.3.min.js></script><script src=js/angular.min.js></script><script src=js/angular-ui-router.min.js></script><script src=js/angular-sanitize.min.js></script><script src=js/angular-scroll.min.js></script><script src=js/main.js></script><script src=js/templates.js></script></head><body id=body ng-controller=AppCtrl><div id=container ng-class=\"{pageLoading:isLoading || isRouting}\"><img id=siteID class=siteID alt=\"Zago LLC Logo\" src=images/zago_logo.png ng-click=\"route('home', true)\"><nav id=mainNav class=overthrow><div id=menuWrapper><div id=menu><ul><li><a ng-click=\"route('home')\" title=Home>Zago</a></li><li><a ng-click=\"route('projects')\" title=\"Zago Projects\">Projects</a></li><li><a ng-click=\"route('team')\" title=\"Meet Z Team\">Team</a></li><li><a ng-click=\"route('love')\" title=\"Blog Love\">Love</a></li></ul></div><div class=menuContacts office-list></div></div></nav><div class=buttonWrapper><p id=menuPrompt>Click for<br>Menu</p><button id=menuButton type=button ng-click=toggleMenu()></button></div><button id=scrollTop type=button ng-click=scrollTop()></button><div id=pageContent class={{pageView}} ng-class=\"{pageLoading: isLoading}\" ui-view autoscroll=true></div><footer id=footer ng-class=\"{pageLoading: isLoading}\"><div office-list></div><section class=intern><p>We take interns in NYC for 3 to 6 month engagements.<br>Inquire at</p><a href=mailto:intern@zagollc.com>intern@zagollc.com</a></section><section class=social social-buttons></section></footer><div id=splash class=overthrow ng-if=showSplash><img class=siteID alt=\"Zago LLC Logo\" src=images/zago_logo.png><h1>Zago</h1><div class=\"menuContacts splashpage\" office-list></div><button type=button ng-click=hideSplash()>Full Site</button></div><div id=cssTest><p class=cssvwunit>No vw units</p><p class=mobilegradea>No mobile grade a</p><p class=overthrow-enabled>No overthrow-enabled</p><p class=cssvhunit>No vh units</p><p class=localstorage>No localStorage</p></div></div><div id=loader><div class=beaconWrapper><div class=beacon></div></div></div><script src=http://localhost:35729/livereload.js></script><!--[if lt IE 9]><script type=\"text/javascript\" src=\"js/unsupported.js\"></script><![endif]--></body></html>"
  );


  $templateCache.put('pieces/home_sections.html',
    "<div class=bannerWrapper><div class=imgWrapper><img ng-src={{section.content.image_url}}></div><div class=captionWrapper><p><span class=color ng-class=caption.color>{{caption.first}}</span></p><p>{{caption.last}}</p></div></div><div class=sectionWrapper><div class=\"padder left\"><h1>{{section.title}}</h1></div><div class=padder><div class=sectionText ng-bind-html=section.body></div></div></div>"
  );


  $templateCache.put('pieces/office_list.html',
    "<section ng-repeat=\"office in offices\"><h2 ng-bind-html=office.location></h2><p ng-bind-html=office.address></p><p ng-bind-html=office.region></p><p><a href=tel:{{office.phone}} ng-bind-html=\"'P: '+office.phone\"></a></p></section><section class=info><p>Say ciao. Email us at</p><a href=mailto:info@zagollc.com>info@zagollc.com</a></section>"
  );


  $templateCache.put('pieces/social_buttons.html',
    "<ul class=socialButtons><li ng-class=social.class ng-repeat=\"social in socials | orderBy: 'order'\"><a href={{social.url}} title=\"zago {{social.name}} account\" target=_blank></a></li></ul><p>&copy;2014 Zago, LLC.</p>"
  );


  $templateCache.put('partials/error.html',
    "<h1>Error Page</h1><h2>{{errorPageMessage}}</h2>"
  );


  $templateCache.put('partials/home.html',
    "<div id=heroBanner><img ng-repeat=\"image in hero.content.images | orderBy:'order'\" ng-src={{image.url}} ng-class=\"{showing: activeBanner == $index, last: lastBanner == $index}\"><h1>Zago</h1><p ng-bind-html=hero.content.banner_caption></p></div><div id=homeBlurb><div ng-bind-html=blurb.body></div><nav id=sectionNav><ul><li ng-repeat=\"section in sections | orderBy:'order'\" ng-click=anchorTo(section.content.image_caption.firstWord()) ng-class=\"{active: isActive == section.content.image_caption.firstWord()}\">{{section.content.image_caption.firstWord()}}</li></ul></nav></div><div id=homeSections><section id={{section.content.image_caption.firstWord()}} ng-repeat=\"section in sections | orderBy:'order'\" home-sections></section></div>"
  );


  $templateCache.put('partials/legacy.html',
    "<div id=legacy-notice><h1>Sorry, looks like you're on an older browser.</h1><p>Bad design exists everywhere, and internet stuff is no exception. Unfortunately, some internet browsers of days past just can't handle what we got goin' on over here (true story).</p><p>If you are using Internet Explorer 8 or less, or are otherwise seeing this page instead of us, please try switching to a newer browser.</p></div>"
  );


  $templateCache.put('partials/loading.html',
    "<div id=loader><h1>Loading</h1></div>"
  );


  $templateCache.put('partials/love.html',
    "<embed src=\"http://zagolovesyou.tumblr.com/\" frameborder=0>"
  );


  $templateCache.put('partials/project.html',
    "<nav id=projectNav><ul><li ng-click=viewProject(nextProject.id)><div class=navTitle><h5>{{nextProject.content.client}}</h5></div></li><li ng-click=viewProject(prevProject.id)><div class=navTitle><h5>{{prevProject.content.client}}</h5></div></li></ul></nav><div id=projectDetailsWrapper></div>"
  );


  $templateCache.put('partials/projects.html',
    "<div class=blurb><h1 under-z str={{blurb.title}}></h1><div ng-bind-html=blurb.body></div></div><grid></grid>"
  );


  $templateCache.put('partials/team.html',
    "<div class=blurb><h1 under-z str={{blurb.title}}></h1><div ng-bind-html=blurb.body></div></div><grid></grid>"
  );

}]);
