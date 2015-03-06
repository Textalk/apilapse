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

  .factory('github', ['ConnectionCredentials', '$q', function(credentials, $q) {
    var github = {}

    var schema = {
      type: 'object',
      properties: {token: {type: 'string'}}
    }
    var form = [
      {
        title: 'Personal Access Tokens',
        key:   'token',
        description: 'Use a "Personal access token" from <a href="https://github.com/' +
          'settings/applications#personal-access-tokens">github application settings</a>'
      }
    ]

    github.getConnection = function(connectionName, conf) {
      var connection = {clearCredentials: false}

      if (!('owner' in conf)) {throw 'Won\'t load github without owner.'}
      if (!('repo'  in conf)) {throw 'Won\'t load github without repo.'}

      connection.getApi = function() {
        var deferred = $q.defer()

        credentials
          .get(connectionName, schema, form, connection.clearCredentials)
          .then(function (creds) {
            connection.clearCredentials = false

            var githubApi = new Github({
              token: creds.token,
              auth:  'oauth'
            });
            console.log(githubApi, creds)
            deferred.resolve(githubApi)
          })

        return deferred.promise
      }

      // getIssues will add to the issues array asynchroneously
      connection.getIssues = function(bind) {
        var deferred = $q.defer()

        console.log('Lodding from github as of:', bind)

        connection.getApi().then(function(githubApi) {
          var issuesApi = githubApi.getIssues(conf.owner, conf.repo)
          var filter = {}

          if ('labels' in bind) {filter.labels = bind.labels}

          issuesApi.list(filter, function(err, githubIssues) {
            console.log('From github:', err, githubIssues)

            if (err && err.error === 403) {
              console.log('Bad credentials or rate limited.', err)
              connection.clearCredentials = true
              return connection.getIssues(bind)
            }

            var issues = []

            githubIssues.forEach(function(issue) {
              issues.push({
                source: {
                  connection: connectionName,
                  connector:  'github',
                  img:        'src/connector/github/github.svg',
                  bound:      bind,
                  original:   issue,
                  id:         issue.id
                },
                data: {
                  title: issue.title,
                  url:   issue.html_url
                }
              })
            })
            console.log('Github issues added.')

            deferred.resolve(issues)
          })
        })

        return deferred.promise
      }

      return connection
    }

    return github
  }])

// @license-end
