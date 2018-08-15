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
function RedmineIssue(connection, bind, data, $http, $q) {
  self = this

  this.connection = connection
  this.$http      = $http
  this.$q         = $q

  data.customFields = {}
  if ('custom_fields' in data) {
    for (var i = 0; i < data.custom_fields.length; i++) {
      data.customFields[data.custom_fields[i].id] = data.custom_fields[i].value
    }
  }

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

  this.cssClasses = [
    'redmine',
    'tracker_' + this.source.original.tracker.id,
    'project_' + this.source.original.project.id
  ]

  /// @todo Move this to a general helper and break out aggregation functions.
  if ('aggregate' in connection.conf) {
    angular.forEach(connection.conf.aggregate, function(aggregation, key) {
      var fieldData = null

      if ('customField' in aggregation) {
        if (data.customFields[aggregation.customField]) {
          fieldData = data.customFields[aggregation.customField]
        }
      }
      else {
        throw new Error('Unknown field type in ' + JSON.stringify(aggregation))
      }

      if (!('function' in aggregation)) {
        throw new Error('No function in ' + JSON.stringify(aggregation))
      }

      if (fieldData && aggregation.function === 'countInCommaSeparatedList') {
        self.data[key] = fieldData.split(',').length
      }
    })
  }

  if ('estimated_hours' in data) this.data.size = data.estimated_hours

  if ('assigned_to' in data) {
    this.data.assignee = data.assigned_to.name
    this.data.assigneeInitials
      = this.data.assignee.split(' ')
      .map(function (s) { return s.charAt(0) + s.charAt(1) }).join(' ')
  }

  // Find the prioField, if one is configured.
  if ('prioField' in connection.conf) {
    if (data.customFields[connection.conf.prioField]) {
      this.data.prio = parseFloat(data.customFields[connection.conf.prioField])
    }
  }

  // Make a pie diagram of % done.
  /// @todo Move this to more generic issue handling from data.doneRatio
  if (data.done_ratio > 0 && data.done_ratio < 100) {
    this.data.doneRatio = data.done_ratio
    this.donePie = document.createElement('div')

    var radius = 1
    var color = d3.scale.ordinal().range(['lightgreen', 'purple'])

    data = [data.done_ratio, 100 - data.done_ratio]

    var vis = d3.select(this.donePie)
        .append('svg:svg')
        .data([data])
        .append('svg:g')

    var arc = d3.svg.arc()  // create <path> elements for arc data
        .outerRadius(radius)

    var pie = d3.layout.pie()
        .sort(null)

    var arcs = vis.selectAll('g.slice')
        .data(pie)
        .enter()
        .append('svg:g')

    arcs.append('svg:path')
      .attr('fill', function(d, i) {return color(i)})
      .attr('d', arc)
  }
}

/**
 * Fetch subissues so they are available on this.subissues
 *
 * Before fetching, 'subissues' need not exist on this.  After fetching, it might be an empty
 * array.
 *
 * @return A promise of the subissues (that will also be on the issue)
 */
RedmineIssue.prototype.fetchSubissues = function() {
  var params   = {}
  var issue    = this

  params.key = this.connection.creds.key
  params.include = 'children'

  return this.$http
    .get(this.connection.conf.baseUrl + 'issues/' + this.source.id + '.json', {params: params})
    .then(function(response) {
      issue.subissues = []

      if ('children' in response.data.issue) {
        response.data.issue.children.forEach(function(subissueData) {
          issue.connection
            .getIssue(subissueData.id)
            .then(function(subissue) {
              issue.subissues.push(subissue)
            })
        })
      }

      return issue.subissues
    })
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
    this.connection.conf.baseUrl + 'issues/' + this.source.id + '.json?key=' +
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

      connection.getIssue = function(id) {
        var params = {}
        params.key = connection.creds.key
        return $http
          .get(conf.baseUrl + '/issues/' + id + '.json', {params: params})
          .then(function(response) {
            return new RedmineIssue(connection, null, response.data.issue, $http, $q)
          })
      }

      connection.getIssuesInPages = function(bind, offset, limit, issues) {
        var maxLimit = 200
        if (offset > maxLimit) {throw 'Offset over ' + maxLimit}

        var params = {}
        projectUrl = ''

        if ('project' in bind) {projectUrl = 'projects/' + bind.project + '/'}
        if ('status'  in bind) {params.status_id  = bind.status}
        if ('tracker' in bind) {params.tracker_id = bind.tracker}
        if ('version' in bind) {params.fixed_version_id = bind.version}
        if ('sprintField' in connection.conf && 'sprint' in bind) {
        	params["cf_" + connection.conf.sprintField] = bind.sprint
    	}
        if (!('includeSubprojects' in bind) || !bind.includeSubprojects) {
          params.subproject_id = "!*"
        }

        params.key    = connection.creds.key
        params.offset = offset
        params.limit  = limit

        if ('prioField' in connection.conf) {
          params.sort  = 'cf_' + connection.conf.prioField + ':desc'
        }

        console.log("Redmine params:", params, bind)

        return $http
          .get(conf.baseUrl + projectUrl + 'issues.json', {params: params})
          .then(function(response) {
            console.log('From redmine:', response)

            response.data.issues.forEach(function(issueData) {
              if ('limit' in bind && issues.length >= bind.limit) return

              // If bind version is null, filter out anything with a version.
              if ('version' in bind && bind.version === null && 'fixed_version' in issueData) {
                //console.log('Version is null.  This issue should have no version.', issueData)
                return
              }
              
              if ('parent' in bind) {
            	  switch (bind.parent) {
            	  	  case '!*':
            	  		  if ('parent' in issueData) {
            	  			  return;
            	  		  }
            	  		  break;
            	  	  case '*':
            	  		  if (!('parent' in issueData)) {
            	  			  return;
            	  		  }
            	  		  break;
        	  		  default:
        	  			  if (issueData.parent.id !== bind.parent) {
        	  				  return;
        	  			  }
            	  }
              }

              var issue = new RedmineIssue(connection, bind, issueData, $http, $q)
              if ('subissues' in bind) {issue.fetchSubissues()}

              issues.push(issue)
            })

            if (response.data.total_count > offset + limit &&
                (!('limit' in bind) || issues.length < bind.limit)) {
              return connection.getIssuesInPages(bind, offset + limit, limit, issues)
            }
            else {
              return issues
            }
          })
      }

      connection.getIssues = function(bind) {

        return credentials
          .get(conf.baseUrl, schema, form, connection.clearCredentials)
          .then(function(creds) {
            console.log('Loading from redmine as of:', bind)

            connection.creds = creds
            var issues = []
            return connection.getIssuesInPages(bind, 0, 50, issues)
          })
          .catch(function(error) {
            console.log('ERROR!', error)
            if (error.status === 401) {
              // Unauthorized - try again with new credentials
              connection.clearCredentials = connection.creds
              connection.getIssues(bind)
            }
            else {
              throw error
            }
          })
      }

      return connection
    }

    return redmine
  }])

// @license-end
