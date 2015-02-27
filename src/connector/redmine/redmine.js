function RedmineIssue(connection, bind, data, $http, $q) {
  this.connection = connection
  this.$http      = $http
  this.$q         = $q

  this.source = {
    connection: connectionName,
    connector:  'redmine',
    img:        'src/connector/redmine/redmine.svg',
    bound:      bind,
    original:   data,
    id:         data.id
  }

  this.data = {
    title: data.subject,
    url:   connection.conf.baseUrl + 'issues/' + data.id,
    prio:  0
  }

  if ('estimated_hours' in data) this.data.size = data.estimated_hours

  if ('assigned_to' in data) {
    this.data.assignee = data.assigned_to.name
    this.data.assigneeInitials
      = this.data.assignee.split(' ')
      .map(function (s) { return s.charAt(0) + s.charAt(1) }).join(' ')
  }

  // Find the version_prio (textalk specific custom field)
  if ('prioField' in connection.conf) {
    for (var i = 0; i < data.custom_fields.length; i++) {
      if (data.custom_fields[i].id === connection.conf.prioField) {
        this.data.prio = parseFloat(data.custom_fields[i].value)
      }
    }
  }
}

RedmineIssue.prototype.setPrio = function(newPrio) {
  if (!('prioField' in this.connection.conf)) {
    var deferred = this.$q.defer()
    deferred.reject(
      'Can\'t change priority with no prioField bound in redmine connection.'
    )
    return deferred.promise
  }

  this.data.prio = newPrio

  var prioValue = {}
  prioValue[this.connection.conf.prioField] = newPrio

  return this.$http.put(
    this.connection.conf.baseUrl + 'issues/' + this.source.id + '.json?key=' +
      this.connection.creds.key,
    {issue: {custom_field_values: prioValue}}
  )
}

RedmineIssue.prototype.move = function(newBind) {
  var put = {notes: 'Update from apilaps'}

  if ('project' in newBind
      && newBind.project !== this.source.original.project.id) {
    put.project_id = newBind.project
  }
  if ('status' in newBind
      && newBind.status !== this.source.original.status.id) {
    put.status_id = newBind.status
  }
  if ('tracker' in newBind
      && newBind.tracker !== this.source.original.tracker.id) {
    put.tracker_id = newBind.tracker
  }
  if ('version' in newBind
      && (
        !('fixed_version_id' in this.source.original)
          || newBind.version !== this.source.original.fixed_version.id
      )) {
    put.fixed_version_id = newBind.version
  }
  if ('fixed_version_id' in this.source.original && !('version' in newBind)) {
    put.fixed_version_id = 0
  }

  return this.$http.put(
    'http://redmine.textalk.com/issues/' + this.source.id + '.json?key=' +
      this.connection.creds.key,
    {issue:  put}
  )
}


angular
  .module('apilapse')

  .factory('redmine', ['$http', '$q', 'ConnectionCredentials', function($http, $q, credentials) {
    var redmine = {}

    redmine.getConnection = function(connectionName, conf) {
      var connection = {
        clearCredentials: false,
        conf:             conf
      }

      if (!('baseUrl' in conf)) {throw 'Can\'t access redmine without baseUrl.'}

      var schema = {
        type: 'object',
        properties: {key: {type: 'string'}}
      }
      var form = [
        {
          title: 'Redmine API-key',
          key:   'key',
          description: 'Found in the right column of <a href="' + conf.baseUrl +
            'my/account">Your account</a> in Redmine'
        }
      ]

      connection.getIssues = function(bind) {
        var deferred = $q.defer()

        credentials
          .get(conf.baseUrl, schema, form, connection.clearCredentials)
          .then(function(creds) {
            console.log('Loading from redmine as of:', bind)

            connection.creds = creds

            var params = {}
            projectUrl = ''

            if ('project' in bind) {projectUrl = 'projects/' + bind.project + '/'}
            if ('status'  in bind) {params.status_id  = bind.status}
            if ('tracker' in bind) {params.tracker_id = bind.tracker}
            if ('version' in bind) {params.fixed_version_id = bind.version}
            if (!('includeSubprojects' in bind) || !bind.includeSubprojects) {
              params.subproject_id = "!*"
            }

            params.key = creds.key
            params.limit = 50

            params.sort = 'cf_36:desc' // TODO: Make sort code configurable

            return $http.get(conf.baseUrl + projectUrl + 'issues.json', {params: params})
          })
          .then(function(response) {
            var issues = []
            console.log('From redmine:', response)

            response.data.issues.forEach(function(issueData) {
              // If bind version is null, filter out anything with a version.
              if ('version' in bind && bind.version === null && 'fixed_version' in issueData) {
                console.log('Version is null.  This issue should have no version.', issueData)
                return
              }

              issues.push(new RedmineIssue(connection, bind, issueData, $http, $q))
            })

            deferred.resolve(issues)
          })

        return deferred.promise
      }

      return connection
    }

    return redmine
  }])
