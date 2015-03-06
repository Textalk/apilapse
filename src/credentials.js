/**
 * Apilapse - a generic issue tracking frontend
 * Copyright (C) 2015 Textalk AB
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt
 *          GNU-AGPL-3.0
 */
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

// @license-end
