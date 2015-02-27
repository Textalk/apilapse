angular
  .module('apilapse')

  .factory('ConnectionCredentials', ['$q', 'ModalService', function($q, ModalService) {
    var credentials = {}

    credentials.promises = {}

    credentials.get = function(connectionName, schema, form, clear) {
      var key = 'ConnectionCredentials.' + connectionName

      // We only want one promise per connection.
      if (!clear && key in credentials.promises) {return credentials.promises[key]}

      var deferred = $q.defer()
      credentials.promises[key] = deferred.promise

      if (!clear && key in localStorage) {
        deferred.resolve(JSON.parse(localStorage[key]))
        return deferred.promise
      }

      // Just provide a template url, a controller and call 'showModal'.
      ModalService.showModal({
        templateUrl: 'view/credentials.html?v=1',
        controller:  'ConnectionCredentialsCtrl'
      }).then(function(modal) {
        modal.scope.schema = schema
        modal.scope.form   = form
        modal.scope.model  = {}
        modal.scope.connectionName = connectionName

        modal.element.modal({show: true})
        modal.close.then(function(result) {
          localStorage[key] = JSON.stringify(result)
          deferred.resolve(result)
        });
      });

      return deferred.promise
    }

    return credentials
  }])

  .controller('ConnectionCredentialsCtrl', function($scope, close) {
    $scope.onSubmit = function() {
      close($scope.model, 200) // close, but give 200ms for bootstrap to animate
    }
  })
