Apilapse
========

Issue tracking kanban-like angularjs based frontend for API-backends like redmine, github etc

The goal is to get a loosely bound postit-like board view of issues from one or more backends.


Install
-------

1. Clone this repo somewhere you can point your broswer with http(s).  (Browsers don't allow
ajax-requests to your file-system, so you need http.)

2. Make your own board configs in conf-dir.

3. Point your browser to index.html



Configuration
-------------


### Connections

Connections can be defined directly in the board.json and referred to by key, here `asf-github`:
```
{
  "connections": [
    "asf-github": {
      "connector": "github",
      "owner":     "Textalk",
      "repo":      "angular-schema-form"
    }
  ],
  …
}
```

…or in it's own json-file, referred to by it's URL (relative index.html or absolute).


### Board list

Configured in `conf/boards.json`.



### Board


Connectors
----------

### Redmine

Example of a redmine connector:
```
{
  "connector": "redmine",
  "baseUrl":   "http://redmine.textalk.com/",
  "prioField": 36
}
```

prioField is the ID of a custom field of type float that is used to save priority within a board.
If you have several boards displaying the same issue in different bindings, the priority will be
messed up…


### Github


License
-------

Apilapse is under the GNU Affero General Public License.  See LICENSE.
