angular.module('app.settings', ['app.services.stubs'])


.config(['$stateProvider',
		function ($stateProvider) {
			$stateProvider
				.state('tab.settings', {
    					url: '/settings',
    					views: {
      						'tab-settings': {
        							templateUrl: 'app/settings/settings.html'
      							}
    						}
  				})
		}
	]);






