// Give Modernizr.load a string, an object, or an array of strings and objects
Modernizr.load([
  {
    test: Modernizr.mobile || Modernizr.phone || Modernizr.tablet,
    yep: ['css/touchscreens.css']

  }

  // Presentational polyfills
  // {
  //   // Logical list of things we would normally need
  //   test : Modernizr.cssvwunit && !Modernizr.cssvhunit,
  //   // Modernizr.load loads css and javascript by default
  //   nope : ['js/polyfills/parser.js', 'js/polyfills/tokenizer.js', 'js/polyfills/vminpoly.js']
  // }
  // Functional polyfills
  // {
  //   // This just has to be truthy
  //   test : Modernizr.websockets && window.JSON,
  //   // socket-io.js and json2.js
  //   nope : 'functional-polyfills.js',
  //   // You can also give arrays of resources to load.
  //   both : [ 'app.js', 'extra.js' ],
  //   complete : function () {
  //     // Run this after everything in this group has downloaded
  //     // and executed, as well everything in all previous groups
  //     myApp.init();
  //   }
  // },
  // Run your analytics after you've already kicked off all the rest
  // of your app.
  // 'post-analytics.js'
]);