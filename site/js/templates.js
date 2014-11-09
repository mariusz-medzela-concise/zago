angular.module('app').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('index.html',
    "<!DOCTYPE html><html lang=en ng-app=app><head><meta name=viewport content=\"width=device-width,height=device-height,initial-scale=1\"><link rel=icon type=image/png href=images/favicon.ico><link rel=stylesheet href=\"css/style.css\"><script src=js/jquery-1.8.3.min.js></script><script src=js/modernizr.js></script><script src=js/mobile-detect.min.js></script><script src=js/mobile-detect-modernizr.js></script><script src=js/modernizr-script.js></script><script src=js/angular.min.js></script><script src=js/angular-ui-router.min.js></script><script src=js/angular-sanitize.min.js></script><script src=js/main.js></script><script src=js/templates.js></script><script src=js/overthrow.min.js></script></head><body ng-controller=AppCtrl><div id=container ng-show=\"!isLoading && pageReady\"><img id=siteID src=images/zago_logo.png ng-click=\"route('home', true)\"><nav id=mainNav ng-controller=HeaderCtrl><div id=menuWrapper class=overthrow><div id=menu><ul><li><a ng-click=\"route('home')\">Zago</a></li><li><a ng-click=\"route('projects')\">Projects</a></li><li><a ng-click=\"route('team')\">Team</a></li><li><a ng-click=\"route('love')\">Love</a></li></ul></div><div id=menuContacts office-list></div></div></nav><div class=buttonWrapper><p id=menuPrompt>Click for<br>Menu</p><button id=menuButton type=button ng-click=toggleMenu()></button></div><button id=scrollTop type=button ng-click=scrollTop()></button><div id=pageContent class={{pageView}} ui-view autoscroll=true></div><footer id=footerContacts><div office-list></div><section class=intern><p>We take interns in NYC for 3 to 6 month engagements.<br>Inquire at</p><a href=mailto:intern@zagollc.com>intern@zagollc.com</a></section><section class=social social-buttons></section></footer></div><script src=http://localhost:35729/livereload.js></script></body></html>"
  );


  $templateCache.put('pieces/office_list.html',
    "<section ng-repeat=\"office in offices\"><h2 ng-bind-html=office.location></h2><p ng-bind-html=office.address></p><p ng-bind-html=office.region></p><p ng-bind-html=\"'P: '+office.phone\"></p></section><section class=info><p>Say ciao. Email us at</p><a href=mailto:info@zagollc.com>info@zagollc.com</a></section>"
  );


  $templateCache.put('pieces/social_buttons.html',
    "<ul class=socialButtons><li class=fb_btn><a href=https://www.facebook.com/zago target=_blank></a></li><li class=tw_btn><a href=https://twitter.com/zagonyc target=_blank></a></li><li class=be_btn><a href=https://www.behance.net/Zagolovesyou target=_blank></a></li><li class=pi_btn><a href=\"http://www.pinterest.com/zagolovesyou/\" target=_blank></a></li><li class=li_btn><a href=https://www.linkedin.com/company/zago target=_blank></a></li><li class=ma_btn><a href=mailto:info@zagollc.com target=_blank></a></li></ul><p>&copy;2014 Zago, LLC.</p>"
  );


  $templateCache.put('partials/error.html',
    "<h1>Error Page</h1><h2>{{errorPageMessage}}</h2>"
  );


  $templateCache.put('partials/home.html',
    "<div id=heroBanner ng-style=\"{'background-image':'url('+hero.content.image_url+')'}\"><img ng-src={{hero.content.image_url}}><h1>Zago</h1><p ng-bind-html=hero.content.image_caption></p></div><div id=homeBlurb><div ng-bind-html=blurb.body></div><ul><li ng-repeat=\"word in blurb.content.power_words\">{{word}}</li></ul></div><div id=homeSections><div class=section ng-repeat=\"section in sections | orderBy:'order'\"><div class=bannerWrapper><img ng-src={{section.content.image_url}}><p ng-bind-html=section.content.image_caption></p></div><div class=sectionWrapper><h1>{{section.title}}</h1><div class=sectionText ng-bind-html=section.body></div></div></div></div>"
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
    "<div class=blurb><h1>{{blurb.title}}</h1><div ng-bind-html=blurb.body></div></div><grid></grid>"
  );


  $templateCache.put('partials/team.html',
    "<div class=blurb><h1>{{blurb.title}}</h1><div ng-bind-html=blurb.body></div></div><grid></grid>"
  );

}]);
