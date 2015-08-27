(function () {
	angular
		.module('app')
		.controller('NavbarController', NavbarController);

	/**
	 * The NavbarController code.
	 */
 	NavbarController.$inject = ['$log', '$http'];
	function NavbarController($log, $http) {
		var vm = this;
		
		// Properties
		vm.isCollapsed = true;
		
		/////////////////////////////////////////
		// End of exposed properties and methods.
		
		/**
		 * This function does any initialization work the 
		 * controller needs.
		 */
		(function activate() {
			$log.debug('Activated NavbarController.');
		})();
	};
})();
