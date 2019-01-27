(function() {
	angular.module('starter')
        .controller('LoginCtrl', [ '$scope', '$state', '$cordovaFacebook', loginCtrl ]);

	function loginCtrl($scope, $state, $cordovaFacebook) {
		console.log("Login Ctrl login");
        
    function onHomeLogoClicked(event, signin, signup) {
			$state.go("tab.dash");
		}

  $scope.data = {};

  $scope.signupEmail = function(){  

    var ref = new Firebase("http://everesports-hosting-mobilehub-1806028962.s3-website.us-east-2.amazonaws.com");

    ref.createUser({
      email    : $scope.data.email,
      password : $scope.data.password
    }, function(error, userData) {
      if (error) {
        console.log("Error creating user:", error);
      } else {
        console.log("Successfully created user account with uid:", userData.uid);
        $state.go("tab.dash");
      }
    });

  };

  $scope.loginEmail = function(){

    var ref = new Firebase("http://everesports-hosting-mobilehub-1806028962.s3-website.us-east-2.amazonaws.com");

    ref.authWithPassword({
      email    : $scope.data.email,
      password : $scope.data.password
    }, function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        console.log("Authenticated successfully with payload:", authData);
      }
    });

  };

  $scope.loginFacebook = function(){
   
    var ref = new Firebase("http://everesports-hosting-mobilehub-1806028962.s3-website.us-east-2.amazonaws.com");


    if(ionic.Platform.isWebView()){

      $cordovaFacebook.login(["public_profile", "email"]).then(function(success){
     
        console.log(success);

        ref.authWithOAuthToken("facebook", success.authResponse.accessToken, function(error, authData) {
          if (error) {
            console.log('Firebase login failed!', error);
          } else {
            console.log('Authenticated successfully with payload:', authData);
          }
        });
     
      }, function(error){
        console.log(error);
      });        

    }
    else {

      ref.authWithOAuthPopup("facebook", function(error, authData) {
        if (error) {
          console.log("Login Failed!", error);
        } else {
          console.log("Authenticated successfully with payload:", authData);
        }
      });

    }

  };
};


}());
