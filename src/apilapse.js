// @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt GNU-AGPL-3.0
// @copyright ©2015 Textalk AB

angular
  .module('apilapse', ['ui.sortable', 'angularModalService', 'schemaForm'])

  .factory('ConnectionFactory', ['$q', '$http', '$injector', function($q, $http, $injector) {
    var factory = {}

    var configurationsByName = {}
    var promisesByName       = {}

    /**
     * Register a named connection explicitly, from e.g. inlined connection-configuration.
     */
    factory.register = function(connectionName, conf) {
      configurationsByName[connectionName] = conf
    }

    factory.getConnection = function(connectionName) {
      if (connectionName in promisesByName) {return promisesByName[connectionName]}

      var deferred = $q.defer()
      promisesByName[connectionName] = deferred.promise

      if (connectionName in configurationsByName) {
        var conf       = configurationsByName[connectionName]
        var connector  = $injector.get(conf.connector)
        var connection = connector.getConnection(connectionName, conf)

        deferred.resolve(connection)
        return deferred.promise
      }

      $http.get(connectionName)
        .then(
          function(response) {
            var conf       = response.data
            var connector  = $injector.get(conf.connector)
            var connection = connector.getConnection(connectionName, conf)

            deferred.resolve(connection)
          },
          function(error) {
            console.log(error)
            deferred.reject(error)
          })

      return deferred.promise
    }

    return factory
  }])

  .config(function($locationProvider) {
    $locationProvider.html5Mode({enabled: true, requireBase:false}).hashPrefix('!')
  })

  .controller('BoardCtrl', function($scope, $http, $location, ConnectionFactory) {
    $scope.board = {}
    locationSearch = $location.search()
    console.log('Location board', locationSearch)
    $scope.selectedBoard = ('board' in locationSearch ? locationSearch.board : null)

    //$http.get('conf/boards.json')
    //  .success(function(data, status, headers, config) {
    //    $scope.boards = data
    //  })

    $http.get($scope.selectedBoard)
      .success(function(data, status, headers, config) {
        if ('connections' in data) {
          for (var connectionName in data.connections) {
            ConnectionFactory.register(connectionName, data.connections[connectionName])
          }
        }
        $scope.board = data
      })
      .error(function(data, status, headers, config) {
        console.log('No board?', data, status, headers, config)
      })
  })
  .directive('boardrow', function() {
    return {
      restrict:    'E',
      scope:       {
        board:  '=' // parent
      },
      templateUrl: 'view/boardrow.html?v=3',
      replace:     true,
      link: function(scope, element, attrs) {
        for (var i = 0; i < scope.board.rows.length; i++) {
          // Local board bind must override the inherited bind.
          scope.board.rows[i].bind = $.extend(
            true, {}, scope.board.bind, scope.board.rows[i].bind
          )
        }

        scope.$on('newSize', function(event) {
          var totalSize = 0
          for (var i = 0; i < scope.board.rows.length; i++) {
            if (scope.board.rows[i].size) {totalSize = totalSize + scope.board.rows[i].size}
          }
          scope.board.size = totalSize
        })
      }
    }
  })
  .directive('boardcolumns', function() {
    return {
      restrict: 'E',
      scope: {
        board:  '=' // parent
      },
      templateUrl: 'view/boardcolumns.html?v=5',
      replace:     true,
      link: function(scope, element, attrs) {
        for (var i = 0; i < scope.board.columns.length; i++) {
          if (!('bind' in scope.board.columns[i])) {scope.board.columns[i].bind = {}}
          // Local board bind must override the inherited bind.

          scope.board.columns[i].bind = $.extend(
            true, {}, scope.board.bind, scope.board.columns[i].bind
          )
        }

        scope.$on('newSize', function(event) {
          var totalSize = 0
          for (var i = 0; i < scope.board.columns.length; i++) {
            if (scope.board.columns[i].size) {totalSize = totalSize + scope.board.columns[i].size}
          }
          scope.board.size = totalSize
        })
      }
    }
  })
  .directive('board', function($compile) {
    return {
      restrict: 'E',
      scope: {
        board: '='
      },
      templateUrl: 'view/board.html?v=2',
      replace:     true,
      link: function(scope, element, attrs) {
        scope.board.size = 0

        scope.$watch('board', function (board) {
          var subboard = element.find('.subboard')

          if (angular.isArray(scope.board.rows)) {
            subboard.empty().append('<boardrow boards="board.rows" board="board" />')
          }
          else if (angular.isArray(scope.board.columns)) {
            subboard.empty().append('<boardcolumns board="board" />')
          }
          else {
            subboard.empty().append('<issues board="board" />')
          }

          // Re-compile after appending directive elements.
          $compile(element.contents())(scope)
        })
      }
    }
  })

  .directive('issues', ['$rootScope', 'ConnectionFactory', function($rootScope, ConnectionFactory) {
    return {
      restrict:    'E',
      templateUrl: 'view/issues.html?v=1',
      replace:     true,
      scope:       {
        board: '='
      },
      link: function(scope, element, attrs) {
        console.log('Linked issues')
        scope.board.issues = []
        scope.issues = scope.board.issues

        scope.calculateSize = function() {
          var totalSize = 0
          for (var i = 0; i < scope.board.issues.length; i++) {
            if (scope.board.issues[i].data.size) {
              totalSize = totalSize + scope.board.issues[i].data.size
            }
          }
          scope.board.size = totalSize
          scope.$emit('newSize')
        }

        scope.dragControlListeners = {
          accept: function (sourceItemHandleScope, destSortableScope, destItemScope) {return true},
          itemMoved: function (event) {
            // TODO: Show saving indicator
            var issue = event.source.itemScope.modelValue

            console.log('Event', event)
            if (issue.source.connection in event.dest.sortableScope.$parent.board.bind) {
              console.log('Can move issue easily to new bind in same connection.')

              issue.move(event.dest.sortableScope.$parent.board.bind[issue.source.connection])
                .then(
                  function(result) {
                    scope.calculateSize()
                    event.dest.sortableScope.calculateSize()

                    // TODO: Re-prioritize
                  },
                  function(error) {
                    console.log('Error on move:', error)
                  }
                )
              console.log('Move triggered.')
            }
            else {
              console.log('Can NOT move issue easily to new bind in same connection!')
            }
          },
          orderChanged: function(event) {
            var lastPrio = 0
            if (scope.board.issues.length > event.dest.index + 1) {
              lastPrio = scope.board.issues[event.dest.index + 1].data.prio
            }

            // Loop from the moved item and to the top, ensuring that each issue has a higher
            // priority than the one below.
            for (var i = event.dest.index; i >= 0; i--) {
              // If the issue above has a higher prio than the one below, just place this one in
              // between and be done with it!
              var newPrio;

              if (i > 0 && scope.board.issues[i-1].data.prio > lastPrio) {
                scope.board.issues[i].setPrio(
                  lastPrio + (scope.board.issues[i-1].data.prio - lastPrio) / 2
                ).catch(function(error) {
                  console.log('Something went wrong in prioritizing.  Should change back?')
                })
                break
              }

              scope.board.issues[i].setPrio(++lastPrio)
            }
          }
        };

        scope.reload = function() {
          scope.error = ''
          if (typeof scope.board.bind === 'object') {
            scope.issues = []

            for (connectionName in scope.board.bind) {
              ConnectionFactory.getConnection(connectionName)
                .then(function(connection) {
                  return connection.getIssues(scope.board.bind[connectionName])
                })
                .then(
                  function(issues) {
                    issues.forEach(function(issue) {scope.board.issues.push(issue)})
                    scope.calculateSize()
                  },
                  function(error) {
                    console.log('Error!', error)
                    scope.error = ('error' in scope ? scope.error + '\n' : '') + error
                  }
                )
            }
          }
        }
        scope.reload()
      }
    }
  }])

// @license-end
