(function() {
  angular
    .module('app', [
      'ngRoute',
      'ui.bootstrap',
      'angular-loading-bar',
      'nvd3',
      'ladda',
      'ngStorage'
    ])
    .config(config); 
  
  function config($routeProvider, $locationProvider, cfpLoadingBarProvider) {
    // Configure the routes. 
  	$routeProvider
  		.when('/', {
  			templateUrl: 'views/main.html',
  			controller: 'MainController',
  			controllerAs: 'main'
  		}) 
      .when('/about', {
  			templateUrl: 'views/about.html'
  		}) 
  		.otherwise({ 
        redirectTo: '/' 
      });
  
  	// Make the URLs pretty.
  	$locationProvider.html5Mode(true); 
    
    // Remove spinner from loading bar.
    cfpLoadingBarProvider.includeSpinner = false;
  };
})();

